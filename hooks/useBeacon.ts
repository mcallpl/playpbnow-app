import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

export interface BeaconResponse {
  user_id: string;
  first_name: string;
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
  status: string;
  expires_at: string;
  created_at: string;
  creator_name: string;
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

  // --- Create/Update Beacon ---
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
      const userId = await getUserId();
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
    } catch (e) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Fetch Beacon Feed ---
  const fetchFeed = useCallback(async (courtId?: number, lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();
      let url = `${API_URL}/beacon_feed.php?user_id=${userId}&include_history=1`;
      if (courtId) url += `&court_id=${courtId}`;
      if (lat !== undefined && lng !== undefined) {
        url += `&lat=${lat}&lng=${lng}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setBeacons(data.beacons || []);
        setCourts(data.courts || []);
        setHistory(data.history || []);
      } else {
        setError(data.message || 'Failed to load feed');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Cancel Beacon ---
  const cancelBeacon = useCallback(async (beaconId: number) => {
    try {
      const userId = await getUserId();
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

  // --- Extend Beacon ---
  const extendBeacon = useCallback(async (beaconId: number, additionalMinutes: number) => {
    try {
      const userId = await getUserId();
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

  // --- Create Lobby ---
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

  // --- Join Lobby ---
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

  // --- Confirm in Lobby ---
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

  // --- Lock Lobby (host only) ---
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

  // --- Start Match (host only) ---
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

  // --- Respond to casual beacon ("On My Way!") ---
  const respondToBeacon = useCallback(async (beaconId: number, responseType: string = 'on_my_way') => {
    try {
      const userId = await getUserId();
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

  // --- Request Replacement ("Can't Make It") ---
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

  // --- Accept Replacement ("Fill This Spot") ---
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

  // --- Cancel Replacement ("I Can Make It!") ---
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

  // --- Poll Lobby ---
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
