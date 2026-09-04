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
  // Additions
  active_member_count?: number;
  beacon_status?: 'active' | 'expired' | 'cancelled' | null;
  beacon_expires_at?: string | null;
  beacon_expires_at_iso?: string | null;
  beacon_expires_in_sec?: number | null;
  my_status?: LobbyMember['status'] | null;
}

export interface Court {
  id: number;
  name: string;
  city?: string;
  state?: string;
  // M5 additions from get_courts.php
  address?: string | null;
  county?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/** The caller's own open lobby, as reported by beacon_feed.php (C4 resume). */
export interface MyLobbyInfo {
  id: number;
  status: 'gathering' | 'locked';
  beaconId: number | null;
  role: 'host' | 'member';
}

export interface MergedBeaconFeed {
  beacons: Beacon[];
  history: Beacon[];
  courts: Court[];
  myLobby: MyLobbyInfo | null;
  /** True when at least one of the two feeds answered. */
  ok: boolean;
}

/** Miles between two coordinates (haversine). */
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * H6: ONE merged fetch (shared casual feed + PlayPBNow structured feed) used
 * by both the Play Now screen and the background tab-badge check, so the two
 * can never disagree about what is active. Expired rows are filtered here.
 */
export async function fetchBeaconFeeds(opts: {
  userId: string;
  userName?: string;
  courtId?: number;
  lat?: number;
  lng?: number;
  includeHistory?: boolean;
}): Promise<MergedBeaconFeed> {
  const { userId, userName, courtId, lat, lng, includeHistory = true } = opts;
  const fetchedAt = Date.now();

  const sharedBody: Record<string, any> = { user_id: parseInt(userId) || 0 };
  if (lat !== undefined && lng !== undefined) {
    sharedBody.lat = lat;
    sharedBody.lng = lng;
    // No radius filter — show all beacons to everyone for now
  }

  const localUrl = `${API_URL}/beacon_feed.php?user_id=${encodeURIComponent(userId)}${
    includeHistory ? '&include_history=1' : ''
  }${courtId ? `&court_id=${courtId}` : ''}${lat !== undefined ? `&lat=${lat}&lng=${lng}` : ''}`;

  const [sharedRes, localRes] = await Promise.allSettled([
    fetch(`${SHARED_BEACON_URL}/feed.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sharedBody),
    }).then((r) => r.json()),
    fetch(localUrl).then((r) => r.json()),
  ]);

  const sharedData: any = sharedRes.status === 'fulfilled' ? sharedRes.value : null;
  const localData: any = localRes.status === 'fulfilled' ? localRes.value : null;
  const ok = !!sharedData || !!localData;

  const sharedBeacons: Beacon[] = ((sharedData && sharedData.beacons) || []).map((b: any) => {
    const isMine = String(b.user_id) === String(userId);
    // M13: pass the shared feed's responder list through instead of dropping it
    const responses: BeaconResponse[] = Array.isArray(b.responses)
      ? b.responses
      : Array.isArray(b.responders)
      ? b.responders
      : [];
    const row: Beacon = {
      ...b,
      beacon_type: 'casual' as const,
      creator_name: isMine && userName ? userName : (b.creator_name || 'Player'),
      reliability_pct: 100,
      is_mine: isMine,
      chat_count: b.message_count || 0,
      needs_replacement: false,
      replacement_info: null,
      responses,
      response_count: typeof b.response_count === 'number' ? b.response_count : responses.length,
      user_responded: !!b.my_response,
      active_lobby_id: null,
      lobby_member_count: 0,
      fetched_at: fetchedAt,
    };
    row.uid = beaconUid(row);
    return row;
  });

  const localBeacons: Beacon[] = ((localData && localData.beacons) || [])
    .filter((b: any) => b.beacon_type === 'structured')
    .map((b: any) => {
      const row: Beacon = { ...b, fetched_at: fetchedAt };
      row.uid = beaconUid(row);
      return row;
    });

  // Filter out beacons whose expires_at has passed (don't trust API status alone)
  const now = Date.now();
  const activeBeacons = [...sharedBeacons, ...localBeacons].filter((b) => {
    const exp = beaconExpiryMs(b);
    // Unparseable expiry: keep the row rather than silently hiding a live beacon
    return Number.isNaN(exp) ? true : exp > now;
  });

  // Client-side distance when the server didn't compute one but we know both ends
  if (lat !== undefined && lng !== undefined) {
    for (const b of activeBeacons) {
      if (b.distance_miles == null && b.court_lat != null && b.court_lng != null) {
        const d = distanceMiles(lat, lng, Number(b.court_lat), Number(b.court_lng));
        if (Number.isFinite(d)) b.distance_miles = Math.round(d * 10) / 10;
      }
    }
  }

  // M6: distance first (when known), then newest
  activeBeacons.sort((a, b) => {
    const ad = a.distance_miles != null ? Number(a.distance_miles) : null;
    const bd = b.distance_miles != null ? Number(b.distance_miles) : null;
    if (ad != null && bd != null && ad !== bd) return ad - bd;
    if (ad != null && bd == null) return -1;
    if (ad == null && bd != null) return 1;
    return (beaconCreatedMs(b) || 0) - (beaconCreatedMs(a) || 0);
  });

  // History: only show beacons expired within the last 4 hours
  const fourHoursAgo = now - 4 * 60 * 60 * 1000;
  const history: Beacon[] = includeHistory
    ? [
        ...(((sharedData && sharedData.past_beacons) || []) as any[]).map((b: any) => ({
          ...b,
          beacon_type: 'casual' as const,
          creator_name: b.creator_name || 'Player',
          is_mine: String(b.user_id) === String(userId),
          uid: beaconUid({ beacon_type: 'casual', id: b.id }),
        })),
        ...((((localData && localData.history) || []) as any[]).map((b: any) => ({
          ...b,
          uid: beaconUid({ beacon_type: b.beacon_type || 'structured', id: b.id }),
        }))),
      ].filter((b) => {
        const t = beaconExpiryMs(b);
        const c = beaconCreatedMs(b);
        const ref = !Number.isNaN(t) ? t : c;
        return Number.isNaN(ref) ? true : ref > fourHoursAgo;
      })
    : [];

  let myLobby: MyLobbyInfo | null = null;
  if (localData && typeof localData.my_lobby_id === 'number' && localData.my_lobby_id > 0) {
    myLobby = {
      id: localData.my_lobby_id,
      status: localData.my_lobby_status === 'locked' ? 'locked' : 'gathering',
      beaconId: typeof localData.my_lobby_beacon_id === 'number' ? localData.my_lobby_beacon_id : null,
      role: localData.my_lobby_role === 'host' ? 'host' : 'member',
    };
  }

  return {
    beacons: activeBeacons,
    history,
    courts: (localData && localData.courts) || [],
    myLobby,
    ok,
  };
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
  // C4: my open lobby per the last feed fetch (resume after restart/refocus)
  const [myLobby, setMyLobby] = useState<MyLobbyInfo | null>(null);
  // L2: real sync health instead of "Connected" forever
  const [lastPollOk, setLastPollOk] = useState<boolean | null>(null);
  const [lastPollAt, setLastPollAt] = useState<number>(0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeLobbyIdRef = useRef<number | null>(null);

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
      const { userId, userName } = await getUserInfo();

      // NOTE: update_name.php does not exist on the shared beacon API — the old
      // best-effort call here 404'd on every feed fetch, so it was removed.
      // Own-beacon names are corrected client-side via `userName`.

      // H6: the same merged fetch the background badge check uses
      const merged = await fetchBeaconFeeds({ userId, userName, courtId, lat, lng, includeHistory: true });
      if (!merged.ok) {
        setError('Network error');
        return;
      }

      setBeacons(merged.beacons);
      setCourts(merged.courts);
      setHistory(merged.history);
      setMyLobby(merged.myLobby);
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Cancel Beacon (SHARED API for casual, local for structured) ---
  // M1: when the beacon type is known we go straight to the right backend.
  // The original try-shared-then-local path is kept for callers that don't
  // pass a type.
  const cancelBeacon = useCallback(async (beaconId: number, beaconType?: 'casual' | 'structured') => {
    try {
      const userId = await getUserId();

      if (beaconType !== 'structured') {
        // Try shared API first (casual beacons), then local (structured)
        try {
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
          if (beaconType === 'casual') {
            setError(sharedData.message || 'Failed to cancel beacon');
            return false;
          }
        } catch (e) {
          // Shared API unreachable — a structured beacon can still be cancelled locally
          if (beaconType === 'casual') throw e;
        }
      }

      // Local API (structured beacons)
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
  const extendBeacon = useCallback(async (beaconId: number, additionalMinutes: number, beaconType?: 'casual' | 'structured') => {
    try {
      const userId = await getUserId();

      if (beaconType !== 'structured') {
        // Try shared API first
        try {
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
          if (beaconType === 'casual') {
            setError(sharedData.message || 'Failed to extend beacon');
            return false;
          }
        } catch (e) {
          if (beaconType === 'casual') throw e;
        }
      }

      // Local API
      const res = await fetch(`${API_URL}/beacon_extend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beacon_id: beaconId, user_id: userId, additional_minutes: additionalMinutes }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchFeed();
        // M7: keep the lobby countdown in step without waiting for the next poll
        if (data.beacon && lobby && lobby.beacon_id === beaconId) {
          setLobby((prev) => prev ? {
            ...prev,
            beacon_status: 'active',
            beacon_expires_at: data.beacon.expires_at ?? prev.beacon_expires_at,
            beacon_expires_at_iso: data.beacon.expires_at_iso ?? prev.beacon_expires_at_iso,
            beacon_expires_in_sec: data.beacon.expires_in_sec ?? prev.beacon_expires_in_sec,
          } : prev);
        }
        return true;
      }
      setError(data.message || 'Failed to extend beacon');
      return false;
    } catch {
      setError('Network error');
      return false;
    }
  }, [fetchFeed, lobby]);

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
        // C1/M8: the server now returns the beacon's EXISTING open lobby when
        // there is one (`existing: true`) instead of creating a duplicate.
        const lobbyRow: Lobby = { ...data.lobby, existing: !!data.existing };
        setLobby(lobbyRow);
        return lobbyRow;
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
  // Returns the member row. `already_member: true` on the result means the
  // caller was already in (the server no longer treats that as an error).
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
      if (data.status === 'success') {
        return data.member ? { ...data.member, already_member: !!data.already_member } : { already_member: !!data.already_member };
      }
      // Pre-fix servers answered "User already in this lobby" as an error —
      // still treat that as a resumable membership.
      if (typeof data.message === 'string' && /already in this lobby/i.test(data.message)) {
        return { already_member: true };
      }
      setError(data.message || 'Failed to join lobby');
      return null;
    } catch (e) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Leave Lobby (PlayPBNow only) — C3 ---
  // member -> marked 'left'; host -> lobby + beacon cancelled (server cascades).
  const leaveLobby = useCallback(async (lobbyId: number) => {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/beacon_leave_lobby.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_id: lobbyId, user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') return data as { status: 'success'; role: 'host' | 'member'; lobby_status: string };
      setError(data.message || 'Failed to leave lobby');
      return null;
    } catch {
      setError('Network error');
      return null;
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
        setLobby(prev => prev ? {
          ...prev,
          status: 'locked',
          schedule_json: data.schedule_json,
          match_quality_percent: data.match_quality_percent,
          // M7: server auto-extended the beacon on lock
          beacon_status: 'active',
          beacon_expires_at: data.beacon_expires_at ?? prev.beacon_expires_at,
          beacon_expires_at_iso: data.beacon_expires_at_iso ?? prev.beacon_expires_at_iso,
          beacon_expires_in_sec: data.beacon_expires_in_sec ?? prev.beacon_expires_in_sec,
        } : null);
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
  // M1: `beaconType` routes directly when known; untyped calls keep the
  // original shared-then-local behaviour.
  const respondToBeacon = useCallback(async (beaconId: number, responseType: string = 'on_my_way', beaconType?: 'casual' | 'structured') => {
    try {
      const { userId, userName } = await getUserInfo();

      if (beaconType !== 'structured') {
        // Try shared API first (casual beacons)
        try {
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
          if (beaconType === 'casual') {
            setError(sharedData.message || 'Failed to respond');
            return false;
          }
        } catch (e) {
          if (beaconType === 'casual') throw e;
        }
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

  // --- Unrespond from casual beacon ---
  // H3: casual responses live in the SHARED beacon DB, and the shared module
  // has no unrespond endpoint (no repo copy exists to add one to). We try the
  // shared path in case it ever appears, then the local one; when neither can
  // withdraw the response we say so honestly instead of silently failing.
  const unrespondToBeacon = useCallback(async (beaconId: number, beaconType?: 'casual' | 'structured') => {
    try {
      const userId = await getUserId();

      if (beaconType !== 'structured') {
        try {
          const sharedRes = await fetch(`${SHARED_BEACON_URL}/unrespond.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ beacon_id: beaconId, user_id: parseInt(userId) || 0 }),
          });
          if (sharedRes.ok) {
            const sharedData = await sharedRes.json().catch(() => null);
            if (sharedData && sharedData.status === 'success') {
              await fetchFeed();
              return true;
            }
          }
        } catch {
          // shared unrespond unavailable — fall through
        }
      }

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
      setError(
        beaconType === 'casual'
          ? "Can't undo yet — the shared beacon network doesn't support withdrawing a response. Let the host know in chat."
          : (data.message || 'Failed to withdraw response')
      );
      return false;
    } catch {
      setError('Network error');
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
        // Server decodes schedule_json now; tolerate an older server that sends a string
        const lobbyRow = { ...data.lobby };
        if (typeof lobbyRow.schedule_json === 'string') {
          try { lobbyRow.schedule_json = JSON.parse(lobbyRow.schedule_json); } catch { lobbyRow.schedule_json = null; }
        }
        setLobby(lobbyRow);
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
        setLastPollOk(true);
        setLastPollAt(Date.now());
        return data as LobbyPollResult;
      }
      // Server answered but the lobby is gone (deleted / unknown id): surface
      // that as a terminal state so the screen can tear down.
      if (data.status === 'error' && /not found/i.test(String(data.message || ''))) {
        setLobby((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
      }
      setLastPollOk(false);
    } catch {
      // Network failure — L2: report it instead of pretending we're connected
      setLastPollOk(false);
    }
    return null;
  }, []);

  // --- Start/Stop Polling ---
  const startPolling = useCallback((lobbyId: number) => {
    stopPolling();
    activeLobbyIdRef.current = lobbyId;
    pollLobby(lobbyId); // immediate first poll
    pollingRef.current = setInterval(() => pollLobby(lobbyId), 3000);
  }, [pollLobby]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /** C4: restart polling for the last lobby after a blur/refocus. */
  const resumePolling = useCallback(() => {
    const id = activeLobbyIdRef.current;
    if (id && !pollingRef.current) {
      pollLobby(id);
      pollingRef.current = setInterval(() => pollLobby(id), 3000);
    }
  }, [pollLobby]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // --- Reset State ---
  const reset = useCallback(() => {
    stopPolling();
    activeLobbyIdRef.current = null;
    setLobby(null);
    setMembers([]);
    setReplacementRequests([]);
    setConfirmedCount(0);
    setAllConfirmed(false);
    setError(null);
    setLastPollOk(null);
  }, [stopPolling]);

  return {
    // State
    beacons, history, courts, lobby, members, confirmedCount, allConfirmed,
    replacementRequests, loading, error,
    myLobby, lastPollOk, lastPollAt,
    activeLobbyId: activeLobbyIdRef.current,
    // Actions
    createBeacon, fetchFeed, cancelBeacon, extendBeacon,
    createLobby, joinLobby, leaveLobby, confirmInLobby,
    lockLobby, startMatch, pollLobby, startPolling, stopPolling, resumePolling, reset,
    requestReplacement, acceptReplacement, cancelReplacement,
    respondToBeacon, unrespondToBeacon,
    // Setters
    setLobby, setError,
  };
}
