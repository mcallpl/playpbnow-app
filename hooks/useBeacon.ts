import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';
// Shared beacon API — used by both DinkConnections and PlayPBNow
const SHARED_BEACON_URL = 'https://peoplestar.com/shared/beacon/api';

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
  // Shared API fields
  message_count?: number;
  my_response?: string | null;
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
      const { userName: currentUserName } = await getUserInfo();
      const sharedBody: Record<string, any> = { user_id: parseInt(userId) || 0 };
      if (lat !== undefined && lng !== undefined) {
        sharedBody.lat = lat;
        sharedBody.lng = lng;
        // No radius filter — show all beacons to everyone for now
      }

      // Update creator_name on any existing beacon belonging to this user
      // (fixes stale names from previous sessions)
      try {
        await fetch(`${SHARED_BEACON_URL}/update_name.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: parseInt(userId) || 0, creator_name: currentUserName }),
        });
      } catch { /* best effort */ }

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
