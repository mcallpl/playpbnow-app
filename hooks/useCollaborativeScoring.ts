import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';
const POLL_INTERVAL = 2000;
const PROTECTION_WINDOW = 3000;
const MAX_RETRIES = 3;

/**
 * useCollaborativeScoring V4 — ROCK SOLID
 *
 * CHANGES FROM V3:
 * - All session-dependent functions use REFS, never closure values
 * - Retry logic on all syncs (3 attempts)
 * - Server response is validated
 * - Full pull on every poll (since=0) — no timestamp-based misses
 * - Functional setState for all merges — no race conditions
 * - Exposes a ref-backed sync handler for FlatList cell stability
 */

interface CollabConfig {
    sessionId: string | null;
    shareCode: string | null;
    isCollaborator: boolean;
    schedule: any[];
    setSchedule?: (schedule: any[]) => void;
    scores: { [key: string]: string };
    setScores: (scores: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => void;
    scoresRef: React.MutableRefObject<{ [key: string]: string }>;
    inputRefs: React.MutableRefObject<{ [key: string]: any }>;
}

export const useCollaborativeScoring = (config: CollabConfig) => {
    const { sessionId, shareCode, isCollaborator, schedule, setSchedule, scores, setScores, scoresRef, inputRefs } = config;

    const [isSyncing, setSyncing] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [initialSyncDone, setInitialSyncDone] = useState(false);
    const [matchFinishedByRemote, setMatchFinishedByRemote] = useState(false);
    const [finishedGroupName, setFinishedGroupName] = useState<string | null>(null);
    const [finishedSessionId, setFinishedSessionId] = useState<string | null>(null);

    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const localUpdatesRef = useRef<Set<string>>(new Set());

    // ── ALL session values as refs — immune to stale closures ──
    const sessionIdRef = useRef(sessionId);
    const shareCodeRef = useRef(shareCode);
    const initialSyncDoneRef = useRef(initialSyncDone);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { shareCodeRef.current = shareCode; }, [shareCode]);
    useEffect(() => { initialSyncDoneRef.current = initialSyncDone; }, [initialSyncDone]);

    // ── RETRY FETCH helper ─────────────────────────────────────
    const fetchWithRetry = useCallback(async (
        url: string,
        options: RequestInit,
        retries: number = MAX_RETRIES
    ): Promise<any> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const res = await fetch(url, options);
                const data = await res.json();
                if (data.status === 'success') return data;
                console.error(`Server error (attempt ${attempt}/${retries}):`, data.message);
                if (attempt === retries) return data; // return error on final attempt
            } catch (err) {
                console.error(`Network error (attempt ${attempt}/${retries}):`, err);
                if (attempt < retries) {
                    await new Promise(r => setTimeout(r, 300 * attempt)); // backoff
                }
            }
        }
        return { status: 'error', message: 'All retries failed' };
    }, []);

    // ── PUSH ALL: Unit A sends every score to server ─────────────
    const pushAllScoresToServer = useCallback(async (
        code: string,
        sid: string,
        currentScores: { [key: string]: string }
    ) => {
        const gameMap: { [key: string]: { s1: string; s2: string; rIdx: number; gIdx: number } } = {};

        for (const [key, val] of Object.entries(currentScores)) {
            if (!val || val === '') continue;
            const parts = key.split('_');
            if (parts.length !== 3) continue;
            const rIdx = parseInt(parts[0]);
            const gIdx = parseInt(parts[1]);
            const team = parts[2];
            const gameKey = `${rIdx}_${gIdx}`;

            if (!gameMap[gameKey]) gameMap[gameKey] = { s1: '', s2: '', rIdx, gIdx };
            if (team === 't1') gameMap[gameKey].s1 = val;
            if (team === 't2') gameMap[gameKey].s2 = val;
        }

        const promises = Object.values(gameMap).map(game =>
            fetchWithRetry(`${API_URL}/collab_sync_scores.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    share_code: code,
                    session_id: sid,
                    round_idx: game.rIdx,
                    game_idx: game.gIdx,
                    s1_str: game.s1,
                    s2_str: game.s2,
                    updated_at: Date.now()
                })
            })
        );

        await Promise.all(promises);
        console.log(`📤 Pushed ${Object.keys(gameMap).length} games to server`);
    }, [fetchWithRetry]);

    // ── PULL ALL: Get every score from server, REPLACE local ─────
    const pullAllScoresFromServer = useCallback(async (code: string): Promise<{ [key: string]: string } | null> => {
        try {
            const res = await fetch(
                `${API_URL}/collab_get_scores.php?share_code=${code}&since=0`
            );
            const data = await res.json();

            if (data.status === 'success') {
                setConnectedUsers(data.connected_users || 0);

                const serverScores: { [key: string]: string } = {};
                if (data.updates && data.updates.length > 0) {
                    for (const update of data.updates) {
                        const s1 = update.s1_str ?? '';
                        const s2 = update.s2_str ?? '';
                        if (s1 !== '') serverScores[`${update.round_idx}_${update.game_idx}_t1`] = s1;
                        if (s2 !== '') serverScores[`${update.round_idx}_${update.game_idx}_t2`] = s2;
                    }
                }

                // Full replace on join — intentional
                setScores(serverScores);
                console.log(`📥 Pulled ${Object.keys(serverScores).length} values from server`);
                return serverScores;
            }
        } catch (err) {
            console.error('Pull all failed:', err);
        }
        return null;
    }, [setScores]);

    // ── PUSH ONE GAME: Uses REFS — works even from stale closures ──
    const syncScoreToServer = useCallback(async (
        roundIdx: number, gameIdx: number, s1Val: string, s2Val: string
    ) => {
        // Read from REFS, not closure — immune to stale FlatList cells
        const sid = sessionIdRef.current;
        const code = shareCodeRef.current;
        if (!sid || !code) return;

        // Protect these keys from being overwritten by next poll
        const key1 = `${roundIdx}_${gameIdx}_t1`;
        const key2 = `${roundIdx}_${gameIdx}_t2`;
        localUpdatesRef.current.add(key1);
        localUpdatesRef.current.add(key2);
        setTimeout(() => {
            localUpdatesRef.current.delete(key1);
            localUpdatesRef.current.delete(key2);
        }, PROTECTION_WINDOW);

        const result = await fetchWithRetry(`${API_URL}/collab_sync_scores.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                share_code: code,
                session_id: sid,
                round_idx: roundIdx,
                game_idx: gameIdx,
                s1_str: s1Val,
                s2_str: s2Val,
                updated_at: Date.now()
            })
        });

        if (result.status !== 'success') {
            console.error(`⚠️ SYNC FAILED for game ${roundIdx}_${gameIdx}: ${result.message}`);
        }
    }, [fetchWithRetry]); // NO sessionId/shareCode deps — uses refs

    // ── Track server schedule hash to detect changes ──────────
    const serverScheduleHashRef = useRef<string>('');

    // ── POLL: FULL PULL every time — no timestamp gaps ──────────
    const pollForUpdates = useCallback(async () => {
        const sid = sessionIdRef.current;
        const code = shareCodeRef.current;
        if (!sid || !code || !initialSyncDoneRef.current) return;

        try {
            const userId = await AsyncStorage.getItem('user_id') || '';
            const res = await fetch(
                `${API_URL}/collab_get_scores.php?share_code=${code}&since=0&user_id=${userId}`
            );
            const data = await res.json();

            if (data.status === 'success') {
                // Check if the match was finished by another device
                if (data.session_status === 'finished') {
                    console.log('🏁 Match finished by collaborator!');
                    setFinishedGroupName(data.group_name || null);
                    setFinishedSessionId(data.saved_session_id ? String(data.saved_session_id) : null);
                    setMatchFinishedByRemote(true);
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    return;
                }

                setConnectedUsers(data.connected_users || 0);

                // ── Sync schedule from server (detects creator shuffle/swap) ──
                if (data.schedule && setSchedule) {
                    const serverScheduleStr = JSON.stringify(data.schedule);
                    if (serverScheduleHashRef.current === '') {
                        // First poll — just record the hash
                        serverScheduleHashRef.current = serverScheduleStr;
                    } else if (serverScheduleStr !== serverScheduleHashRef.current) {
                        // Schedule changed on server — update local
                        console.log('📋 Schedule updated from server — syncing player assignments');
                        serverScheduleHashRef.current = serverScheduleStr;
                        // Parse and set schedule with proper IDs (same logic as useGameLogic init)
                        const parsed = data.schedule;
                        const safeSchedule = parsed.map((round: any, rIdx: number) => ({
                            ...round,
                            id: round.id || `round-${rIdx}`,
                            games: round.games.map((g: any, gIdx: number) => ({
                                ...g,
                                id: g.id || `game-${rIdx}-${gIdx}-${Date.now()}`,
                                score_team1: g.score_team1 || 0,
                                score_team2: g.score_team2 || 0
                            }))
                        }));
                        setSchedule(safeSchedule);
                        setToastMessage('Matchups updated by host');
                    }
                }

                if (data.updates && data.updates.length > 0) {
                    // Compare server state against our synchronous ref
                    const changes: { [key: string]: string } = {};
                    const current = scoresRef.current;

                    for (const update of data.updates) {
                        const key1 = `${update.round_idx}_${update.game_idx}_t1`;
                        const key2 = `${update.round_idx}_${update.game_idx}_t2`;

                        if (!localUpdatesRef.current.has(key1)) {
                            const serverVal = update.s1_str ?? '';
                            if (serverVal !== '' && current[key1] !== serverVal) {
                                changes[key1] = serverVal;
                            }
                        }

                        if (!localUpdatesRef.current.has(key2)) {
                            const serverVal = update.s2_str ?? '';
                            if (serverVal !== '' && current[key2] !== serverVal) {
                                changes[key2] = serverVal;
                            }
                        }
                    }

                    if (Object.keys(changes).length > 0) {
                        // Functional setState — MERGES, never overwrites local edits
                        setScores(prev => ({ ...prev, ...changes }));
                        setToastMessage('Scores updated from collaborator');
                    }
                }
            }
        } catch (err) {
            console.error('Poll failed:', err);
        }
    }, [setScores, setSchedule]);

    // ── LIFECYCLE: Start polling after initial sync ──────────────
    useEffect(() => {
        if (!sessionId || !shareCode || !initialSyncDone) {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            return;
        }

        // Start polling
        pollIntervalRef.current = setInterval(pollForUpdates, POLL_INTERVAL);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [sessionId, shareCode, initialSyncDone, pollForUpdates]);

    // Reset when session changes
    useEffect(() => {
        if (!sessionId || !shareCode) {
            setInitialSyncDone(false);
        }
    }, [sessionId, shareCode]);

    // ── CREATE SESSION (Unit A) ──────────────────────────────────
    const createCollabSession = useCallback(async (
        batchId: string,
        groupName: string,
        scheduleData: any[]
    ): Promise<{ shareCode: string; sessionId: string } | null> => {
        setSyncing(true);
        try {
            const res = await fetch(`${API_URL}/collab_create_session.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batch_id: batchId,
                    group_name: groupName,
                    schedule: scheduleData,
                    scores: {}
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                const code = data.share_code;
                const sid = data.session_id.toString();

                // Push all current scores to the server
                await pushAllScoresToServer(code, sid, scoresRef.current);

                // Mark initial sync done so polling can start
                setInitialSyncDone(true);

                return { shareCode: code, sessionId: sid };
            } else {
                console.error('Create session failed:', data.message);
                return null;
            }
        } catch (err) {
            console.error('Create session error:', err);
            return null;
        } finally {
            setSyncing(false);
        }
    }, [pushAllScoresToServer]);

    // ── JOIN SESSION (Unit B) ────────────────────────────────────
    const joinAndSync = useCallback(async (code: string): Promise<{ [key: string]: string } | null> => {
        console.log('🔗 Unit B joining session, pulling scores...');
        const serverScores = await pullAllScoresFromServer(code);
        if (serverScores) {
            setInitialSyncDone(true);
        }
        return serverScores;
    }, [pullAllScoresFromServer]);

    // ── PUSH SCHEDULE UPDATE (Unit A after shuffle/swap) ─────────
    const pushScheduleToServer = useCallback(async (scheduleData: any[]) => {
        const sid = sessionIdRef.current;
        const code = shareCodeRef.current;
        if (!sid || !code) return;

        try {
            await fetchWithRetry(`${API_URL}/collab_update_schedule.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    share_code: code,
                    session_id: sid,
                    schedule: scheduleData
                })
            });
            console.log('📤 Pushed updated schedule to server');
        } catch (err) {
            console.error('Push schedule failed:', err);
        }
    }, [fetchWithRetry]);

    const dismissToast = useCallback(() => {
        setToastMessage(null);
    }, []);

    const clearMatchFinished = useCallback(() => {
        setMatchFinishedByRemote(false);
        setFinishedGroupName(null);
        setFinishedSessionId(null);
    }, []);

    return {
        syncScoreToServer,
        createCollabSession,
        joinAndSync,
        pushScheduleToServer,
        isSyncing,
        connectedUsers,
        toastMessage,
        dismissToast,
        initialSyncDone,
        matchFinishedByRemote,
        finishedGroupName,
        finishedSessionId,
        clearMatchFinished
    };
};
