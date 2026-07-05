import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'https://playpbnow.com/api';
const POLL_INTERVAL = 2000;
const MAX_POLL_INTERVAL = 30000; // cap for exponential backoff on repeated failures
const PROTECTION_WINDOW = 3000;
const MAX_RETRIES = 3;
const MAX_HEAL_PUSHES_PER_POLL = 4; // self-heal budget per poll cycle

/**
 * useCollaborativeScoring V5 — OWNER-RESUME + SELF-HEALING
 *
 * CHANGES FROM V4:
 * - resumeOwnerSession(): the creator can leave and come back — reconnects to
 *   their own live session, adopts their last-pushed schedule, merges server
 *   scores over local, and re-pushes anything the server is missing.
 * - Host is authoritative for the schedule: only collaborators adopt schedule
 *   changes from the server (kills the host self-overwrite loop after shuffle).
 * - Self-healing sync: every poll re-pushes local scores the server is missing
 *   (heals offline typing / failed syncs). Convergence is guaranteed.
 * - Conclusive finish: when the session is finished (by anyone), polling stops
 *   permanently — no redirect loops, no zombie polls.
 * - Expired sessions are surfaced (sessionExpired) instead of failing silently.
 *
 * CHANGES FROM V3 (retained):
 * - All session-dependent functions use REFS, never closure values
 * - Retry logic on all syncs (3 attempts)
 * - Full pull on every poll (since=0) — no timestamp-based misses
 * - Functional setState for all merges — no race conditions
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
    const [sessionExpired, setSessionExpired] = useState(false);

    const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollFailuresRef = useRef(0); // consecutive poll failures, for backoff
    const localUpdatesRef = useRef<Set<string>>(new Set());
    // Once the session is finished/expired, polling stops PERMANENTLY for it.
    const sessionOverRef = useRef(false);

    // ── ALL session values as refs — immune to stale closures ──
    const sessionIdRef = useRef(sessionId);
    const shareCodeRef = useRef(shareCode);
    const initialSyncDoneRef = useRef(initialSyncDone);
    const isCollaboratorRef = useRef(isCollaborator);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { shareCodeRef.current = shareCode; }, [shareCode]);
    useEffect(() => { initialSyncDoneRef.current = initialSyncDone; }, [initialSyncDone]);
    useEffect(() => { isCollaboratorRef.current = isCollaborator; }, [isCollaborator]);

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

        const results = await Promise.allSettled(promises);
        // fetchWithRetry never rejects — failures come back as {status:'error'}
        const failed = results.filter(r =>
            r.status === 'rejected' || (r.status === 'fulfilled' && r.value?.status !== 'success')
        ).length;
        console.log(`📤 Pushed ${Object.keys(gameMap).length - failed}/${Object.keys(gameMap).length} games to server`);
        if (failed > 0) {
            console.warn(`⚠️ ${failed} score updates failed to sync (self-heal will retry on next poll)`);
        }
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
        if (!sid || !code || !initialSyncDoneRef.current || sessionOverRef.current) return;

        try {
            const userId = await AsyncStorage.getItem('user_id') || '';
            const res = await fetch(
                `${API_URL}/collab_get_scores.php?share_code=${code}&since=0&user_id=${userId}`
            );
            const data = await res.json();

            if (data.status === 'success') {
                // Check if the match was finished by another device
                if (data.session_status === 'finished') {
                    console.log('🏁 Match finished by a connected device!');
                    sessionOverRef.current = true; // stop polling for good
                    setFinishedGroupName(data.group_name || null);
                    setFinishedSessionId(data.saved_session_id ? String(data.saved_session_id) : null);
                    setMatchFinishedByRemote(true);
                    if (pollIntervalRef.current) {
                        clearTimeout(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    return;
                }

                setConnectedUsers(data.connected_users || 0);

                // ── Sync schedule from server — COLLABORATORS ONLY ──────
                // The host is authoritative for matchups: adopting its own pushes
                // back from the server caused a replace loop that stole input
                // focus mid-typing. Collaborators adopt host shuffles/swaps.
                if (data.schedule && setSchedule && isCollaboratorRef.current) {
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

                // Build the server's current view of every game's scores
                const serverState: { [key: string]: string } = {};
                if (data.updates && data.updates.length > 0) {
                    for (const update of data.updates) {
                        serverState[`${update.round_idx}_${update.game_idx}_t1`] = update.s1_str ?? '';
                        serverState[`${update.round_idx}_${update.game_idx}_t2`] = update.s2_str ?? '';
                    }
                }

                // ── MERGE server → local (never blanks a local value) ──
                const changes: { [key: string]: string } = {};
                const current = scoresRef.current;
                for (const [key, serverVal] of Object.entries(serverState)) {
                    if (localUpdatesRef.current.has(key)) continue; // just typed here
                    if (serverVal !== '' && current[key] !== serverVal) {
                        changes[key] = serverVal;
                    }
                }
                if (Object.keys(changes).length > 0) {
                    // Functional setState — MERGES, never overwrites local edits
                    setScores(prev => ({ ...prev, ...changes }));
                    setToastMessage('Scores updated from collaborator');
                }

                // ── SELF-HEAL local → server ────────────────────────────
                // Any local score the server is missing (offline typing, a sync
                // that exhausted its retries) gets re-pushed, a few games per
                // poll. This guarantees both sides converge — no lost scores.
                const gamesToHeal = new Set<string>();
                for (const [key, localVal] of Object.entries(scoresRef.current)) {
                    if (!localVal || localVal === '') continue;
                    if (localUpdatesRef.current.has(key)) continue;  // in-flight
                    if ((serverState[key] ?? '') === localVal) continue; // server has it
                    if ((serverState[key] ?? '') !== '') continue;   // server has a DIFFERENT value — server wins (merged above)
                    const parts = key.split('_');
                    if (parts.length !== 3) continue;
                    gamesToHeal.add(`${parts[0]}_${parts[1]}`);
                    if (gamesToHeal.size >= MAX_HEAL_PUSHES_PER_POLL) break;
                }
                for (const gameKey of gamesToHeal) {
                    const [r, g] = gameKey.split('_').map(Number);
                    const s1 = scoresRef.current[`${r}_${g}_t1`] || '';
                    const s2 = scoresRef.current[`${r}_${g}_t2`] || '';
                    console.log(`🩹 Self-heal: re-pushing game ${gameKey} (${s1}-${s2})`);
                    syncScoreToServer(r, g, s1, s2);
                }
            } else if (/not found|expired/i.test(data.message || '')) {
                // The 12h session window lapsed (or the session vanished).
                // Surface it — scores stay safe on-device — and stop polling.
                console.warn('⌛ Live session expired');
                sessionOverRef.current = true;
                setSessionExpired(true);
                setToastMessage('Live session expired — your scores are safe on this device');
            }
            pollFailuresRef.current = 0; // success — reset backoff
        } catch (err) {
            pollFailuresRef.current += 1; // failure — grow backoff
            console.error('Poll failed:', err);
        }
    }, [setScores, setSchedule, syncScoreToServer]);

    // ── LIFECYCLE: Start polling after initial sync ──────────────
    // Self-scheduling loop with exponential backoff: polls every POLL_INTERVAL
    // while healthy, but backs off (up to MAX_POLL_INTERVAL) on consecutive
    // failures so a flaky network / down server doesn't hammer at 2s forever.
    useEffect(() => {
        if (!sessionId || !shareCode || !initialSyncDone) {
            if (pollIntervalRef.current) {
                clearTimeout(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            return;
        }

        let cancelled = false;
        pollFailuresRef.current = 0;
        sessionOverRef.current = false; // fresh session — polling allowed
        setSessionExpired(false);

        const scheduleNext = () => {
            if (cancelled || sessionOverRef.current) return; // finished/expired = stop for good
            const delay = Math.min(
                POLL_INTERVAL * Math.pow(2, pollFailuresRef.current),
                MAX_POLL_INTERVAL
            );
            pollIntervalRef.current = setTimeout(async () => {
                if (cancelled) return;
                await pollForUpdates();
                scheduleNext();
            }, delay);
        };
        scheduleNext();

        return () => {
            cancelled = true;
            if (pollIntervalRef.current) {
                clearTimeout(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [sessionId, shareCode, initialSyncDone, pollForUpdates]);

    // Reset when session changes
    useEffect(() => {
        if (!sessionId || !shareCode) {
            setInitialSyncDone(false);
            serverScheduleHashRef.current = '';
        }
    }, [sessionId, shareCode]);

    // ── CREATE SESSION (Unit A) ──────────────────────────────────
    const createCollabSession = useCallback(async (
        batchId: string,
        groupName: string,
        scheduleData: any[],
        creatorUserId: string = ''
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
                    scores: {},
                    creator_user_id: creatorUserId
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

    // ── RESUME SESSION (Unit A returning to their own live match) ──
    // The creator left the screen (LIVE tab round-trip, app relaunch) and is
    // back. Reconnect without losing anything: adopt the last schedule THEY
    // pushed, MERGE server scores over local (never blanking local values),
    // and re-push anything the server is missing. Then polling resumes.
    const resumeOwnerSession = useCallback(async (code: string): Promise<boolean> => {
        console.log('🔁 Owner resuming live session...');
        try {
            const userId = await AsyncStorage.getItem('user_id') || '';
            const res = await fetch(
                `${API_URL}/collab_get_scores.php?share_code=${code}&since=0&user_id=${userId}`
            );
            const data = await res.json();
            if (data.status !== 'success') {
                if (/not found|expired/i.test(data.message || '')) {
                    sessionOverRef.current = true;
                    setSessionExpired(true);
                }
                return false;
            }
            if (data.session_status === 'finished') {
                sessionOverRef.current = true;
                setFinishedGroupName(data.group_name || null);
                setFinishedSessionId(data.saved_session_id ? String(data.saved_session_id) : null);
                setMatchFinishedByRemote(true);
                return false;
            }

            setConnectedUsers(data.connected_users || 0);

            // Adopt the schedule we last pushed (source of truth after a relaunch),
            // and record its hash so polls don't re-adopt it.
            if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0 && setSchedule) {
                serverScheduleHashRef.current = JSON.stringify(data.schedule);
                const safeSchedule = data.schedule.map((round: any, rIdx: number) => ({
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
            }

            // MERGE server scores over local (server values win; blanks never do)
            const serverScores: { [key: string]: string } = {};
            if (data.updates && data.updates.length > 0) {
                for (const update of data.updates) {
                    const s1 = update.s1_str ?? '';
                    const s2 = update.s2_str ?? '';
                    if (s1 !== '') serverScores[`${update.round_idx}_${update.game_idx}_t1`] = s1;
                    if (s2 !== '') serverScores[`${update.round_idx}_${update.game_idx}_t2`] = s2;
                }
            }
            setScores(prev => ({ ...prev, ...serverScores }));

            // Re-push anything local the server is missing (self-heal on arrival)
            const merged = { ...scoresRef.current, ...serverScores };
            const missing: { [key: string]: string } = {};
            for (const [key, val] of Object.entries(merged)) {
                if (val && val !== '' && (serverScores[key] ?? '') === '') missing[key] = val;
            }
            if (Object.keys(missing).length > 0) {
                console.log(`🩹 Resume heal: pushing ${Object.keys(missing).length} local values to server`);
                await pushAllScoresToServer(code, sessionIdRef.current || '', missing);
            }

            setInitialSyncDone(true); // polling resumes
            console.log('✅ Owner reconnected to live session');
            return true;
        } catch (err) {
            console.error('Owner resume failed:', err);
            return false;
        }
    }, [setSchedule, setScores, pushAllScoresToServer]);

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
        resumeOwnerSession,
        pushScheduleToServer,
        isSyncing,
        connectedUsers,
        toastMessage,
        dismissToast,
        initialSyncDone,
        matchFinishedByRemote,
        finishedGroupName,
        finishedSessionId,
        clearMatchFinished,
        sessionExpired
    };
};
