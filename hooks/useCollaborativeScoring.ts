import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'https://playpbnow.com/api';
const POLL_INTERVAL = 2000;
const MAX_POLL_INTERVAL = 30000; // cap for exponential backoff on repeated failures
const PROTECTION_WINDOW = 3000;
// UAT 2026-09-04 (#1): a round trip through fetchWithRetry can take ~4.5s, so a
// protection window that STARTS before the write could lapse while the write
// was still in flight and let the poll flip the cell back. Protection is now
// released AFTER the round trip, plus one poll interval of slack so the poll
// already in flight when we finished can't clobber us either.
const PROTECTION_RELEASE_SLACK = POLL_INTERVAL;
// Hard ceiling: a hung request must never protect a key forever (which would
// make that cell permanently ignore other scorers).
const MAX_PROTECTION_WINDOW = 30000;
const MAX_RETRIES = 3;
const MAX_HEAL_PUSHES_PER_POLL = 4; // self-heal budget per poll cycle
// UAT 2026-09-04 (#6): renaming a player fires a schedule change per keystroke.
// Coalesce them into one push.
const SCHEDULE_PUSH_DEBOUNCE = 800;
// UAT 2026-09-04 (#13): a failed join/resume used to kill polling forever.
const MAX_INITIAL_SYNC_RETRIES = 8;
// UAT 2026-09-04 (#21): a key is only reported as "not synced" once it has been
// unconfirmed for this long — otherwise the badge blinks on every keystroke.
const UNSYNCED_GRACE_MS = 1500;

// Marker written once a device has genuinely joined a share code. Survives a
// screen remount (LIVE tab round-trip) so a re-join is not mistaken for a first
// join — see #4.
export const JOINED_SESSION_PREFIX = 'collab_joined_';

/**
 * useCollaborativeScoring V6 — ROCK-SOLID CLIENT SYNC
 *
 * CHANGES FROM V5 (2026-09-04 UAT, all additive — every V5 path still stands):
 * - #1  Key protection is released AFTER the write's round trip (+1 poll of
 *       slack), never on a timer started before it.
 * - #5  markLocalEdit() protects a cell on every KEYSTROKE, including the
 *       "still typing" paths that never reach syncScoreToServer.
 * - #7  joinAndSync() adopts the server's authoritative schedule and SEEDS the
 *       schedule hash, so a shuffle between the join POST and the first poll is
 *       no longer swallowed (joiner scoring against dead pairings).
 * - #4  A collaborator RE-joining (remount) merges instead of full-replacing,
 *       and re-pushes local-only values. Genuine first joins still replace.
 * - #6  A host schedule edit only wipes the collaborator's scores when the
 *       server reports a NEW scores_reset_at; otherwise it merges and falls
 *       through to self-heal. Absent field = V5 behaviour.
 * - #13 The initial sync retries with backoff, and a disconnected session is
 *       surfaced (connectionState) instead of silently never polling.
 * - #21 Unsynced scores are counted and surfaced (unsyncedCount / lastSyncedAt)
 *       so nothing is ever lost silently.
 * - #18 Owner resume RE-PUSHES the host's local schedule instead of adopting
 *       the server's (the host is authoritative for matchups).
 *
 * CHANGES FROM V4 (retained):
 * - resumeOwnerSession(): the creator can leave and come back — reconnects to
 *   their own live session, merges server scores over local, and re-pushes
 *   anything the server is missing.
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

export type ScoreMap = { [key: string]: string };
export type CollabConnectionState =
    | 'idle'        // no live session on this device
    | 'connecting'  // session known, initial sync not finished yet
    | 'live'        // polling and healthy
    | 'reconnecting'// polls are failing, backing off and retrying
    | 'offline'     // the initial sync has failed repeatedly — NOT connected
    | 'expired'     // the 12h session window lapsed
    | 'finished';   // somebody finished the match

// ── PURE HELPERS (exported for unit tests) ───────────────────────
// These are the decision rules the poll/merge/join paths run on. They are kept
// pure so the tricky bits (clear vs skip, pending, schedule adoption) can be
// pinned by tests without a network or a React tree.

/** Server's view of every game, INCLUDING explicit clears ('' means erased). */
export const buildServerState = (updates: any[] | undefined | null): ScoreMap => {
    const serverState: ScoreMap = {};
    if (updates && updates.length > 0) {
        for (const update of updates) {
            serverState[`${update.round_idx}_${update.game_idx}_t1`] = update.s1_str ?? '';
            serverState[`${update.round_idx}_${update.game_idx}_t2`] = update.s2_str ?? '';
        }
    }
    return serverState;
};

/** Only the non-empty server values (what a fresh join adopts wholesale). */
export const buildNonEmptyServerScores = (updates: any[] | undefined | null): ScoreMap => {
    const scores: ScoreMap = {};
    const all = buildServerState(updates);
    for (const [key, val] of Object.entries(all)) {
        if (val !== '') scores[key] = val;
    }
    return scores;
};

/**
 * Server → local merge. A key present with '' is an explicit CLEAR and must be
 * applied. A key this device typed and the server has not confirmed is left
 * alone. Returns the changes to apply plus the pending keys the server has now
 * confirmed (so the caller can stop tracking them).
 */
export const computeMergeChanges = (
    current: ScoreMap,
    serverState: ScoreMap,
    localUpdateKeys: Set<string>,
    pendingKeys: Set<string>
): { changes: ScoreMap; confirmed: string[] } => {
    const changes: ScoreMap = {};
    const confirmed: string[] = [];
    for (const [key, serverVal] of Object.entries(serverState)) {
        if (localUpdateKeys.has(key)) continue; // just typed here
        if (pendingKeys.has(key)) {
            if ((current[key] ?? '') === serverVal) confirmed.push(key);
            continue; // ours is still in flight — never clobber it
        }
        if ((current[key] ?? '') !== serverVal) changes[key] = serverVal;
    }
    return { changes, confirmed };
};

/**
 * Local → server self-heal. Re-push local values the server is missing, but
 * NEVER resurrect a score the server has explicitly cleared unless it is our
 * own unconfirmed typing.
 */
export const computeGamesToHeal = (
    local: ScoreMap,
    serverState: ScoreMap,
    localUpdateKeys: Set<string>,
    pendingKeys: Set<string>,
    budget: number = MAX_HEAL_PUSHES_PER_POLL
): string[] => {
    const gamesToHeal = new Set<string>();
    for (const [key, localVal] of Object.entries(local)) {
        if (!localVal || localVal === '') continue;
        if (localUpdateKeys.has(key)) continue;              // in-flight
        if ((serverState[key] ?? '') === localVal) continue; // server has it
        if ((serverState[key] ?? '') !== '') continue;       // server has a DIFFERENT value — server wins
        // The server HAS a record for this key and it is empty: somebody deleted
        // this score deliberately. Only re-push it if it is our own unconfirmed
        // typing; otherwise pushing would resurrect a score another scorer erased.
        if (Object.prototype.hasOwnProperty.call(serverState, key) && !pendingKeys.has(key)) continue;
        const parts = key.split('_');
        if (parts.length !== 3) continue;
        gamesToHeal.add(`${parts[0]}_${parts[1]}`);
        if (gamesToHeal.size >= budget) break;
    }
    return Array.from(gamesToHeal);
};

/**
 * #6 — should a schedule change WIPE this collaborator's scores?
 *
 * Only a real shuffle clears scores server-side, and the server signals that
 * with a fresh `scores_reset_at`. A swap / rename / added playoff round must
 * NOT destroy local work. Older servers do not send the field at all — then we
 * fall back to the previous (destructive) behaviour rather than break.
 */
export const shouldReplaceScoresOnScheduleChange = (
    hasResetField: boolean,
    serverResetAt: string | number | null | undefined,
    lastSeenResetAt: string | null
): boolean => {
    if (!hasResetField) return true;                 // older server → V5 behaviour
    if (serverResetAt === null || serverResetAt === undefined || serverResetAt === '') return false;
    return String(serverResetAt) !== String(lastSeenResetAt ?? '');
};

/** Same normalisation the poll uses, so join/resume/poll all agree. */
export const normalizeSchedule = (parsed: any[]): any[] =>
    parsed.map((round: any, rIdx: number) => ({
        ...round,
        id: round.id || `round-${rIdx}`,
        games: (round.games || []).map((g: any, gIdx: number) => ({
            ...g,
            id: g.id || `game-${rIdx}-${gIdx}-${Date.now()}`,
            score_team1: g.score_team1 || 0,
            score_team2: g.score_team2 || 0
        }))
    }));

/**
 * A stable fingerprint of WHO plays WHOM (and who sits out) in each round.
 *
 * Raw JSON.stringify can't be used to compare two copies of the same schedule:
 * normalizeSchedule() stamps generated ids (Date.now()) onto anything missing
 * one, so two identical schedules serialise differently. The signature ignores
 * ids that don't matter and keeps the things a scorer would notice — pairings,
 * names, byes and the round type.
 */
export const scheduleSignature = (sched: any[] | null | undefined): string => {
    if (!Array.isArray(sched)) return '';
    const person = (p: any) => `${p?.id ?? ''}:${p?.first_name ?? ''}`;
    return sched.map((r: any) => [
        r?.type ?? '',
        (r?.games || []).map((g: any) =>
            `${(g?.team1 || []).map(person).join('+')}v${(g?.team2 || []).map(person).join('+')}`
        ).join('|'),
        (r?.byes || []).map(person).join('+'),
    ].join('~')).join(';');
};

/** Local values the server does not have (used by resume/re-join healing). */
export const computeMissingOnServer = (local: ScoreMap, serverScores: ScoreMap): ScoreMap => {
    const missing: ScoreMap = {};
    for (const [key, val] of Object.entries(local)) {
        if (val && val !== '' && (serverScores[key] ?? '') === '') missing[key] = val;
    }
    return missing;
};

/** How many scores this device typed are still unconfirmed by the server. */
export const countUnsynced = (
    unsynced: Map<string, number>,
    local: ScoreMap,
    now: number = Date.now(),
    grace: number = UNSYNCED_GRACE_MS
): number => {
    let n = 0;
    unsynced.forEach((markedAt, key) => {
        const val = local[key] ?? '';
        if (val === '') return;
        if (now - markedAt < grace) return;
        n += 1;
    });
    return n;
};

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
    // UAT C-H5: fired on a COLLABORATOR device after it adopts a new schedule
    // from the host. Receives the server's scores for that schedule (empty
    // after a host shuffle) so the screen can persist/clear its local copy.
    onScheduleAdoptedFromHost?: (serverScores: { [key: string]: string }) => void;
    // UAT 2026-09-04 (#17): fired once the server's scores have been adopted, so
    // the screen's AsyncStorage cache can never replace them afterwards.
    onServerPull?: () => void;
}

export const useCollaborativeScoring = (config: CollabConfig) => {
    const { sessionId, shareCode, isCollaborator, schedule, setSchedule, scores, setScores, scoresRef, inputRefs, onScheduleAdoptedFromHost, onServerPull } = config;
    const onScheduleAdoptedRef = useRef(onScheduleAdoptedFromHost);
    useEffect(() => { onScheduleAdoptedRef.current = onScheduleAdoptedFromHost; }, [onScheduleAdoptedFromHost]);
    const onServerPullRef = useRef(onServerPull);
    useEffect(() => { onServerPullRef.current = onServerPull; }, [onServerPull]);
    const notifyServerPull = useCallback(() => {
        try { onServerPullRef.current?.(); } catch {}
    }, []);

    const [isSyncing, setSyncing] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [initialSyncDone, setInitialSyncDone] = useState(false);
    const [matchFinishedByRemote, setMatchFinishedByRemote] = useState(false);
    const [finishedGroupName, setFinishedGroupName] = useState<string | null>(null);
    const [finishedSessionId, setFinishedSessionId] = useState<string | null>(null);
    const [sessionExpired, setSessionExpired] = useState(false);
    // #13 / #21 — visible connection + unsynced state
    const [initialSyncFailed, setInitialSyncFailed] = useState(false);
    const [pollFailing, setPollFailing] = useState(false);
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    // A REF, not state: this ticks every couple of seconds and putting it in
    // state would re-render the whole scoring screen (a long FlatList) on every
    // poll. The screen reads it on its own slow display tick instead.
    const lastSyncedAtRef = useRef<number | null>(null);

    const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollFailuresRef = useRef(0); // consecutive poll failures, for backoff
    const localUpdatesRef = useRef<Set<string>>(new Set());
    // Keys this device has typed whose value the server has NOT yet echoed back.
    // localUpdatesRef only protects for a few seconds; this survives until the
    // server confirms, so a failed/slow sync can never be silently blanked by a
    // poll, and self-heal knows exactly what still needs pushing.
    // (UAT 2026-09-04 — see the clear/resurrect fix below.)
    const pendingRef = useRef<Set<string>>(new Set());
    // #21 — keys typed here whose POST has not succeeded yet (key → first marked
    // at). Drives the "N not synced" indicator, so a failure is never silent.
    const unsyncedRef = useRef<Map<string, number>>(new Map());
    // #1 — per-key edit generation, so an OLD write's release timer can never
    // un-protect a cell the user has typed into since.
    const editSeqRef = useRef<Map<string, number>>(new Map());
    // Once the session is finished/expired, polling stops PERMANENTLY for it.
    const sessionOverRef = useRef(false);
    // resumeOwnerSession (#18) needs the schedule pusher, which is declared much
    // further down — this ref bridges the two without reordering the file.
    const schedulePushRef = useRef<((s: any[], o?: { resetScores?: boolean }) => void) | null>(null);

    // ── ALL session values as refs — immune to stale closures ──
    const sessionIdRef = useRef(sessionId);
    const shareCodeRef = useRef(shareCode);
    const initialSyncDoneRef = useRef(initialSyncDone);
    const isCollaboratorRef = useRef(isCollaborator);
    const scheduleRef = useRef(schedule);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { shareCodeRef.current = shareCode; }, [shareCode]);
    useEffect(() => { initialSyncDoneRef.current = initialSyncDone; }, [initialSyncDone]);
    useEffect(() => { isCollaboratorRef.current = isCollaborator; }, [isCollaborator]);
    useEffect(() => { scheduleRef.current = schedule; }, [schedule]);

    // ── UNSYNCED BOOKKEEPING (#21) ──────────────────────────────
    const refreshUnsyncedCount = useCallback(() => {
        setUnsyncedCount(countUnsynced(unsyncedRef.current, scoresRef.current));
    }, [scoresRef]);

    const markUnsynced = useCallback((keys: string[]) => {
        const now = Date.now();
        for (const k of keys) {
            if (!unsyncedRef.current.has(k)) unsyncedRef.current.set(k, now);
        }
        refreshUnsyncedCount();
    }, [refreshUnsyncedCount]);

    const clearUnsynced = useCallback((keys: string[]) => {
        for (const k of keys) unsyncedRef.current.delete(k);
        refreshUnsyncedCount();
    }, [refreshUnsyncedCount]);

    // ── KEY PROTECTION (#1 / #5) ────────────────────────────────
    // Protection is generation-stamped: re-marking a key REFRESHES the window
    // instead of stacking timers, and a stale timer never releases a newer edit.
    const protectKey = useCallback((key: string): number => {
        const seq = (editSeqRef.current.get(key) || 0) + 1;
        editSeqRef.current.set(key, seq);
        localUpdatesRef.current.add(key);
        // Safety valve: even if the release below never runs (hung request), the
        // key cannot stay protected forever.
        setTimeout(() => {
            if (editSeqRef.current.get(key) === seq) localUpdatesRef.current.delete(key);
        }, MAX_PROTECTION_WINDOW);
        return seq;
    }, []);

    const releaseKey = useCallback((key: string, seq: number, delay: number) => {
        setTimeout(() => {
            if (editSeqRef.current.get(key) === seq) localUpdatesRef.current.delete(key);
        }, delay);
    }, []);

    /**
     * #5 — call this on EVERY keystroke, not only when a sync fires. The two
     * "still typing" paths in useSmartScoring (first digit equals PLAY TO's
     * first digit; WTS-1 awaiting a second digit) deliberately return
     * changed:false, so without this the half-typed cell had zero protection and
     * a poll could overwrite it (the next keystroke then hit the 2-char cap and
     * was silently dropped).
     */
    const markLocalEdit = useCallback((roundIdx: number, gameIdx: number) => {
        const key1 = `${roundIdx}_${gameIdx}_t1`;
        const key2 = `${roundIdx}_${gameIdx}_t2`;
        const seq1 = protectKey(key1);
        const seq2 = protectKey(key2);
        releaseKey(key1, seq1, PROTECTION_WINDOW);
        releaseKey(key2, seq2, PROTECTION_WINDOW);
    }, [protectKey, releaseKey]);

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
            // #21: a bulk push that partly failed is unsynced work — say so.
            markUnsynced(Object.keys(currentScores).filter(k => (currentScores[k] || '') !== ''));
        } else if (Object.keys(gameMap).length > 0) {
            lastSyncedAtRef.current = Date.now();
        }
    }, [fetchWithRetry, markUnsynced]);

    // ── PULL ALL: Get every score from server, REPLACE local ─────
    // (V5 path, kept intact — a genuine first join still adopts wholesale.)
    const pullAllScoresFromServer = useCallback(async (code: string): Promise<{ [key: string]: string } | null> => {
        try {
            const res = await fetch(
                `${API_URL}/collab_get_scores.php?share_code=${code}&since=0`
            );
            const data = await res.json();

            if (data.status === 'success') {
                setConnectedUsers(data.connected_users || 0);

                const serverScores = buildNonEmptyServerScores(data.updates);

                // Full replace on join — intentional
                setScores(serverScores);
                notifyServerPull();
                console.log(`📥 Pulled ${Object.keys(serverScores).length} values from server`);
                return serverScores;
            }
        } catch (err) {
            console.error('Pull all failed:', err);
        }
        return null;
    }, [setScores, notifyServerPull]);

    // ── PUSH ONE GAME: Uses REFS — works even from stale closures ──
    const syncScoreToServer = useCallback(async (
        roundIdx: number, gameIdx: number, s1Val: string, s2Val: string
    ) => {
        // Read from REFS, not closure — immune to stale FlatList cells
        const sid = sessionIdRef.current;
        const code = shareCodeRef.current;
        if (!sid || !code) return;

        // Protect these keys from being overwritten by the poll. The release is
        // scheduled AFTER the round trip below (#1) — a fixed timer started here
        // could (and did) lapse mid-write and revert a just-typed score.
        const key1 = `${roundIdx}_${gameIdx}_t1`;
        const key2 = `${roundIdx}_${gameIdx}_t2`;
        const seq1 = protectKey(key1);
        const seq2 = protectKey(key2);
        pendingRef.current.add(key1);
        pendingRef.current.add(key2);
        markUnsynced([key1, key2]);

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

        // Round trip is done — hold the protection for one more poll interval so
        // a poll that was already in flight can't flip the cell back.
        releaseKey(key1, seq1, PROTECTION_RELEASE_SLACK);
        releaseKey(key2, seq2, PROTECTION_RELEASE_SLACK);

        if (result.status !== 'success') {
            console.error(`⚠️ SYNC FAILED for game ${roundIdx}_${gameIdx}: ${result.message}`);
            // stays in unsyncedRef → surfaced in the LIVE bar, healed next poll
            refreshUnsyncedCount();
        } else {
            clearUnsynced([key1, key2]);
            lastSyncedAtRef.current = Date.now();
        }
    }, [fetchWithRetry, protectKey, releaseKey, markUnsynced, clearUnsynced, refreshUnsyncedCount]); // NO sessionId/shareCode deps — uses refs

    // ── Track server schedule hash to detect changes ──────────
    const serverScheduleHashRef = useRef<string>('');
    // #6 — the server's last score-reset stamp (and schedule version) as we last
    // saw them. Seeded at join/resume so a reset that happened BEFORE we arrived
    // is never mistaken for a new one.
    const lastScoresResetAtRef = useRef<string | null>(null);
    const scoresResetSeededRef = useRef(false);
    const lastScheduleVersionRef = useRef<string | null>(null);

    /**
     * Record the server's reset marker without treating it as new. Returns
     * whether the field was present at all (absent = older API).
     */
    const seedResetMarker = useCallback((data: any): boolean => {
        const hasField = !!data && Object.prototype.hasOwnProperty.call(data, 'scores_reset_at');
        if (hasField) {
            lastScoresResetAtRef.current = data.scores_reset_at == null ? '' : String(data.scores_reset_at);
            scoresResetSeededRef.current = true;
        }
        if (data && Object.prototype.hasOwnProperty.call(data, 'schedule_version')) {
            lastScheduleVersionRef.current = data.schedule_version == null ? '' : String(data.schedule_version);
        }
        return hasField;
    }, []);

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
                setPollFailing(false);
                lastSyncedAtRef.current = Date.now();

                // ── #6: has the server WIPED the scores since we last looked? ──
                // Only a real shuffle does that, and only then may we destroy
                // local work. Fields absent (older API) → V5 behaviour.
                const hasResetField = Object.prototype.hasOwnProperty.call(data, 'scores_reset_at');
                let resetIsNew = false;
                if (hasResetField) {
                    const val = data.scores_reset_at == null ? '' : String(data.scores_reset_at);
                    if (!scoresResetSeededRef.current) {
                        scoresResetSeededRef.current = true;
                        lastScoresResetAtRef.current = val; // first sighting — not a new reset
                    } else if (shouldReplaceScoresOnScheduleChange(true, val, lastScoresResetAtRef.current)) {
                        resetIsNew = true;
                        lastScoresResetAtRef.current = val;
                    }
                }
                if (Object.prototype.hasOwnProperty.call(data, 'schedule_version')) {
                    lastScheduleVersionRef.current = data.schedule_version == null ? '' : String(data.schedule_version);
                }

                // ── Sync schedule from server — COLLABORATORS ONLY ──────
                // The host is authoritative for matchups: adopting its own pushes
                // back from the server caused a replace loop that stole input
                // focus mid-typing. Collaborators adopt host shuffles/swaps.
                // UAT C-H5: when a new schedule is adopted after a SHUFFLE the
                // server's scores for it REPLACE local ones (a host shuffle
                // clears them server-side; the old merge kept the stale scores
                // and self-healed them straight back onto the new pairings).
                // UAT 2026-09-04 (#6): a swap / rename / added playoff round is
                // NOT a shuffle — the server keeps its scores, so we merge.
                let scheduleAdoptedThisPoll = false;
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
                        setSchedule(normalizeSchedule(data.schedule));
                        setToastMessage('Matchups updated by host');
                        scheduleAdoptedThisPoll = true;
                    }
                }

                // CONVERGENCE GUARD (#7): a collaborator's pairings must always
                // end up matching the server's. joinAndSync adopts them, but the
                // screen's own schedule restore (nav data / AsyncStorage) can land
                // afterwards and quietly put the stale pairings back — and because
                // the server hash was already seeded, no later poll would notice.
                // Compare against what is actually on screen, not just the last
                // hash, and re-adopt silently (no toast, never a score wipe).
                if (!scheduleAdoptedThisPoll && setSchedule && isCollaboratorRef.current
                    && Array.isArray(data.schedule) && data.schedule.length > 0) {
                    if (scheduleSignature(scheduleRef.current) !== scheduleSignature(data.schedule)) {
                        console.log('📋 Collaborator matchups drifted from the host — re-adopting');
                        setSchedule(normalizeSchedule(data.schedule));
                    }
                }

                // Build the server's current view of every game's scores
                const serverState = buildServerState(data.updates);

                // A destructive replace happens ONLY on a real score reset. With
                // an older server (no scores_reset_at) any schedule change still
                // replaces, exactly as V5 did.
                const wipeLocalScores = scheduleAdoptedThisPoll
                    ? (hasResetField ? resetIsNew : true)
                    : (hasResetField && resetIsNew);

                if (wipeLocalScores) {
                    // Full replace with what the server holds for the NEW
                    // schedule (nothing, after a shuffle). No merge, no
                    // self-heal this cycle — the old scores belong to
                    // pairings that no longer exist.
                    const replacement: { [key: string]: string } = {};
                    for (const [key, val] of Object.entries(serverState)) {
                        if (val !== '') replacement[key] = val;
                    }
                    localUpdatesRef.current.clear();
                    pendingRef.current.clear();
                    unsyncedRef.current.clear();
                    refreshUnsyncedCount();
                    setScores(replacement);
                    notifyServerPull();
                    try { onScheduleAdoptedRef.current?.(replacement); } catch {}
                    pollFailuresRef.current = 0;
                    return;
                }

                // ── MERGE server → local ────────────────────────────────
                // A key present in serverState with '' means somebody ERASED
                // that score, and the erase has to reach every device. This
                // used to skip empties entirely (`serverVal !== ''`), so a
                // score deleted on one phone stayed on all the others — and
                // the self-heal below then pushed it straight back, undoing
                // the delete for everyone. (UAT 2026-09-04)
                //
                // A key this device typed but the server has not confirmed yet
                // stays untouched, so a slow or failed sync is never blanked.
                const current = scoresRef.current;
                const { changes, confirmed } = computeMergeChanges(
                    current, serverState, localUpdatesRef.current, pendingRef.current
                );
                for (const key of confirmed) {
                    pendingRef.current.delete(key);
                    unsyncedRef.current.delete(key);
                }
                if (Object.keys(changes).length > 0) {
                    // Functional setState — MERGES, never overwrites local edits
                    setScores(prev => ({ ...prev, ...changes }));
                    setToastMessage('Scores updated from collaborator');
                }
                notifyServerPull();
                if (scheduleAdoptedThisPoll) {
                    // #6: the pairings moved but the scores survived — let the
                    // screen persist the merged copy, and DON'T return early:
                    // self-heal below still has to re-push local-only values.
                    try { onScheduleAdoptedRef.current?.({ ...scoresRef.current, ...changes }); } catch {}
                }

                // ── SELF-HEAL local → server ────────────────────────────
                // Any local score the server is missing (offline typing, a sync
                // that exhausted its retries) gets re-pushed, a few games per
                // poll. This guarantees both sides converge — no lost scores.
                const gamesToHeal = computeGamesToHeal(
                    scoresRef.current, serverState, localUpdatesRef.current, pendingRef.current
                );
                for (const gameKey of gamesToHeal) {
                    const [r, g] = gameKey.split('_').map(Number);
                    const s1 = scoresRef.current[`${r}_${g}_t1`] || '';
                    const s2 = scoresRef.current[`${r}_${g}_t2`] || '';
                    console.log(`🩹 Self-heal: re-pushing game ${gameKey} (${s1}-${s2})`);
                    syncScoreToServer(r, g, s1, s2);
                }
                refreshUnsyncedCount();
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
            setPollFailing(true);
            console.error('Poll failed:', err);
        }
    }, [setScores, setSchedule, syncScoreToServer, refreshUnsyncedCount, notifyServerPull]);

    // ── LIFECYCLE: Start polling after initial sync ──────────────
    // Self-scheduling loop with exponential backoff: polls every POLL_INTERVAL
    // while healthy, but backs off (up to MAX_POLL_INTERVAL) on consecutive
    // failures so a flaky network / down server doesn't hammer at 2s forever.
    //
    // The loop is driven through a REF and the effect no longer depends on
    // pollForUpdates. It used to: pollForUpdates is rebuilt whenever setScores /
    // setSchedule change identity, so the effect tore the timer down and
    // rescheduled it with a FULL delay on every render — while anything
    // re-rendered faster than POLL_INTERVAL (typing, a toast, the connected
    // count) the poll could be starved and never fire, with the LIVE banner
    // still showing "connected". (UAT 2026-09-04 — found live.)
    const pollForUpdatesRef = useRef(pollForUpdates);
    useEffect(() => { pollForUpdatesRef.current = pollForUpdates; }, [pollForUpdates]);

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
                try { await pollForUpdatesRef.current(); } catch (e) { console.error('Poll loop error:', e); }
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
    }, [sessionId, shareCode, initialSyncDone]);

    // Reset when session changes
    useEffect(() => {
        if (!sessionId || !shareCode) {
            setInitialSyncDone(false);
            serverScheduleHashRef.current = '';
            lastScoresResetAtRef.current = null;
            scoresResetSeededRef.current = false;
            lastScheduleVersionRef.current = null;
        }
    }, [sessionId, shareCode]);

    // ── INITIAL SYNC RETRY (#13) ────────────────────────────────
    // A join/resume that failed used to leave initialSyncDone false forever:
    // polling never started, the banner still looked connected, and the user
    // kept scoring into a void. Now it retries with backoff and, when it keeps
    // failing, connectionState goes to 'offline' so the screen can say so.
    const initialSyncRunnerRef = useRef<null | (() => Promise<boolean>)>(null);
    const initialSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialSyncAttemptsRef = useRef(0);

    const scheduleInitialSyncRetry = useCallback(function scheduleRetry() {
        if (sessionOverRef.current || initialSyncDoneRef.current) return;
        if (initialSyncTimerRef.current) return;
        if (initialSyncAttemptsRef.current >= MAX_INITIAL_SYNC_RETRIES) return;
        const attempt = initialSyncAttemptsRef.current++;
        const delay = Math.min(POLL_INTERVAL * Math.pow(2, attempt), MAX_POLL_INTERVAL);
        console.warn(`🔄 Live sync failed — retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_INITIAL_SYNC_RETRIES})`);
        initialSyncTimerRef.current = setTimeout(async () => {
            initialSyncTimerRef.current = null;
            const runner = initialSyncRunnerRef.current;
            if (!runner || sessionOverRef.current || initialSyncDoneRef.current) return;
            let ok = false;
            try { ok = await runner(); } catch { ok = false; }
            if (ok) {
                initialSyncAttemptsRef.current = 0;
                setInitialSyncFailed(false);
            } else {
                scheduleRetry();
            }
        }, delay);
    }, []);

    useEffect(() => () => {
        if (initialSyncTimerRef.current) {
            clearTimeout(initialSyncTimerRef.current);
            initialSyncTimerRef.current = null;
        }
    }, []);

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
                setInitialSyncFailed(false);
                initialSyncAttemptsRef.current = 0;
                lastSyncedAtRef.current = Date.now();

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
    // #7: adopt the server's authoritative schedule AND seed the hash — the
    // schedule that came back with the join POST can already be stale (a host
    // shuffle between the POST and the first poll used to be swallowed forever,
    // leaving the joiner scoring against pairings nobody else had).
    // #4: a full replace happens ONLY on a genuine first join. Coming back via
    // the LIVE tab remounts the screen and re-runs the join effect — replacing
    // there wiped every score the server had never received.
    const joinSessionOnce = useCallback(async (code: string): Promise<{ [key: string]: string } | null> => {
        console.log('🔗 Unit B joining session, pulling scores...');
        try {
            const userId = await AsyncStorage.getItem('user_id') || '';
            const res = await fetch(
                `${API_URL}/collab_get_scores.php?share_code=${code}&since=0&user_id=${userId}`
            );
            const data = await res.json();

            if (!data || data.status !== 'success') {
                if (data && /not found|expired/i.test(data.message || '')) {
                    sessionOverRef.current = true;
                    setSessionExpired(true);
                }
                return null;
            }
            if (data.session_status === 'finished') {
                sessionOverRef.current = true;
                setFinishedGroupName(data.group_name || null);
                setFinishedSessionId(data.saved_session_id ? String(data.saved_session_id) : null);
                setMatchFinishedByRemote(true);
                return null;
            }

            setConnectedUsers(data.connected_users || 0);

            // Adopt the AUTHORITATIVE schedule and seed the hash so the first
            // poll doesn't have to (and can't miss the change). (#7)
            if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
                serverScheduleHashRef.current = JSON.stringify(data.schedule);
                if (setSchedule) setSchedule(normalizeSchedule(data.schedule));
            }
            seedResetMarker(data);

            const serverScores = buildNonEmptyServerScores(data.updates);

            // Was this device already in this session? (survives a remount)
            const markerKey = `${JOINED_SESSION_PREFIX}${code}`;
            let firstJoin = true;
            try { firstJoin = !(await AsyncStorage.getItem(markerKey)); } catch {}

            let effective: { [key: string]: string };
            if (firstJoin) {
                // Genuine first join — the server is the whole truth.
                setScores(serverScores);
                effective = serverScores;
                console.log(`📥 Joined: pulled ${Object.keys(serverScores).length} values from server`);
            } else {
                // Re-join (LIVE tab round trip / remount): MERGE, then re-push
                // whatever the server never received — same as the owner path.
                const merged = { ...scoresRef.current, ...serverScores };
                setScores(prev => ({ ...prev, ...serverScores }));
                effective = merged;
                const missing = computeMissingOnServer(merged, serverScores);
                if (Object.keys(missing).length > 0) {
                    console.log(`🩹 Re-join heal: pushing ${Object.keys(missing).length} local values to server`);
                    await pushAllScoresToServer(code, sessionIdRef.current || '', missing);
                }
            }
            notifyServerPull();
            try { await AsyncStorage.setItem(markerKey, String(Date.now())); } catch {}

            setInitialSyncDone(true);
            setInitialSyncFailed(false);
            initialSyncAttemptsRef.current = 0;
            lastSyncedAtRef.current = Date.now();
            return effective;
        } catch (err) {
            console.error('Join sync failed:', err);
            return null;
        }
    }, [setSchedule, setScores, scoresRef, pushAllScoresToServer, seedResetMarker, notifyServerPull]);

    const joinAndSync = useCallback(async (code: string): Promise<{ [key: string]: string } | null> => {
        initialSyncRunnerRef.current = async () => !!(await joinSessionOnce(code));
        const result = await joinSessionOnce(code);
        if (!result && !sessionOverRef.current) {
            setInitialSyncFailed(true);
            scheduleInitialSyncRetry(); // #13 — never silently stop trying
        }
        return result;
    }, [joinSessionOnce, scheduleInitialSyncRetry]);

    // ── RESUME SESSION (Unit A returning to their own live match) ──
    // The creator left the screen (LIVE tab round-trip, app relaunch) and is
    // back. Reconnect without losing anything: keep the schedule THEY hold,
    // MERGE server scores over local (never blanking local values), and re-push
    // anything the server is missing. Then polling resumes.
    const resumeOwnerSessionOnce = useCallback(async (code: string): Promise<boolean> => {
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
            seedResetMarker(data);

            // ── SCHEDULE (#18) ──────────────────────────────────────
            // The HOST is authoritative for matchups. Adopting the server's copy
            // unconditionally reverted pairings the host had shuffled while
            // offline while KEEPING the new scores at the same indices — silently
            // re-attributing every score to different players. So: re-push ours
            // when they differ, and only adopt the server's when we have none.
            if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
                const serverScheduleStr = JSON.stringify(data.schedule);
                const localSchedule = scheduleRef.current;
                const hasLocal = Array.isArray(localSchedule) && localSchedule.length > 0;
                if (!hasLocal) {
                    // No local schedule (cold relaunch) — the server's copy IS
                    // the host's own last push. Adopt it.
                    serverScheduleHashRef.current = serverScheduleStr;
                    if (setSchedule) setSchedule(normalizeSchedule(data.schedule));
                } else if (scheduleSignature(localSchedule) !== scheduleSignature(data.schedule)) {
                    // Compared by SIGNATURE: raw JSON always differs (generated
                    // ids), which would re-push on every single resume.
                    console.log('📤 Owner resume: local matchups differ — re-pushing host schedule');
                    serverScheduleHashRef.current = JSON.stringify(localSchedule);
                    schedulePushRef.current?.(localSchedule);
                } else {
                    serverScheduleHashRef.current = serverScheduleStr;
                }
            }

            // MERGE server scores over local (server values win; blanks never do)
            const serverScores = buildNonEmptyServerScores(data.updates);
            setScores(prev => ({ ...prev, ...serverScores }));
            notifyServerPull();

            // Re-push anything local the server is missing (self-heal on arrival)
            const merged = { ...scoresRef.current, ...serverScores };
            const missing = computeMissingOnServer(merged, serverScores);
            if (Object.keys(missing).length > 0) {
                console.log(`🩹 Resume heal: pushing ${Object.keys(missing).length} local values to server`);
                await pushAllScoresToServer(code, sessionIdRef.current || '', missing);
            }

            setInitialSyncDone(true); // polling resumes
            setInitialSyncFailed(false);
            initialSyncAttemptsRef.current = 0;
            lastSyncedAtRef.current = Date.now();
            console.log('✅ Owner reconnected to live session');
            return true;
        } catch (err) {
            console.error('Owner resume failed:', err);
            return false;
        }
    }, [setSchedule, setScores, scoresRef, pushAllScoresToServer, seedResetMarker, notifyServerPull]);

    const resumeOwnerSession = useCallback(async (code: string): Promise<boolean> => {
        initialSyncRunnerRef.current = () => resumeOwnerSessionOnce(code);
        const ok = await resumeOwnerSessionOnce(code);
        if (!ok && !sessionOverRef.current) {
            setInitialSyncFailed(true);
            scheduleInitialSyncRetry(); // #13
        }
        return ok;
    }, [resumeOwnerSessionOnce, scheduleInitialSyncRetry]);

    // ── PUSH SCHEDULE UPDATE (Unit A after shuffle/swap) ─────────
    // UAT C-H5: options.resetScores=true (host shuffle) tells the server to
    // wipe the session's scores along with the schedule, so the next poll
    // cannot re-apply old scores to the new pairings.
    const pushScheduleToServerNow = useCallback(async (scheduleData: any[], options?: { resetScores?: boolean }) => {
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
                    schedule: scheduleData,
                    ...(options?.resetScores ? { reset_scores: true } : {})
                })
            });
            console.log(options?.resetScores ? '📤 Pushed updated schedule to server (scores reset)' : '📤 Pushed updated schedule to server');
        } catch (err) {
            console.error('Push schedule failed:', err);
        }
    }, [fetchWithRetry]);

    // #6 — debounced: renaming a player fires a schedule change per keystroke,
    // which used to be one full schedule POST each. Coalesced into one push;
    // a resetScores flag set by ANY of the coalesced calls survives.
    const schedulePushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const schedulePushPayloadRef = useRef<{ schedule: any[]; resetScores: boolean } | null>(null);
    const pushScheduleNowRef = useRef(pushScheduleToServerNow);
    useEffect(() => { pushScheduleNowRef.current = pushScheduleToServerNow; }, [pushScheduleToServerNow]);

    const flushSchedulePush = useCallback(() => {
        if (schedulePushTimerRef.current) {
            clearTimeout(schedulePushTimerRef.current);
            schedulePushTimerRef.current = null;
        }
        const payload = schedulePushPayloadRef.current;
        schedulePushPayloadRef.current = null;
        if (payload) {
            pushScheduleNowRef.current(payload.schedule, { resetScores: payload.resetScores });
        }
    }, []);

    const pushScheduleToServer = useCallback((scheduleData: any[], options?: { resetScores?: boolean }) => {
        schedulePushPayloadRef.current = {
            schedule: scheduleData,
            resetScores: !!(schedulePushPayloadRef.current?.resetScores || options?.resetScores),
        };
        if (schedulePushTimerRef.current) clearTimeout(schedulePushTimerRef.current);
        schedulePushTimerRef.current = setTimeout(() => {
            schedulePushTimerRef.current = null;
            const payload = schedulePushPayloadRef.current;
            schedulePushPayloadRef.current = null;
            if (payload) pushScheduleNowRef.current(payload.schedule, { resetScores: payload.resetScores });
        }, SCHEDULE_PUSH_DEBOUNCE);
    }, []);

    // Wire the bridge ref declared at the top (resumeOwnerSession uses it).
    useEffect(() => { schedulePushRef.current = pushScheduleToServer; }, [pushScheduleToServer]);

    // Never drop a pending schedule push on the way out (rename → leave screen).
    useEffect(() => () => { flushSchedulePush(); }, [flushSchedulePush]);

    const dismissToast = useCallback(() => {
        setToastMessage(null);
    }, []);

    const clearMatchFinished = useCallback(() => {
        setMatchFinishedByRemote(false);
        setFinishedGroupName(null);
        setFinishedSessionId(null);
    }, []);

    /**
     * #4 — forget the "already joined" marker for a code. Called on a conclusive
     * teardown so a later join of the SAME code starts clean (full replace).
     */
    const forgetJoinedSession = useCallback(async (code?: string | null) => {
        const target = code || shareCodeRef.current;
        if (!target) return;
        try { await AsyncStorage.removeItem(`${JOINED_SESSION_PREFIX}${target}`); } catch {}
    }, []);

    const connectionState: CollabConnectionState =
        sessionExpired ? 'expired'
        : matchFinishedByRemote ? 'finished'
        : (!sessionId || !shareCode) ? 'idle'
        : !initialSyncDone ? (initialSyncFailed ? 'offline' : 'connecting')
        : (pollFailing ? 'reconnecting' : 'live');

    return {
        syncScoreToServer,
        markLocalEdit,            // #5 — protect on keystroke
        createCollabSession,
        joinAndSync,
        resumeOwnerSession,
        pushScheduleToServer,     // debounced (#6)
        pushScheduleToServerNow,  // immediate escape hatch
        flushSchedulePush,
        pullAllScoresFromServer,
        forgetJoinedSession,
        isSyncing,
        connectedUsers,
        toastMessage,
        dismissToast,
        initialSyncDone,
        initialSyncFailed,
        connectionState,
        unsyncedCount,
        lastSyncedAtRef,
        matchFinishedByRemote,
        finishedGroupName,
        finishedSessionId,
        clearMatchFinished,
        sessionExpired
    };
};
