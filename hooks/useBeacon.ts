import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'https://playpbnow.com/api';
// Shared beacon API — used by both DinkConnections and PlayPBNow.
// Must be an ABSOLUTE URL: relative URLs fail outright in React Native fetch,
// and on web they resolve against playpbnow.com which does not serve /shared/.
// dinkconnections.com hosts the working copy (CORS allows any origin);
// the peoplestar.com/shared copy is broken (missing db_connect include).
const SHARED_BEACON_URL = 'https://playpbnow.com/shared/beacon/api';

// ---------------------------------------------------------------------------
// H2: server dates.
// The PHP API returns DATETIMEs as 'YYYY-MM-DD HH:MM:SS' in America/Los_Angeles
// wall-clock time. `new Date('2026-09-04 18:30:00')` is Invalid Date on
// Safari/WebKit, and on every other engine it is parsed in the DEVICE zone —
// so beacons vanished on web Safari and ran early/late for travellers.
// Every endpoint now also sends `<field>_iso` (ISO-8601 with offset) and
// `expires_in_sec`; these helpers prefer those and fall back to treating the
// bare string as LA time. They never return NaN for a well-formed input.
// ---------------------------------------------------------------------------
const MYSQL_DT_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Milliseconds by which America/Los_Angeles is offset from UTC at `utcMs`. */
function laOffsetMs(utcMs: number): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = dtf.formatToParts(new Date(utcMs));
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return asUtc - utcMs;
  } catch {
    // No Intl time-zone data (very old engines): PDT Mar–Nov, PST otherwise.
    const m = new Date(utcMs).getUTCMonth();
    return (m >= 2 && m <= 10 ? -7 : -8) * 3600000;
  }
}

/**
 * Parse any date string the API can produce. ISO-8601 (with offset or Z)
 * parses natively; a bare MySQL DATETIME is interpreted as LA wall time.
 * Returns NaN only for garbage input.
 */
export function parseServerDate(value?: string | null): number {
  if (!value) return NaN;
  const s = String(value).trim();
  const m = MYSQL_DT_RE.exec(s);
  if (m) {
    const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
    // guess is the wall-clock reading as if it were UTC; shift by LA's offset
    // (computed at the guess — DST edge hours can be off by 1h, never invalid).
    return guess - laOffsetMs(guess);
  }
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/** Epoch ms when a beacon expires — prefers the ISO field, then the seconds countdown. */
export function beaconExpiryMs(b: {
  expires_at?: string | null;
  expires_at_iso?: string | null;
  expires_in_sec?: number | null;
  fetched_at?: number;
}): number {
  const iso = b.expires_at_iso ? parseServerDate(b.expires_at_iso) : NaN;
  if (!Number.isNaN(iso)) return iso;
  if (typeof b.expires_in_sec === 'number' && Number.isFinite(b.expires_in_sec)) {
    return (b.fetched_at || Date.now()) + b.expires_in_sec * 1000;
  }
  return parseServerDate(b.expires_at);
}

/** Epoch ms when a beacon was created — prefers the ISO field. */
export function beaconCreatedMs(b: { created_at?: string | null; created_at_iso?: string | null }): number {
  const iso = b.created_at_iso ? parseServerDate(b.created_at_iso) : NaN;
  if (!Number.isNaN(iso)) return iso;
  return parseServerDate(b.created_at);
}

/**
 * M2: casual (shared DB) and structured (PlayPBNow DB) beacons have
 * independent auto-increment ids, so `id` alone collides across the two feeds.
 * Use this for React keys and identity comparisons.
 */
export function beaconUid(b: { beacon_type?: string; id: number | string }): string {
  return `${b.beacon_type || 'structured'}:${b.id}`;
}

// ---------------------------------------------------------------------------
// C4: lobby session persistence. The lobby id used to live only in React
// state, so a restart / tab switch / GPS fix lost the lobby. The screen saves
// {lobbyId, beaconId, view} here on create/join/accept and resumes on focus.
// ---------------------------------------------------------------------------
export const BEACON_LOBBY_SESSION_KEY = 'beacon_lobby_session';
export interface LobbySession {
  lobbyId: number;
  beaconId: number | null;
  view: 'lobby' | 'locked';
  savedAt: number;
}
export async function saveLobbySession(s: Omit<LobbySession, 'savedAt'>): Promise<void> {
  try {
    await AsyncStorage.setItem(BEACON_LOBBY_SESSION_KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch {}
}
export async function loadLobbySession(): Promise<LobbySession | null> {
  try {
    const raw = await AsyncStorage.getItem(BEACON_LOBBY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.lobbyId !== 'number') return null;
    // Anything older than 12h is stale by definition (beacons max out at hours).
    if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > 12 * 3600000) return null;
    return parsed as LobbySession;
  } catch {
    return null;
  }
}
export async function clearLobbySession(): Promise<void> {
  try { await AsyncStorage.removeItem(BEACON_LOBBY_SESSION_KEY); } catch {}
}

export interface BeaconResponse {
  user_id: string;
  first_name: string;
  responder_name?: string;
  response_type: 'on_my_way' | 'interested';
  created_at: string;
}

export interface Beacon {
  id: number;
  user_id: string;
  beacon_type: 'casual' | 'structured';
  court_id: number;
  court_name: string;
  court_city?: string;
  court_state?: string;
  court_lat?: number;
  court_lng?: number;
  player_count: number;
  skill_level: string | null;
  message: string | null;
  creator_name: string;
  creator_photo?: string | null;
  app_id?: string;
  status: string;
  expires_at: string;
  created_at: string;
  reliability_pct: number;
  is_mine: boolean;
  chat_count: number;
  needs_replacement: boolean;
  replacement_info: {
    request_id: number;
    lobby_id: number;
    departing_name: string;
    departing_user_id: string;
    target_players: number;
  } | null;
  // Location fields
  distance_miles?: number;
  // Casual mode fields
  response_count: number;
  responses: BeaconResponse[];
  user_responded: boolean;
  // Structured mode fields
  active_lobby_id: number | null;
  lobby_member_count: number;
  active_lobby_status?: 'gathering' | 'locked' | null;
  active_lobby_target_players?: number | null;
  i_am_in_lobby?: boolean;
  // Shared API fields
  message_count?: number;
  my_response?: string | null;
  // H2: ISO-8601 + countdown fields (server-added; old fields still present)
  expires_at_iso?: string | null;
  created_at_iso?: string | null;
  expires_in_sec?: number | null;
  /** Client-stamped Date.now() when this row was fetched (for expires_in_sec). */
  fetched_at?: number;
  /** M2: `${beacon_type}:${id}` — unique across the two feeds. */
  uid?: string;
  // History-only (L3)
  lobby_status?: string | null;
  was_started?: boolean;
}

export interface LobbyMember {
  id: number;
  user_id: string;
  player_id: number | null;
  first_name: string;
  last_name: string;
  gender: string;
  status: 'joined' | 'confirmed' | 'left' | 'seeking_replacement' | 'replaced';
  reliability_pct: number | null;
}

export interface Lobby {
  id: number;
  beacon_id: number;
  host_user_id: string;
  court_id: number;
  court_name: string;
  status: 'gathering' | 'locked' | 'started' | 'completed' | 'cancelled';
  target_players: number;
  schedule_json: any[] | null;
  match_quality_percent: number | null;
  session_code: string | null;
  collab_session_id: number | null;
  created_at: string;
  // Additions (server-provided; optional so older payloads still type-check)
  created_at_iso?: string | null;
  beacon_status?: 'active' | 'expired' | 'cancelled' | null;
  beacon_expires_at?: string | null;
  beacon_expires_at_iso?: string | null;
  beacon_expires_in_sec?: number | null;
  active_member_count?: number;
  /** True when create_lobby returned an already-open lobby (idempotent path). */
  existing?: boolean;
}

export interface ReplacementRequest {
  id: number;
  lobby_id: number;
  departing_member_id: number;
  departing_user_id: string;
  replacement_user_id: string | null;
  replacement_member_id: number | null;
  status: 'open' | 'filled' | 'cancelled' | 'expired';
  created_at: string;
  filled_at: string | null;
  departing_first_name: string;
  departing_last_name: string;
}

export interface LobbyPollResult {
  lobby: Lobby;
  members: LobbyMember[];
  replacement_requests: ReplacementRequest[];
  confirmed_count: number;
  all_confirmed: boolean;
}

export interface Court {
  id: number;
  name: string;
  city?: string;
  state?: string;
}

// Helper to get user info from AsyncStorage
async function getUserInfo() {
  const [userId, firstName, lastName] = await Promise.all([
    AsyncStorage.getItem('user_id'),
    AsyncStorage.getItem('user_first_name'),
    AsyncStorage.getItem('user_last_name'),
  ]);
  return {
    userId: userId || '',
    userName: [firstName || '', lastName || ''].join(' ').trim() || 'Player',
  };
}

export function useBeacon() {
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [history, setHistory] = useState<Beacon[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [allConfirmed, setAllConfirmed] = useState(false);
  const [replacementRequests, setReplacementRequests] = useState<ReplacementRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getUserId = async () => {
    return await AsyncStorage.getItem('user_id') || '';
  };

  // --- Create/Update Beacon (SHARED API) ---
  const createBeacon = useCallback(async (
    courtId: number,
    playerCount: number,
    skillLevel?: string,
    message?: string,
    durationMinutes: number = 60,
    beaconType: 'casual' | 'structured' = 'structured',
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { userId, userName } = await getUserInfo();

      if (beaconType === 'structured') {
        // Structured beacons still use PlayPBNow's own backend (lobby system)
        const res = await fetch(`${API_URL}/beacon_upsert.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            beacon_type: beaconType,
            court_id: courtId,
            player_count: playerCount,
            skill_level: skillLevel || null,
            message: message || null,
            duration_minutes: durationMinutes,
          }),
        });
        const data = await res.json();
        if (data.status === 'success') return data.beacon;
        setError(data.message || 'Failed to create beacon');
        return null;
      }

      // Casual beacons use the shared API (visible across all apps)
      const res = await fetch(`${SHARED_BEACON_URL}/create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          court_id: courtId,
          skill_level: skillLevel || null,
          message: message || null,
          duration_minutes: durationMinutes,
          creator_name: userName,
          creator_photo: '',
          app_id: 'play_pb_now',
        }),
      });
      const data = await res.json();
      if (data.status === 'success') return data.beacon;
      setError(data.message || 'Failed to create beacon');
      return null;
    } catch (e) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Fetch Beacon Feed (SHARED API + PlayPBNow structured beacons) ---
  const fetchFeed = useCallback(async (courtId?: number, lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();

      // Fetch from shared beacon API (all cross-app casual beacons)
      const sharedBody: Record<string, any> = { user_id: parseInt(userId) || 0 };
      if (lat !== undefined && lng !== undefined) {
        sharedBody.lat = lat;
        sharedBody.lng = lng;
        // No radius filter — show all beacons to everyone for now
      }

      // NOTE: update_name.php does not exist on the shared beacon API — the old
      // best-effort call here 404'd on every feed fetch, so it was removed.
      // Own-beacon names are corrected client-side below via `userName`.

      const [sharedRes, localRes] = await Promise.all([
        fetch(`${SHARED_BEACON_URL}/feed.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sharedBody),
        }),
        // Also fetch structured beacons from PlayPBNow's own backend
        fetch(`${API_URL}/beacon_feed.php?user_id=${userId}&include_history=1${
          courtId ? `&court_id=${courtId}` : ''
        }${lat !== undefined ? `&lat=${lat}&lng=${lng}` : ''}`),
      ]);

      const sharedData = await sharedRes.json();
      const localData = await localRes.json();

      // Get the current user's name for overriding stale creator_name on own beacons
      const { userName } = await getUserInfo();

      // Merge beacons: shared casual + local structured
      const sharedBeacons: Beacon[] = (sharedData.beacons || []).map((b: any) => {
        const isMine = String(b.user_id) === userId;
        return {
          ...b,
          beacon_type: 'casual' as const,
          creator_name: isMine ? userName : (b.creator_name || 'Player'),
          reliability_pct: 100,
          is_mine: isMine,
          chat_count: b.message_count || 0,
          needs_replacement: false,
          replacement_info: null,
          responses: [],
          user_responded: !!b.my_response,
          active_lobby_id: null,
          lobby_member_count: 0,
        };
      });

      // Local structured beacons (from PlayPBNow backend)
      const localBeacons: Beacon[] = (localData.beacons || []).filter(
        (b: any) => b.beacon_type === 'structured'
      );

      // Filter out beacons whose expires_at has passed (don't trust API status alone)
      const now = Date.now();
      const activeBeacons = [...sharedBeacons, ...localBeacons].filter(
        (b) => new Date(b.expires_at).getTime() > now
      );

      // Sort by distance if available, else by created_at
      activeBeacons.sort((a, b) => {
        if (a.distance_miles != null && b.distance_miles != null) {
          return a.distance_miles - b.distance_miles;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setBeacons(activeBeacons);
      setCourts(localData.courts || []);

      // History: only show beacons expired within the last 4 hours
      const fourHoursAgo = now - (4 * 60 * 60 * 1000);
      const allHistory = [
        ...(sharedData.past_beacons || []).map((b: any) => ({
          ...b,
          beacon_type: 'casual' as const,
          creator_name: b.creator_name || 'Player',
          is_mine: String(b.user_id) === userId,
        })),
        ...(localData.history || []),
      ].filter((b) => new Date(b.expires_at || b.created_at).getTime() > fourHoursAgo);
      setHistory(allHistory);
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Cancel Beacon (SHARED API for casual, local for structured) ---
  const cancelBeacon = useCallback(async (beaconId: number) => {
    try {
      const userId = await getUserId();

      // Try shared API first (casual beacons), then local (structured)
      const sharedRes = await fetch(`${SHARED_BEACON_URL}/cancel.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beacon_id: beaconId, user_id: parseInt(userId) || 0 }),
      });
      const sharedData = await sharedRes.json();

      if (sharedData.status === 'success') {
        await fetchFeed();
        return true;
      }

      // Fallback to local API (structured beacons)
      const res = await fetch(`${API_URL}/beacon_cancel.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beacon_id: beaconId, user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchFeed();
        return true;
      }
      setError(data.message || 'Failed to cancel beacon');
      return false;
    } catch {
      setError('Network error');
      return false;
    }
  }, [fetchFeed]);

  // --- Extend Beacon (SHARED API for casual, local for structured) ---
  const extendBeacon = useCallback(async (beaconId: number, additionalMinutes: number) => {
    try {
      const userId = await getUserId();

      // Try shared API first
      const sharedRes = await fetch(`${SHARED_BEACON_URL}/extend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beacon_id: beaconId, user_id: parseInt(userId) || 0, extra_minutes: additionalMinutes }),
      });
      const sharedData = await sharedRes.json();

      if (sharedData.status === 'success') {
        await fetchFeed();
        return true;
      }

      // Fallback to local API
      const res = await fetch(`${API_URL}/beacon_extend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beacon_id: beaconId, user_id: userId, additional_minutes: additionalMinutes }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchFeed();
        return true;
      }
      setError(data.message || 'Failed to extend beacon');
      return false;
    } catch {
      setError('Network error');
      return false;
    }
  }, [fetchFeed]);

  // --- Create Lobby (PlayPBNow only — structured mode) ---
  const createLobby = useCallback(async (
    beaconId: number,
    targetPlayers: number,
    playerInfo: { player_id?: number; first_name: string; last_name: string; gender: string },
  ) => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_create_lobby.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beacon_id: beaconId,
          host_user_id: userId,
          target_players: targetPlayers,
          ...playerInfo,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLobby(data.lobby);
        return data.lobby;
      }
      setError(data.message || 'Failed to create lobby');
      return null;
    } catch (e) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Join Lobby (PlayPBNow only) ---
  const joinLobby = useCallback(async (
    lobbyId: number,
    playerInfo: { player_id?: number; first_name: string; last_name: string; gender: string },
  ) => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_join_lobby.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobby_id: lobbyId,
          user_id: userId,
          ...playerInfo,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') return data.member;
      setError(data.message || 'Failed to join lobby');
      return null;
    } catch (e) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Confirm in Lobby (PlayPBNow only) ---
  const confirmInLobby = useCallback(async (lobbyId: number) => {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_confirm.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_id: lobbyId, user_id: userId }),
      });
      const data = await res.json();
      return data.status === 'success';
    } catch {
      return false;
    }
  }, []);

  // --- Lock Lobby (PlayPBNow only, host only) ---
  const lockLobby = useCallback(async (lobbyId: number) => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_lock_lobby.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_id: lobbyId, host_user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLobby(prev => prev ? { ...prev, status: 'locked', schedule_json: data.schedule_json, match_quality_percent: data.match_quality_percent } : null);
        return data;
      }
      setError(data.message || 'Failed to lock lobby');
      return null;
    } catch (e) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Start Match (PlayPBNow only, host only) ---
  const startMatch = useCallback(async (lobbyId: number) => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_start_match.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_id: lobbyId, host_user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLobby(prev => prev ? { ...prev, status: 'started', session_code: data.session_code, collab_session_id: data.session_id } : null);
        return data;
      }
      setError(data.message || 'Failed to start match');
      return null;
    } catch (e) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Respond to casual beacon (SHARED API) ---
  const respondToBeacon = useCallback(async (beaconId: number, responseType: string = 'on_my_way') => {
    try {
      const { userId, userName } = await getUserInfo();

      // Try shared API first (casual beacons)
      const sharedRes = await fetch(`${SHARED_BEACON_URL}/respond.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beacon_id: beaconId,
          user_id: parseInt(userId) || 0,
          response_type: responseType,
          responder_name: userName,
          responder_photo: '',
        }),
      });
      const sharedData = await sharedRes.json();

      if (sharedData.status === 'success') {
        await fetchFeed();
        return true;
      }

      // Fallback to local API
      const res = await fetch(`${API_URL}/beacon_respond.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beacon_id: beaconId, user_id: userId, response_type: responseType }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchFeed();
        return true;
      }
      setError(data.message || 'Failed to respond');
      return false;
    } catch {
      setError('Network error');
      return false;
    }
  }, [fetchFeed]);

  // --- Unrespond from casual beacon (PlayPBNow local only for now) ---
  const unrespondToBeacon = useCallback(async (beaconId: number) => {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_unrespond.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beacon_id: beaconId, user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchFeed();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchFeed]);

  // --- Request Replacement (PlayPBNow only) ---
  const requestReplacement = useCallback(async (lobbyId: number) => {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_request_replacement.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_id: lobbyId, user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') return data.request_id as number;
      setError(data.message || 'Failed to request replacement');
      return null;
    } catch {
      setError('Network error');
      return null;
    }
  }, []);

  // --- Accept Replacement (PlayPBNow only) ---
  const acceptReplacement = useCallback(async (
    requestId: number,
    playerInfo: { player_id?: number; first_name: string; last_name: string; gender: string },
  ) => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_accept_replacement.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replacement_request_id: requestId,
          user_id: userId,
          ...playerInfo,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLobby(data.lobby);
        return data.member_id as number;
      }
      setError(data.message || 'Failed to accept replacement');
      return null;
    } catch {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Cancel Replacement (PlayPBNow only) ---
  const cancelReplacement = useCallback(async (requestId: number) => {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_cancel_replacement.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacement_request_id: requestId, user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') return true;
      setError(data.message || 'Failed to cancel replacement');
      return false;
    } catch {
      setError('Network error');
      return false;
    }
  }, []);

  // --- Poll Lobby (PlayPBNow only) ---
  const pollLobby = useCallback(async (lobbyId: number) => {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_lobby_poll.php?lobby_id=${lobbyId}&user_id=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setLobby(data.lobby);
        setMembers(data.members || []);
        setReplacementRequests(data.replacement_requests || []);
        setConfirmedCount(data.confirmed_count || 0);
        setAllConfirmed(data.all_confirmed || false);
        return data as LobbyPollResult;
      }
    } catch {
      // Silently fail on poll errors
    }
    return null;
  }, []);

  // --- Start/Stop Polling ---
  const startPolling = useCallback((lobbyId: number) => {
    stopPolling();
    pollLobby(lobbyId); // immediate first poll
    pollingRef.current = setInterval(() => pollLobby(lobbyId), 3000);
  }, [pollLobby]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // --- Reset State ---
  const reset = useCallback(() => {
    stopPolling();
    setLobby(null);
    setMembers([]);
    setReplacementRequests([]);
    setConfirmedCount(0);
    setAllConfirmed(false);
    setError(null);
  }, [stopPolling]);

  return {
    // State
    beacons, history, courts, lobby, members, confirmedCount, allConfirmed,
    replacementRequests, loading, error,
    // Actions
    createBeacon, fetchFeed, cancelBeacon, extendBeacon,
    createLobby, joinLobby, confirmInLobby,
    lockLobby, startMatch, pollLobby, startPolling, stopPolling, reset,
    requestReplacement, acceptReplacement, cancelReplacement,
    respondToBeacon, unrespondToBeacon,
    // Setters
    setLobby, setError,
  };
}
