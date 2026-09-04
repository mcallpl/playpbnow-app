import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, TextInput } from 'react-native';

/**
 * useSmartScoring V4 — COLLAB-AWARE
 *
 * handleScoreChange returns ScoreChangeResult with the FINAL
 * state of BOTH scores after all auto-fill logic. This lets
 * the collab sync send correct values.
 *
 * changed=false means "user is still typing, don't sync yet"
 */

export interface ScoreChangeResult {
    roundIdx: number;
    gameIdx: number;
    s1: string;
    s2: string;
    changed: boolean;
}

/**
 * UAT 2026-09-04 (#17): the on-device cache used to be keyed by group name
 * alone, so a PREVIOUS match for the same group could be restored on top of
 * freshly pulled live scores (and then self-healed to the server as phantom
 * scores). When the match has a share code the cache is scoped to it; without
 * one the legacy key is kept exactly as it was, so nothing existing breaks.
 */
export const scoresCacheKey = (groupName: string, cacheScope?: string | null): string =>
    cacheScope ? `scores_${groupName}__${cacheScope}` : `scores_${groupName}`;

export const useSmartScoring = (
    groupName: string,
    schedule: any[],
    onAllScoresComplete?: () => void,
    cacheScope?: string | null
) => {
    const [scores, setScoresRaw] = useState<{ [key: string]: string }>({});
    const [winningScore, setWinningScore] = useState(11);

    const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
    const flatListRef = useRef<FlatList>(null);
    const finishButtonRef = useRef<any>(null);

    // Synchronous ref — always has the latest scores, even between renders.
    // This prevents poll-delivered scores from being wiped by stale closures.
    const scoresRef = useRef<{ [key: string]: string }>({});

    // #17 — the cache must never replace state once the server has been pulled.
    const serverPulledRef = useRef(false);
    const markServerPulled = useCallback(() => { serverPulledRef.current = true; }, []);

    const storageKey = scoresCacheKey(groupName, cacheScope);
    const storageKeyRef = useRef(storageKey);
    useEffect(() => { storageKeyRef.current = storageKey; }, [storageKey]);

    // Wrapper that keeps ref + state in sync.
    //
    // MUST be a STABLE callback. As a plain function it got a new identity on
    // every render, which flowed into useCollaborativeScoring's pollForUpdates
    // deps and from there into the polling effect — so every render tore the
    // poll timer down and restarted it with a full delay. While anything
    // re-rendered faster than POLL_INTERVAL (a toast, the connected count, a
    // collaborator's update, the user typing) the poll could be starved
    // indefinitely while the LIVE banner still said "connected".
    // (UAT 2026-09-04 — found live.)
    const setScores = useCallback((newScores: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => {
        if (typeof newScores === 'function') {
            setScoresRaw(prev => {
                const result = newScores(prev);
                scoresRef.current = result;
                return result;
            });
        } else {
            scoresRef.current = newScores;
            setScoresRaw(newScores);
        }
    }, []);

    // Persist scores & WTS
    // #17: the restore must never land ON TOP of a server pull. groupName is not
    // stable at mount and the key is not match-specific for legacy matches, so
    // an unconditional full replace could drop a PREVIOUS match's scores over
    // freshly pulled live ones — which self-heal then pushed to the server.
    useEffect(() => {
        if (!groupName) return;
        let cancelled = false;
        const load = async () => {
            try {
                if (serverPulledRef.current) return; // server already won
                const saved = await AsyncStorage.getItem(storageKey);
                if (cancelled || serverPulledRef.current) return; // pull landed while we waited
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        const current = scoresRef.current || {};
                        const localNonEmpty: { [key: string]: string } = {};
                        for (const [k, v] of Object.entries(current)) {
                            if (v && v !== '') localNonEmpty[k] = v as string;
                        }
                        // Cold start (nothing typed yet) keeps the original full
                        // restore; otherwise anything already on screen wins.
                        const next = Object.keys(localNonEmpty).length === 0
                            ? parsed
                            : { ...parsed, ...localNonEmpty };
                        scoresRef.current = next;
                        setScoresRaw(next);
                    }
                }
                const savedWts = await AsyncStorage.getItem(`wts_${groupName}`);
                if (!cancelled && savedWts) setWinningScore(parseInt(savedWts));
            } catch (e) {}
        };
        load();
        return () => { cancelled = true; };
    }, [groupName, storageKey]);

    // #17: when the cache key becomes match-scoped (a share code arrives after
    // the host started scoring), carry what is on screen into the new key so
    // nothing is stranded under the old one.
    const prevStorageKeyRef = useRef(storageKey);
    useEffect(() => {
        if (prevStorageKeyRef.current === storageKey) return;
        prevStorageKeyRef.current = storageKey;
        AsyncStorage.setItem(storageKey, JSON.stringify(scoresRef.current || {})).catch(() => {});
    }, [storageKey]);

    // Initial focus
    useEffect(() => {
        const timer = setTimeout(() => {
            inputRefs.current['0_0_t1']?.focus();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const scrollToRound = (rIdx: number) => {
        try {
            flatListRef.current?.scrollToIndex({ index: rIdx, animated: true, viewPosition: 0 });
        } catch (e) {}
    };

    const jumpToNextEmpty = (
        currentR: number, currentG: number, currentTeam: 't1' | 't2',
        currentState: { [key: string]: string }
    ) => {
        const otherTeam = currentTeam === 't1' ? 't2' : 't1';
        const otherKey  = `${currentR}_${currentG}_${otherTeam}`;

        if (!currentState[otherKey] || currentState[otherKey] === '') {
            setTimeout(() => inputRefs.current[otherKey]?.focus(), 50);
            return;
        }

        for (let r = currentR; r < schedule.length; r++) {
            const roundGames = schedule[r]?.games || [];
            const startG = r === currentR ? currentG + 1 : 0;
            for (let g = startG; g < roundGames.length; g++) {
                const k1 = `${r}_${g}_t1`;
                const k2 = `${r}_${g}_t2`;
                if (!currentState[k1] || currentState[k1] === '') {
                    setTimeout(() => { inputRefs.current[k1]?.focus(); if (r !== currentR) scrollToRound(r); }, 50);
                    return;
                }
                if (!currentState[k2] || currentState[k2] === '') {
                    setTimeout(() => { inputRefs.current[k2]?.focus(); if (r !== currentR) scrollToRound(r); }, 50);
                    return;
                }
            }
        }
        
        if (onAllScoresComplete) setTimeout(() => { Keyboard.dismiss(); onAllScoresComplete(); }, 100);
    };

    // CORE RULES ENGINE — returns ScoreChangeResult
    const handleScoreChange = (rIdx: number, gIdx: number, team: 't1' | 't2', rawValue: string): ScoreChangeResult | null => {
        // UAT C-M10: a score is digits only. The numeric keyboard still offers
        // "-" and "." (and web accepts anything), and save_scores cast whatever
        // was stored to 0 — so "-5" or "a" silently became a 0-point game.
        const value = (rawValue ?? '').replace(/[^0-9]/g, '');
        if (value.length > 2) return null;

        const currentKey = `${rIdx}_${gIdx}_${team}`;
        const otherTeam  = team === 't1' ? 't2' : 't1';
        const otherKey   = `${rIdx}_${gIdx}_${otherTeam}`;
        const t1Key = `${rIdx}_${gIdx}_t1`;
        const t2Key = `${rIdx}_${gIdx}_t2`;

        let newState = { ...scoresRef.current, [currentKey]: value };
        const numVal = parseInt(value);

        setScores(newState);
        AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(newState));

        // Helper to build result
        const result = (state: typeof newState, changed: boolean): ScoreChangeResult => ({
            roundIdx: rIdx, gameIdx: gIdx,
            s1: state[t1Key] || '', s2: state[t2Key] || '',
            changed
        });

        if (value === '' || isNaN(numVal)) return result(newState, true);

        const wts = winningScore;
        const wtsStr = wts.toString();

        // ── SINGLE DIGIT ──
        if (value.length === 1) {
            // First digit matches WTS first digit → WAIT
            if (value === wtsStr[0]) return result(newState, false);

            // 0 to WTS-2 → auto-fill WTS in opponent
            if (numVal <= wts - 2) {
                if (!newState[otherKey] || newState[otherKey] === '') {
                    newState = { ...newState, [otherKey]: wtsStr };
                    setScores(newState);
                    AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(newState));
                }
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }

            // WTS-1 as single digit (e.g. PLAY TO 5, entered 4) → deuce: auto-fill WTS+1
            if (numVal === wts - 1 && wts <= 9) {
                if (!newState[otherKey] || newState[otherKey] === '') {
                    newState = { ...newState, [otherKey]: (wts + 1).toString() };
                    setScores(newState);
                    AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(newState));
                }
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }

            // > WTS → jump
            if (numVal > wts) {
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }

            // WTS-1: wait for second digit (WTS >= 10)
            return result(newState, false);
        }

        // ── TWO DIGITS ──
        if (value.length === 2) {
            // WTS or higher → allow and jump
            if (numVal >= wts) {
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }

            // WTS-1 → deuce: auto-fill WTS+1 in opponent
            if (numVal === wts - 1) {
                if (!newState[otherKey] || newState[otherKey] === '') {
                    newState = { ...newState, [otherKey]: (wts + 1).toString() };
                    setScores(newState);
                    AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(newState));
                }
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }

            // 0 to WTS-2 → auto-fill WTS in opponent
            if (numVal <= wts - 2) {
                if (!newState[otherKey] || newState[otherKey] === '') {
                    newState = { ...newState, [otherKey]: wtsStr };
                    setScores(newState);
                    AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(newState));
                }
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }

            // Both filled → jump
            if (newState[otherKey] && newState[otherKey] !== '') {
                jumpToNextEmpty(rIdx, gIdx, team, newState);
            }

            return result(newState, true);
        }

        return null;
    };

    const updateWTS = (val: string) => {
        const num = parseInt((val ?? '').replace(/[^0-9]/g, ''));
        if (!isNaN(num) && num > 0 && num <= 99) {
            setWinningScore(num);
            AsyncStorage.setItem(`wts_${groupName}`, val);
        }
    };

    const clearScores = async () => {
        setScores({});
        // #17: clear BOTH the match-scoped key and the legacy group key, so a
        // cleared match can never be resurrected from the other one.
        await AsyncStorage.removeItem(storageKeyRef.current);
        if (storageKeyRef.current !== `scores_${groupName}`) {
            await AsyncStorage.removeItem(`scores_${groupName}`);
        }
        setTimeout(() => inputRefs.current['0_0_t1']?.focus(), 100);
    };

    return {
        scores, setScores, scoresRef,
        winningScore, setWinningScore: updateWTS,
        clearScores, inputRefs, flatListRef, finishButtonRef,
        handleScoreChange,
        // #17 — the screen calls this once the server's scores have been
        // adopted; after that the AsyncStorage cache can never replace them.
        markServerPulled,
        scoresStorageKey: storageKey,
    };
};
