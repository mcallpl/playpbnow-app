import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
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

export const useSmartScoring = (groupName: string, schedule: any[], onAllScoresComplete?: () => void) => {
    const [scores, setScores] = useState<{ [key: string]: string }>({});
    const [winningScore, setWinningScore] = useState(11);

    const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
    const flatListRef = useRef<FlatList>(null);
    const finishButtonRef = useRef<any>(null);

    // Persist scores & WTS
    useEffect(() => {
        if (!groupName) return;
        const load = async () => {
            try {
                const saved = await AsyncStorage.getItem(`scores_${groupName}`);
                if (saved) setScores(JSON.parse(saved));
                const savedWts = await AsyncStorage.getItem(`wts_${groupName}`);
                if (savedWts) setWinningScore(parseInt(savedWts));
            } catch (e) {}
        };
        load();
    }, [groupName]);

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
    const handleScoreChange = (rIdx: number, gIdx: number, team: 't1' | 't2', value: string): ScoreChangeResult | null => {
        if (value.length > 2) return null;

        const currentKey = `${rIdx}_${gIdx}_${team}`;
        const otherTeam  = team === 't1' ? 't2' : 't1';
        const otherKey   = `${rIdx}_${gIdx}_${otherTeam}`;
        const t1Key = `${rIdx}_${gIdx}_t1`;
        const t2Key = `${rIdx}_${gIdx}_t2`;

        let newState = { ...scores, [currentKey]: value };
        const numVal = parseInt(value);

        setScores(newState);
        AsyncStorage.setItem(`scores_${groupName}`, JSON.stringify(newState));

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
                    AsyncStorage.setItem(`scores_${groupName}`, JSON.stringify(newState));
                }
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }

            // > WTS → jump
            if (numVal > wts) {
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }
            
            // WTS-1: wait for second digit
            return result(newState, false);
        }

        // ── TWO DIGITS ──
        if (value.length === 2) {
            // Too high → strip
            if (numVal > wts + 2) {
                const stripped = value.substring(0, 1);
                const strippedState = { ...newState, [currentKey]: stripped };
                setScores(strippedState);
                AsyncStorage.setItem(`scores_${groupName}`, JSON.stringify(strippedState));
                return result(strippedState, false);
            }

            // WTS or overtime → jump
            if (numVal >= wts) {
                jumpToNextEmpty(rIdx, gIdx, team, newState);
                return result(newState, true);
            }

            // 0 to WTS-2 → auto-fill WTS in opponent
            if (numVal <= wts - 2) {
                if (!newState[otherKey] || newState[otherKey] === '') {
                    newState = { ...newState, [otherKey]: wtsStr };
                    setScores(newState);
                    AsyncStorage.setItem(`scores_${groupName}`, JSON.stringify(newState));
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
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            setWinningScore(num);
            AsyncStorage.setItem(`wts_${groupName}`, val);
        }
    };

    const clearScores = async () => {
        setScores({});
        await AsyncStorage.removeItem(`scores_${groupName}`);
        setTimeout(() => inputRefs.current['0_0_t1']?.focus(), 100);
    };

    return {
        scores, setScores,
        winningScore, setWinningScore: updateWTS,
        clearScores, inputRefs, flatListRef, finishButtonRef,
        handleScoreChange
    };
};
