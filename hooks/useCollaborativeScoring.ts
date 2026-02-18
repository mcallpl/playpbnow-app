import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'https://peoplestar.com/Chipleball/api';

/**
 * useCollaborativeScoring V3 — UNIT A IS BOSS
 * 
 * RULES:
 * 1. When Unit A creates session, ALL of Unit A's current scores 
 *    get pushed to the server immediately. Server = Unit A's state.
 * 2. When Unit B joins, it does a FULL PULL from server, completely
 *    replacing whatever it had locally. Now both match Unit A.
 * 3. From that point, both poll every 3s. Either can make changes.
 *    Server is the single source of truth.
 * 4. NEVER send empty strings as real values. If a box is empty,
 *    don't send it. If a box has "0", that's a real score.
 * 5. NEVER overwrite a local value you just typed (4s protection window).
 */

interface CollabConfig {
    sessionId: string | null;
    shareCode: string | null;
    isCollaborator: boolean;
    schedule: any[];
    scores: { [key: string]: string };
    setScores: (scores: { [key: string]: string }) => void;
    inputRefs: React.MutableRefObject<{ [key: string]: any }>;
}

export const useCollaborativeScoring = (config: CollabConfig) => {
    const { sessionId, shareCode, isCollaborator, schedule, scores, setScores, inputRefs } = config;

    const [isSyncing, setSyncing] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [initialSyncDone, setInitialSyncDone] = useState(false);
    const [matchFinishedByRemote, setMatchFinishedByRemote] = useState(false);
    const [finishedGroupName, setFinishedGroupName] = useState<string | null>(null);

    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const localUpdatesRef = useRef<Set<string>>(new Set());
    const scoresRef = useRef(scores);

    useEffect(() => {
        scoresRef.current = scores;
    }, [scores]);

    // ── PUSH ALL: Unit A sends every score to server ─────────────
    const pushAllScoresToServer = useCallback(async (
        code: string, 
        sid: string, 
        currentScores: { [key: string]: string }
    ) => {
        // Group by game
        const gameMap: { [key: string]: { s1: string; s2: string; rIdx: number; gIdx: number } } = {};
        
        for (const [key, val] of Object.entries(currentScores)) {
            if (!val || val === '') continue;
            const parts = key.split('_'); // "0_0_t1"
            if (parts.length !== 3) continue;
            const rIdx = parseInt(parts[0]);
            const gIdx = parseInt(parts[1]);
            const team = parts[2];
            const gameKey = `${rIdx}_${gIdx}`;
            
            if (!gameMap[gameKey]) gameMap[gameKey] = { s1: '', s2: '', rIdx, gIdx };
            if (team === 't1') gameMap[gameKey].s1 = val;
            if (team === 't2') gameMap[gameKey].s2 = val;
        }
        
        // Push each game
        const promises = Object.values(gameMap).map(game => 
            fetch(`${API_URL}/collab_sync_scores.php`, {
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
            }).catch(err => console.error('Push error:', err))
        );
        
        await Promise.all(promises);
        console.log(`📤 Pushed ${Object.keys(gameMap).length} games to server`);
    }, []);

    // ── PULL ALL: Get every score from server, REPLACE local ─────
    const pullAllScoresFromServer = useCallback(async (code: string) => {
        try {
            const res = await fetch(
                `${API_URL}/collab_get_scores.php?share_code=${code}&since=0`
            );
            const data = await res.json();

            if (data.status === 'success') {
                setConnectedUsers(data.connected_users || 0);

                // Build a CLEAN scores object from server data only
                const serverScores: { [key: string]: string } = {};
                
                if (data.updates && data.updates.length > 0) {
                    for (const update of data.updates) {
                        const s1 = update.s1_str ?? '';
                        const s2 = update.s2_str ?? '';
                        if (s1 !== '') serverScores[`${update.round_idx}_${update.game_idx}_t1`] = s1;
                        if (s2 !== '') serverScores[`${update.round_idx}_${update.game_idx}_t2`] = s2;
                    }
                }
                
                // REPLACE local scores entirely with server state
                setScores(serverScores);
                console.log(`📥 Pulled ${Object.keys(serverScores).length} values from server — local replaced`);

                if (data.latest_timestamp) {
                    setLastSyncTime(data.latest_timestamp);
                }
                return true;
            }
        } catch (err) {
            console.error('Pull all failed:', err);
        }
        return false;
    }, [setScores]);

    // ── PUSH ONE GAME: Send a single game's scores ───────────────
    const syncScoreToServer = useCallback(async (
        roundIdx: number, gameIdx: number, s1Val: string, s2Val: string
    ) => {
        if (!sessionId || !shareCode) return;

        // Protect these keys from being overwritten by next poll
        const key1 = `${roundIdx}_${gameIdx}_t1`;
        const key2 = `${roundIdx}_${gameIdx}_t2`;
        localUpdatesRef.current.add(key1);
        localUpdatesRef.current.add(key2);
        setTimeout(() => {
            localUpdatesRef.current.delete(key1);
            localUpdatesRef.current.delete(key2);
        }, 4000);

        try {
            await fetch(`${API_URL}/collab_sync_scores.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    share_code: shareCode,
                    session_id: sessionId,
                    round_idx: roundIdx,
                    game_idx: gameIdx,
                    s1_str: s1Val,
                    s2_str: s2Val,
                    updated_at: Date.now()
                })
            });
        } catch (err) {
            console.error('Score sync failed:', err);
        }
    }, [sessionId, shareCode]);

    // ── POLL: Check for new changes from the other unit ──────────
    const pollForUpdates = useCallback(async () => {
        if (!sessionId || !shareCode || !initialSyncDone) return;

        try {
            const userId = await AsyncStorage.getItem('user_id') || '';
            const res = await fetch(
                `${API_URL}/collab_get_scores.php?share_code=${shareCode}&since=${lastSyncTime}&user_id=${userId}`
            );
            const data = await res.json();

            if (data.status === 'success') {
                // Check if the match was finished by another device
                if (data.session_status === 'finished') {
                    console.log('🏁 Match finished by collaborator! Redirecting to podium...');
                    setFinishedGroupName(data.group_name || null);
                    setMatchFinishedByRemote(true);
                    // Stop polling immediately
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    return;
                }

                setConnectedUsers(data.connected_users || 0);

                if (data.updates && data.updates.length > 0) {
                    const currentScores = { ...scoresRef.current };
                    let hasChanges = false;

                    for (const update of data.updates) {
                        const key1 = `${update.round_idx}_${update.game_idx}_t1`;
                        const key2 = `${update.round_idx}_${update.game_idx}_t2`;

                        if (!localUpdatesRef.current.has(key1)) {
                            const serverVal = update.s1_str ?? '';
                            if (serverVal !== '' && currentScores[key1] !== serverVal) {
                                currentScores[key1] = serverVal;
                                hasChanges = true;
                            }
                        }

                        if (!localUpdatesRef.current.has(key2)) {
                            const serverVal = update.s2_str ?? '';
                            if (serverVal !== '' && currentScores[key2] !== serverVal) {
                                currentScores[key2] = serverVal;
                                hasChanges = true;
                            }
                        }
                    }

                    if (hasChanges) {
                        setScores(currentScores);
                        setToastMessage('Scores updated from collaborator');
                    }
                }

                if (data.latest_timestamp) {
                    setLastSyncTime(data.latest_timestamp);
                }
            }
        } catch (err) {
            console.error('Poll failed:', err);
        }
    }, [sessionId, shareCode, lastSyncTime, setScores, initialSyncDone]);

    // ── LIFECYCLE: Start polling after initial sync ──────────────
    useEffect(() => {
        if (!sessionId || !shareCode || !initialSyncDone) {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            return;
        }

        // Start polling every 3 seconds
        pollIntervalRef.current = setInterval(pollForUpdates, 3000);

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
            setLastSyncTime(0);
        }
    }, [sessionId, shareCode]);

    // ── CREATE SESSION (Unit A) ──────────────────────────────────
    // Creates session AND pushes all current scores to server
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
                    scores: {} // Don't send scores in snapshot — we push them separately
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                const code = data.share_code;
                const sid = data.session_id.toString();
                
                // NOW push all current scores to the server
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
    // Called after Unit B navigates to game screen with collab params
    const joinAndSync = useCallback(async (code: string) => {
        console.log('🔗 Unit B joining session, pulling scores...');
        const success = await pullAllScoresFromServer(code);
        if (success) {
            setInitialSyncDone(true);
        }
    }, [pullAllScoresFromServer]);

    const dismissToast = useCallback(() => {
        setToastMessage(null);
    }, []);

    const clearMatchFinished = useCallback(() => {
        setMatchFinishedByRemote(false);
        setFinishedGroupName(null);
    }, []);

    return {
        syncScoreToServer,
        createCollabSession,
        joinAndSync,
        isSyncing,
        connectedUsers,
        toastMessage,
        dismissToast,
        initialSyncDone,
        matchFinishedByRemote,
        finishedGroupName,
        clearMatchFinished
    };
};
