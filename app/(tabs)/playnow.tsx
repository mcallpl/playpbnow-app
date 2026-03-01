import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandedIcon } from '../../components/BrandedIcon';
import { InfoBox, StatusBox, WarningBox } from '../../components/InfoBox';
import { useTheme } from '../../context/ThemeContext';
import {
  ThemeColors,
  FONT_DISPLAY_EXTRABOLD,
  FONT_DISPLAY_BOLD,
  FONT_BODY_BOLD,
  FONT_BODY_MEDIUM,
  FONT_BODY_REGULAR,
  SPACING,
} from '../../constants/theme';
import { useBeacon, Beacon, Court, ReplacementRequest, BeaconResponse } from '../../hooks/useBeacon';
import { useBeaconStatus } from '../../context/BeaconContext';
import { playChatPing } from '../../utils/sounds';
import { useBeaconChat } from '../../hooks/useBeaconChat';
import { haptic } from '../../utils/haptics';

const API_URL = 'https://peoplestar.com/Chipleball/api';

type BeaconView = 'feed' | 'mode_select' | 'create_casual' | 'create_structured' | 'lobby' | 'locked';

const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16];

const CANNED_MESSAGES = [
  "On my way!",
  "Be there in 10 min",
  "Be there in 20 min",
  "Be there in 30 min",
  "Save me a spot!",
  "How many players so far?",
  "What skill level?",
  "I'm bringing a friend",
  "Just warming up, come join!",
  "Courts are open!",
  "Need one more!",
  "Let's play!",
];
const DURATION_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

function getTimeRemaining(expiresAt: string): string {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;
  if (diff <= 0) return 'Expired';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h left`;
  return `${hours}h ${remaining}m left`;
}

function formatHistoryDate(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
}

function getStaticMapUrl(
  lat: number, lng: number, apiKey: string,
  width: number = 600, height: number = 300, zoom: number = 15,
): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&scale=2&markers=color:red|${lat},${lng}&key=${apiKey}&style=feature:poi|visibility:off`;
}

// --- Beacon Map Card (animated) ---
function BeaconMapCard({ beacon, mapsApiKey, colors, onTap, onExtend, onCancel, loading: actionLoading }: {
  beacon: Beacon;
  mapsApiKey: string;
  colors: ThemeColors;
  onTap: () => void;
  onExtend: (id: number) => void;
  onCancel: (id: number) => void;
  loading: boolean;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const timeLeft = getTimeRemaining(beacon.expires_at);
  const isExpired = timeLeft === 'Expired';
  const hasCoords = beacon.court_lat != null && beacon.court_lng != null;
  const isCasual = beacon.beacon_type === 'casual';

  // Pulsing ring animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);
  // Beacon dot glow pulse
  const dotScale = useSharedValue(1);

  useEffect(() => {
    if (!isExpired) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(2.5, { duration: 1400, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 }),
        ),
        -1, false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) }),
          withTiming(0.7, { duration: 0 }),
        ),
        -1, false,
      );
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, true,
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      cancelAnimation(dotScale);
    }
    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      cancelAnimation(dotScale);
    };
  }, [isExpired]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const mapUrl = hasCoords
    ? getStaticMapUrl(beacon.court_lat!, beacon.court_lng!, mapsApiKey)
    : null;

  return (
    <TouchableOpacity
      style={styles.mapCard}
      onPress={onTap}
      activeOpacity={0.85}
      disabled={isExpired}
    >
      {/* Map Image */}
      <View style={styles.mapImageContainer}>
        {mapUrl ? (
          <Image
            source={{ uri: mapUrl }}
            style={styles.mapImage}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.mapImage, styles.mapPlaceholder]}>
            <BrandedIcon name="location" size={32} color={colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>Map unavailable</Text>
          </View>
        )}

        {/* Pulsing beacon overlay */}
        {!isExpired && hasCoords && (
          <View style={styles.beaconOverlayContainer}>
            <Animated.View style={[styles.pulseRing, pulseRingStyle]} />
            <Animated.View style={[styles.beaconDot, dotStyle]} />
          </View>
        )}

        {/* Time badge */}
        <View style={styles.mapTimeBadge}>
          <BrandedIcon name="live" size={12} color={isExpired ? colors.danger : '#ffffff'} />
          <Text style={styles.mapTimeText}>{timeLeft}</Text>
        </View>
      </View>

      {/* Info strip */}
      <View style={styles.mapCardInfo}>
        <View style={styles.mapCardInfoLeft}>
          <Text style={styles.mapCardCourtName} numberOfLines={1}>{beacon.court_name}</Text>
          <View style={styles.mapCardCreatorRow}>
            <Text style={styles.mapCardCreator}>{beacon.creator_name}</Text>
            {beacon.distance_miles != null && (
              <Text style={styles.mapCardDistance}>{beacon.distance_miles} mi away</Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={isCasual ? styles.mapCardBadgeCasual : styles.mapCardBadgeStructured}>
            <Text style={isCasual ? styles.mapCardBadgeCasualText : styles.mapCardBadgeStructuredText}>
              {isCasual ? 'Come Join Me' : 'Spot To Fill'}
            </Text>
          </View>
          {beacon.is_mine && beacon.chat_count > 0 && (
            <View style={styles.mapCardChatBadge}>
              <BrandedIcon name="chat" size={12} color={colors.accent} />
              <Text style={styles.mapCardChatBadgeText}>{beacon.chat_count}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Creator actions */}
      {beacon.is_mine && (
        <View style={styles.mapCardCreatorActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onExtend(beacon.id)}
            disabled={actionLoading || isExpired}
          >
            <BrandedIcon name="sync" size={14} color={colors.text} />
            <Text style={styles.secondaryButtonText}>Extend</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => onCancel(beacon.id)}
            disabled={actionLoading}
          >
            <BrandedIcon name="close" size={14} color={colors.danger} />
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function PlayNowTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    beacons, history, courts, lobby, members, confirmedCount, allConfirmed,
    replacementRequests, loading, error,
    createBeacon, fetchFeed, cancelBeacon, extendBeacon,
    createLobby, joinLobby, confirmInLobby,
    lockLobby, startMatch, startPolling, stopPolling, reset,
    requestReplacement, acceptReplacement, cancelReplacement,
    respondToBeacon, unrespondToBeacon,
    setError,
  } = useBeacon();

  const { location, locationPermissionDenied, showLocationDeniedAlert, reportBeaconCount } = useBeaconStatus();

  const [view, setView] = useState<BeaconView>('feed');
  const viewRef = useRef<BeaconView>('feed');
  const [userId, setUserId] = useState('');
  const [mapsApiKey, setMapsApiKey] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [selectedBeacon, setSelectedBeacon] = useState<Beacon | null>(null);
  const [selectedBeaconExpired, setSelectedBeaconExpired] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<{
    first_name: string;
    last_name: string;
    gender: string;
    player_id?: number;
  }>({ first_name: '', last_name: '', gender: 'M' });

  // Create form state
  const [createCourtId, setCreateCourtId] = useState<number | null>(null);
  const [createPlayerCount, setCreatePlayerCount] = useState(1);
  const [createSkillLevel, setCreateSkillLevel] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [createDuration, setCreateDuration] = useState(60);
  const [createCourts, setCreateCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [courtDropdownOpen, setCourtDropdownOpen] = useState(false);

  // Chat state
  const [expandedChatId, setExpandedChatId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const feedScrollRef = useRef<ScrollView>(null);
  const feedLoadedOnce = useRef(false);
  const { messages: chatMessages, isLoading: chatLoading, sendMessage: sendChatMessage, startPolling: startChatPolling, stopPolling: stopChatPolling } = useBeaconChat();

  // Profile gate state
  const [profileComplete, setProfileComplete] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Phone verification state
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Load user info on mount — check server profile first
  useEffect(() => {
    loadUserInfo();
    // Fetch Google Maps API key for static map images
    fetch(`${API_URL}/app_config.php`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.google_maps_api_key) {
          setMapsApiKey(data.google_maps_api_key);
        }
      })
      .catch(() => {
        // Map thumbnails will show placeholder until key is available
      });
  }, []);

  // Auto-open chat panel for non-creators when detail modal opens
  useEffect(() => {
    if (
      selectedBeacon &&
      !selectedBeacon.is_mine &&
      phoneVerified &&
      profileComplete &&
      userId
    ) {
      setExpandedChatId(selectedBeacon.id);
      startChatPolling(selectedBeacon.id, userId);
    }
  }, [selectedBeacon?.id]);

  // Detect when selected beacon expires (no longer in active feed)
  useEffect(() => {
    if (selectedBeacon && beacons.length > 0) {
      const stillActive = beacons.some((b) => b.id === selectedBeacon.id);
      if (!stillActive && !selectedBeaconExpired) {
        setSelectedBeaconExpired(true);
      }
    }
  }, [beacons, selectedBeacon?.id]);

  // Track chat_count changes on creator's beacons — play sound on increase
  const prevChatCountsRef = useRef<Record<number, number>>({});
  useEffect(() => {
    const prev = prevChatCountsRef.current;
    let shouldPing = false;

    for (const beacon of beacons) {
      if (beacon.is_mine && beacon.chat_count > 0) {
        const prevCount = prev[beacon.id] ?? 0;
        if (beacon.chat_count > prevCount && prevCount > 0 && expandedChatId !== beacon.id) {
          shouldPing = true;
        }
      }
    }

    const newCounts: Record<number, number> = {};
    for (const b of beacons) { newCounts[b.id] = b.chat_count; }
    prevChatCountsRef.current = newCounts;

    if (shouldPing) playChatPing();
  }, [beacons, expandedChatId]);

  const loadUserInfo = async () => {
    const uid = await AsyncStorage.getItem('user_id');
    if (!uid) return;
    setUserId(uid);

    // Check phone verification — must have a verified phone from Twilio login
    const phone = await AsyncStorage.getItem('user_phone');
    if (!phone) {
      // No verified phone on device — user must re-login via Twilio
      setPhoneVerified(false);
      setProfileComplete(false);
      return;
    }
    setPhoneVerified(true);

    // 1. Try to load profile from server (permanent storage)
    try {
      const profileRes = await fetch(`${API_URL}/user_profile_get.php?user_id=${uid}`);
      const profileData = await profileRes.json();
      if (profileData.status === 'success' && profileData.profile && profileData.profile.first_name && profileData.profile.phone) {
        const p = profileData.profile;
        setPlayerInfo({
          first_name: p.first_name,
          last_name: p.last_name || '',
          gender: p.gender || 'M',
        });
        setProfileComplete(true);
        // Cache locally for fast access
        await AsyncStorage.setItem('user_first_name', p.first_name);
        await AsyncStorage.setItem('user_last_name', p.last_name || '');
        return;
      }
    } catch {
      // Server unavailable — check local cache
    }

    // 2. Check AsyncStorage cache (only if phone is verified)
    const cachedFirst = await AsyncStorage.getItem('user_first_name');
    if (cachedFirst) {
      const cachedLast = await AsyncStorage.getItem('user_last_name') || '';
      setPlayerInfo(prev => ({ ...prev, first_name: cachedFirst, last_name: cachedLast }));
      setProfileComplete(true);
      return;
    }

    // 3. Fall back to get_all_players.php (legacy)
    try {
      const res = await fetch(`${API_URL}/get_all_players.php?user_id=${uid}`);
      const data = await res.json();
      if (data.status === 'success' && data.players && data.players.length > 0) {
        const p = data.players[0];
        if (p.first_name) {
          setPlayerInfo({
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            gender: p.gender || 'M',
            player_id: p.id,
          });
          setProfileComplete(true);
          await AsyncStorage.setItem('user_first_name', p.first_name);
          await AsyncStorage.setItem('user_last_name', p.last_name || '');
        }
      }
    } catch {
      // No profile found — user will be prompted when they try to create a beacon
    }
  };

  const handleSaveProfile = async () => {
    if (!profileFirstName.trim()) {
      Alert.alert('Name Required', 'Please enter your first name.');
      return;
    }
    setSavingProfile(true);
    try {
      const phone = await AsyncStorage.getItem('user_phone') || '';
      const res = await fetch(`${API_URL}/user_profile_save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          phone,
          first_name: profileFirstName.trim(),
          last_name: profileLastName.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const p = data.profile;
        setPlayerInfo(prev => ({
          ...prev,
          first_name: p.first_name,
          last_name: p.last_name || '',
        }));
        setProfileComplete(true);
        await AsyncStorage.setItem('user_first_name', p.first_name);
        await AsyncStorage.setItem('user_last_name', p.last_name || '');
        setShowProfileModal(false);
        haptic.confirm();
        // Proceed directly into mode select
        setView('mode_select');
        setLoadingCourts(true);
        try {
          const courtsRes = await fetch(`${API_URL}/get_courts.php`);
          const courtsData = await courtsRes.json();
          if (courtsData.status === 'success') {
            setCreateCourts(courtsData.courts || []);
          }
        } catch {
          setCreateCourts(courts);
        } finally {
          setLoadingCourts(false);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to save profile');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Keep viewRef in sync so useFocusEffect can read current view without depending on it
  useEffect(() => { viewRef.current = view; }, [view]);

  // Sync beacon count to context so the tab icon matches exactly what the feed shows
  useEffect(() => { reportBeaconCount(beacons.length); }, [beacons.length, reportBeaconCount]);

  // Helper to pass location into every fetchFeed call
  const fetchFeedWithLocation = useCallback(
    () => fetchFeed(undefined, location?.latitude, location?.longitude),
    [fetchFeed, location]
  );

  // Always show the feed when the tab gains focus, and refresh beacons
  useFocusEffect(
    useCallback(() => {
      // Only reset to feed from the feed view itself (tab re-focus refresh).
      // Never reset from mode_select, create, or lobby — those are active user flows.
      if (viewRef.current === 'feed') {
        setSelectedBeacon(null);
      }
      fetchFeedWithLocation().finally(() => { feedLoadedOnce.current = true; });

      const refreshInterval = setInterval(() => {
        fetchFeedWithLocation();
      }, 15000);
      return () => {
        clearInterval(refreshInterval);
        stopPolling();
        stopChatPolling();
        setExpandedChatId(null);
      };
    }, [fetchFeedWithLocation, stopPolling])
  );

  // Auto-navigate when lobby status changes to 'started'
  useEffect(() => {
    if (lobby?.status === 'started') {
      stopPolling();
      router.push({
        pathname: '/(tabs)/game',
        params: {
          schedule: JSON.stringify(lobby.schedule_json),
          players: JSON.stringify(
            members
              .filter((m) => m.status !== 'left' && m.status !== 'replaced')
              .map((m) => ({
                id: String(m.player_id || m.user_id),
                first_name: m.first_name,
                last_name: m.last_name,
                gender: m.gender,
              }))
          ),
          groupName: lobby.court_name || 'Beacon Match',
          shareCode: lobby.session_code || '',
          sessionId: String(lobby.collab_session_id || ''),
          isCollaborator: lobby.host_user_id !== userId ? 'true' : 'false',
        },
      });
    }
  }, [lobby?.status]);

  // Auto-switch to locked view when lobby locks
  useEffect(() => {
    if (lobby?.status === 'locked' && view === 'lobby') {
      setView('locked');
    }
  }, [lobby?.status, view]);

  // --- HANDLERS ---

  const handleOpenCreateView = useCallback(async () => {
    // Phone verification gate — must have verified phone from Twilio
    if (!phoneVerified) {
      Alert.alert(
        'Phone Verification Required',
        'You must verify your phone number via SMS before creating a beacon. Please log out and log back in.',
        [
          { text: 'OK' },
          { text: 'Go to Login', onPress: () => router.replace('/login') },
        ]
      );
      return;
    }
    // Profile gate — require name before creating a beacon
    if (!profileComplete) {
      setShowProfileModal(true);
      return;
    }
    setView('mode_select');
  }, [phoneVerified, profileComplete, router]);

  const loadCourtsForCreate = useCallback(async () => {
    setLoadingCourts(true);
    try {
      const res = await fetch(`${API_URL}/get_courts.php`);
      const data = await res.json();
      if (data.status === 'success') {
        setCreateCourts(data.courts || []);
      }
    } catch {
      setCreateCourts(courts);
    } finally {
      setLoadingCourts(false);
    }
  }, [courts]);

  const handleGoLive = useCallback(async () => {
    if (!createCourtId) {
      Alert.alert('Select a Court', 'Please choose a court before going live.');
      return;
    }
    const beacon = await createBeacon(
      createCourtId,
      createPlayerCount,
      createSkillLevel || undefined,
      createMessage || undefined,
      createDuration,
      'structured'
    );
    if (!beacon) return;

    const lobbyResult = await createLobby(beacon.id, createPlayerCount, {
      player_id: playerInfo.player_id,
      first_name: playerInfo.first_name,
      last_name: playerInfo.last_name,
      gender: playerInfo.gender,
    });
    if (!lobbyResult) return;

    haptic.start();
    Alert.alert(
      'Beacon is Live!',
      'Your beacon is now active. Nearby players will be notified and can see your beacon on the map.',
      [{ text: 'Got it!' }]
    );
    startPolling(lobbyResult.id);
    setView('lobby');

    // Reset create form
    setCreateCourtId(null);
    setCreatePlayerCount(1);
    setCreateSkillLevel('');
    setCreateMessage('');
    setCreateDuration(60);
  }, [
    createCourtId,
    createPlayerCount,
    createSkillLevel,
    createMessage,
    createDuration,
    createBeacon,
    createLobby,
    playerInfo,
    startPolling,
  ]);

  const handleGoLiveCasual = useCallback(async () => {
    if (!createCourtId) {
      Alert.alert('Select a Court', 'Please choose a court before going live.');
      return;
    }
    const beacon = await createBeacon(
      createCourtId, 0, undefined,
      createMessage || undefined, createDuration, 'casual'
    );
    if (!beacon) return;
    haptic.start();
    Alert.alert(
      'Beacon is Live!',
      'Your beacon is now active. Nearby players will be notified and can see your beacon on the map.',
      [{ text: 'Got it!' }]
    );
    setView('feed');
    fetchFeedWithLocation();
    // Reset form
    setCreateCourtId(null);
    setCreateMessage('');
    setCreateDuration(60);
  }, [createCourtId, createMessage, createDuration, createBeacon, fetchFeedWithLocation]);

  const handleOpenLobby = useCallback(
    async (beacon: Beacon) => {
      const lobbyResult = await createLobby(beacon.id, beacon.player_count, {
        player_id: playerInfo.player_id,
        first_name: playerInfo.first_name,
        last_name: playerInfo.last_name,
        gender: playerInfo.gender,
      });
      if (!lobbyResult) return;

      haptic.tap();
      startPolling(lobbyResult.id);
      setView('lobby');
    },
    [createLobby, playerInfo, startPolling]
  );

  const handleJoinLobby = useCallback(
    async (beacon: Beacon) => {
      // Attempt to join the lobby associated with this beacon
      // The beacon feed may include an active_lobby_id in future.
      // For now, we create a lobby (which the backend will handle idempotently
      // or return existing) then join it.
      const lobbyResult = await createLobby(beacon.id, beacon.player_count, {
        player_id: playerInfo.player_id,
        first_name: playerInfo.first_name,
        last_name: playerInfo.last_name,
        gender: playerInfo.gender,
      });
      if (lobbyResult) {
        // If we are not the host, join the lobby
        if (lobbyResult.host_user_id !== userId) {
          await joinLobby(lobbyResult.id, {
            player_id: playerInfo.player_id,
            first_name: playerInfo.first_name,
            last_name: playerInfo.last_name,
            gender: playerInfo.gender,
          });
        }
        haptic.tap();
        startPolling(lobbyResult.id);
        setView('lobby');
      }
    },
    [createLobby, joinLobby, playerInfo, userId, startPolling]
  );

  const handleConfirm = useCallback(async () => {
    if (!lobby) return;
    const success = await confirmInLobby(lobby.id);
    if (success) {
      haptic.confirm();
    }
  }, [lobby, confirmInLobby]);

  const handleLockMatch = useCallback(async () => {
    if (!lobby) return;
    const result = await lockLobby(lobby.id);
    if (result) {
      haptic.lock();
      setView('locked');
    }
  }, [lobby, lockLobby]);

  const handleStartMatch = useCallback(async () => {
    if (!lobby) return;
    const result = await startMatch(lobby.id);
    if (result) {
      haptic.start();
    }
  }, [lobby, startMatch]);

  const handleLeaveLobby = useCallback(() => {
    Alert.alert('Leave Lobby', 'Are you sure you want to leave this lobby?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          reset();
          setView('feed');
          fetchFeedWithLocation();
        },
      },
    ]);
  }, [reset, fetchFeedWithLocation]);

  // --- RENDERERS ---

  const isHost = lobby?.host_user_id === userId;
  const myMember = members.find((m) => m.user_id === userId);

  // ========================
  // VIEW 1: Live Feed
  // ========================

  const handleExtendBeacon = useCallback((beaconId: number) => {
    Alert.alert('Extend Beacon', 'How much longer?', [
      { text: '+30 min', onPress: () => { extendBeacon(beaconId, 30); haptic.confirm(); } },
      { text: '+1 hour', onPress: () => { extendBeacon(beaconId, 60); haptic.confirm(); } },
      { text: '+2 hours', onPress: () => { extendBeacon(beaconId, 120); haptic.confirm(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [extendBeacon]);

  const handleCancelBeacon = useCallback((beaconId: number) => {
    Alert.alert('Cancel Beacon', 'Are you sure you want to cancel this beacon?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => { cancelBeacon(beaconId); haptic.tap(); } },
    ]);
  }, [cancelBeacon]);

  const renderFeed = () => {
    return (
      <View style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <BrandedIcon name="playnow" size={28} color={colors.accent} />
            <Text style={styles.headerTitle}>Play Now</Text>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorContainer}>
            <WarningBox text={error} />
          </View>
        ) : null}

        {/* Location Warning */}
        {locationPermissionDenied && (
          <TouchableOpacity
            style={styles.locationWarning}
            onPress={showLocationDeniedAlert}
            activeOpacity={0.7}
          >
            <BrandedIcon name="location" size={18} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationWarningTitle}>Location Services Disabled</Text>
              <Text style={styles.locationWarningText}>Enable location to see beacons near you. Tap for instructions.</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Loading — only show spinner before the first feed load completes */}
        {loading && !feedLoadedOnce.current && beacons.length === 0 && history.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView ref={feedScrollRef} style={styles.flex} showsVerticalScrollIndicator={false} alwaysBounceHorizontal={false} contentContainerStyle={styles.feedScrollContent}>
            {/* Active Beacons — Map Cards */}
            {beacons.length > 0 ? (
              beacons.map((beacon) => (
                <BeaconMapCard
                  key={beacon.id}
                  beacon={beacon}
                  mapsApiKey={mapsApiKey}
                  colors={colors}
                  onTap={() => { setSelectedBeacon(beacon); setSelectedBeaconExpired(false); }}
                  onExtend={handleExtendBeacon}
                  onCancel={handleCancelBeacon}
                  loading={loading}
                />
              ))
            ) : (
              <View style={styles.emptyBlock}>
                <BrandedIcon name="location" size={56} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No active beacons nearby</Text>
                <Text style={styles.emptySubtitle}>
                  Start a beacon to let others know you're looking to play!
                </Text>
                <TouchableOpacity style={styles.emptyCreateButton} onPress={handleOpenCreateView}>
                  <BrandedIcon name="add" size={20} color="#ffffff" />
                  <Text style={styles.emptyCreateButtonText}>Create Beacon</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Past Beacons Dropdown — always visible when history exists */}
            {history.length > 0 && (
              <View style={styles.historyDropdownContainer}>
                <TouchableOpacity
                  style={styles.historyDropdownHeader}
                  onPress={() => setHistoryExpanded(!historyExpanded)}
                >
                  <Text style={styles.historyDropdownTitle}>Past Beacons ({history.length})</Text>
                  <BrandedIcon name={historyExpanded ? 'minus' : 'add'} size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {historyExpanded && history.map((item) => {
                  const isCancelled = item.status === 'cancelled';
                  const isExpired = item.status === 'expired';
                  const dateStr = formatHistoryDate(item.created_at);
                  return (
                    <View key={`hist-${item.id}`} style={styles.historyCard}>
                      <View style={styles.historyCardTop}>
                        <Text style={styles.historyCreator}>{item.creator_name}</Text>
                        <View style={[styles.historyBadge, isCancelled ? styles.historyBadgeCancelled : styles.historyBadgeCompleted]}>
                          <Text style={[styles.historyBadgeText, isCancelled ? styles.historyBadgeTextCancelled : styles.historyBadgeTextCompleted]}>
                            {isCancelled ? 'Cancelled' : isExpired ? 'Expired' : 'Completed'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.historyCardDetails}>
                        <BrandedIcon name="court" size={13} color={colors.textMuted} />
                        <Text style={styles.historyDetailText}>{item.court_name}</Text>
                        <Text style={styles.historyDot}> · </Text>
                        <Text style={styles.historyDetailText}>{dateStr}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Spacer for FAB */}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleOpenCreateView}>
          <BrandedIcon name="add" size={24} color="#ffffff" />
          <Text style={styles.fabText}>Create Beacon</Text>
        </TouchableOpacity>

        {/* Beacon Detail Modal */}
        {selectedBeacon && (
          <Modal visible={true} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.beaconDetailModal}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  {/* Map header */}
                  {selectedBeacon.court_lat && selectedBeacon.court_lng && mapsApiKey ? (
                    <Image
                      source={{ uri: getStaticMapUrl(selectedBeacon.court_lat, selectedBeacon.court_lng, mapsApiKey, 600, 250) }}
                      style={styles.detailMapImage}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.detailMapImage, styles.mapPlaceholder]}>
                      <BrandedIcon name="location" size={32} color={colors.textMuted} />
                    </View>
                  )}

                  {/* Close button */}
                  <TouchableOpacity style={styles.detailCloseBtn} onPress={() => { setSelectedBeacon(null); stopChatPolling(); setExpandedChatId(null); }}>
                    <BrandedIcon name="close" size={22} color={colors.text} />
                  </TouchableOpacity>

                  <View style={styles.detailContent}>
                    {/* Court + Creator Info */}
                    <Text style={styles.detailCourtName}>{selectedBeacon.court_name}</Text>
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailCreator}>{selectedBeacon.creator_name}</Text>
                      <View style={styles.reliabilityRow}>
                        <BrandedIcon name="reliability" size={14} color={colors.accent} />
                        <Text style={styles.reliabilityText}>{selectedBeacon.reliability_pct}%</Text>
                      </View>
                      {selectedBeacon.distance_miles != null && (
                        <Text style={styles.detailDistance}>{selectedBeacon.distance_miles} mi away</Text>
                      )}
                    </View>

                    {/* Time + Type */}
                    <View style={styles.detailBadgeRow}>
                      <View style={styles.timeBadge}>
                        <BrandedIcon name="live" size={12} color={getTimeRemaining(selectedBeacon.expires_at) === 'Expired' ? colors.danger : colors.accent} />
                        <Text style={[styles.timeText, getTimeRemaining(selectedBeacon.expires_at) === 'Expired' && { color: colors.danger }]}>
                          {getTimeRemaining(selectedBeacon.expires_at)}
                        </Text>
                      </View>
                      <View style={selectedBeacon.beacon_type === 'casual' ? styles.casualBadge : styles.structuredBadge}>
                        <Text style={selectedBeacon.beacon_type === 'casual' ? styles.casualBadgeText : styles.structuredBadgeText}>
                          {selectedBeacon.beacon_type === 'casual' ? 'Come Join Me' : 'Spot To Fill'}
                        </Text>
                      </View>
                    </View>

                    {/* Get Directions */}
                    {selectedBeacon.court_lat && selectedBeacon.court_lng && (
                      <TouchableOpacity
                        style={styles.directionsButton}
                        onPress={() => {
                          const { court_lat, court_lng, court_name } = selectedBeacon;
                          const url = Platform.select({
                            ios: `maps://app?daddr=${court_lat},${court_lng}&q=${encodeURIComponent(court_name)}`,
                            default: `https://www.google.com/maps/dir/?api=1&destination=${court_lat},${court_lng}&destination_place_id=&travelmode=driving`,
                          });
                          Linking.openURL(url).catch(() => {
                            // Fallback to Google Maps web if native maps not available
                            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${court_lat},${court_lng}&travelmode=driving`);
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <BrandedIcon name="location" size={16} color="#ffffff" />
                        <Text style={styles.directionsButtonText}>Get Directions</Text>
                      </TouchableOpacity>
                    )}

                    {/* Message */}
                    {selectedBeacon.message ? (
                      <Text style={styles.cardMessage}>{selectedBeacon.message}</Text>
                    ) : null}

                    {/* Replacement banner */}
                    {selectedBeacon.needs_replacement && selectedBeacon.replacement_info && !selectedBeacon.is_mine && selectedBeacon.replacement_info.departing_user_id !== userId && (
                      <View style={styles.replacementBanner}>
                        <View style={styles.replacementBannerTextRow}>
                          <BrandedIcon name="sync" size={16} color="#ffffff" />
                          <Text style={styles.replacementBannerText}>
                            Replacement needed for {selectedBeacon.replacement_info.departing_name}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Expired Banner */}
                    {selectedBeaconExpired && (
                      <View style={styles.expiredBanner}>
                        <BrandedIcon name="live" size={18} color={colors.danger} />
                        <Text style={styles.expiredBannerText}>This beacon has expired</Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    {!selectedBeaconExpired && (
                    <View style={{ gap: 10, marginTop: 16 }}>
                      {selectedBeacon.is_mine ? (
                        <>
                          {selectedBeacon.beacon_type === 'structured' && (
                            <TouchableOpacity
                              style={styles.accentButtonLarge}
                              onPress={() => { setSelectedBeacon(null); handleOpenLobby(selectedBeacon); }}
                              disabled={loading}
                            >
                              <BrandedIcon name="live" size={18} color="#ffffff" />
                              <Text style={styles.accentButtonLargeText}>Open Lobby</Text>
                            </TouchableOpacity>
                          )}
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                              style={[styles.secondaryButton, { flex: 1, justifyContent: 'center' }]}
                              onPress={() => handleExtendBeacon(selectedBeacon.id)}
                            >
                              <BrandedIcon name="sync" size={14} color={colors.text} />
                              <Text style={styles.secondaryButtonText}>Extend</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.dangerButton, { flex: 1, justifyContent: 'center' }]}
                              onPress={() => { handleCancelBeacon(selectedBeacon.id); setSelectedBeacon(null); }}
                            >
                              <BrandedIcon name="close" size={14} color={colors.danger} />
                              <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : selectedBeacon.beacon_type === 'casual' ? (
                        <TouchableOpacity
                          style={selectedBeacon.user_responded ? styles.respondedButton : styles.onMyWayButton}
                          onPress={() => {
                            if (!phoneVerified) {
                              Alert.alert('Phone Verification Required', 'You must verify your phone number first.', [
                                { text: 'OK' },
                                { text: 'Go to Login', onPress: () => router.replace('/login') },
                              ]);
                              return;
                            }
                            if (!profileComplete) { setShowProfileModal(true); return; }
                            if (selectedBeacon.user_responded) {
                              unrespondToBeacon(selectedBeacon.id);
                            } else {
                              respondToBeacon(selectedBeacon.id).then((success) => {
                                if (success) {
                                  const name = `${playerInfo.first_name} ${playerInfo.last_name}`.trim();
                                  sendChatMessage(selectedBeacon.id, userId, name, "I'll join you!");
                                }
                              });
                            }
                            haptic.tap();
                          }}
                          disabled={loading}
                        >
                          <BrandedIcon name={selectedBeacon.user_responded ? 'confirm' : 'enter'} size={18} color={selectedBeacon.user_responded ? colors.accent : '#ffffff'} />
                          <Text style={selectedBeacon.user_responded ? styles.respondedButtonText : styles.onMyWayButtonText}>
                            {selectedBeacon.user_responded ? "I'm Going!" : 'On My Way!'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          {selectedBeacon.needs_replacement && selectedBeacon.replacement_info && selectedBeacon.replacement_info.departing_user_id !== userId ? (
                            <TouchableOpacity
                              style={styles.accentButtonLarge}
                              onPress={() => {
                                if (!phoneVerified) {
                                  Alert.alert('Phone Verification Required', 'You must verify your phone number first.', [
                                    { text: 'OK' },
                                    { text: 'Go to Login', onPress: () => router.replace('/login') },
                                  ]);
                                  return;
                                }
                                if (!profileComplete) { setShowProfileModal(true); return; }
                                Alert.alert(
                                  'Fill This Spot',
                                  `${selectedBeacon.replacement_info!.departing_name} can't make it. Want to take their place?`,
                                  [
                                    { text: 'Never Mind', style: 'cancel' },
                                    {
                                      text: 'Fill This Spot',
                                      onPress: async () => {
                                        const memberId = await acceptReplacement(selectedBeacon.replacement_info!.request_id, {
                                          player_id: playerInfo.player_id,
                                          first_name: playerInfo.first_name,
                                          last_name: playerInfo.last_name,
                                          gender: playerInfo.gender,
                                        });
                                        if (memberId) {
                                          haptic.confirm();
                                          setSelectedBeacon(null);
                                          startPolling(selectedBeacon.replacement_info!.lobby_id);
                                          setView('lobby');
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                              disabled={loading}
                            >
                              <BrandedIcon name="enter" size={18} color="#ffffff" />
                              <Text style={styles.accentButtonLargeText}>Fill This Spot</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.accentButtonLarge}
                              onPress={() => { setSelectedBeacon(null); handleJoinLobby(selectedBeacon); }}
                              disabled={loading}
                            >
                              <BrandedIcon name="enter" size={18} color="#ffffff" />
                              <Text style={styles.accentButtonLargeText}>Fill This Spot</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                    )}

                    {/* Chat */}
                    <TouchableOpacity
                      style={styles.chatToggleButton}
                      onPress={() => {
                        if (!phoneVerified) {
                          Alert.alert('Phone Verification Required', 'You must verify your phone number via SMS before using chat.', [
                            { text: 'OK' },
                            { text: 'Go to Login', onPress: () => router.replace('/login') },
                          ]);
                          return;
                        }
                        if (!profileComplete) { setShowProfileModal(true); return; }
                        if (expandedChatId === selectedBeacon.id) {
                          setExpandedChatId(null);
                          stopChatPolling();
                        } else {
                          setExpandedChatId(selectedBeacon.id);
                          startChatPolling(selectedBeacon.id, userId);
                        }
                      }}
                    >
                      <BrandedIcon name="chat" size={16} color={expandedChatId === selectedBeacon.id ? colors.accent : colors.textMuted} />
                      <Text style={[styles.chatToggleText, expandedChatId === selectedBeacon.id && { color: colors.accent }]}>
                        Chat{selectedBeacon.chat_count > 0 ? ` (${selectedBeacon.chat_count})` : ''}
                      </Text>
                    </TouchableOpacity>

                    {expandedChatId === selectedBeacon.id && (
                      <View style={styles.chatPanel}>
                        {chatLoading ? (
                          <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />
                        ) : chatMessages.length === 0 ? (
                          <Text style={styles.chatEmpty}>No messages yet. Start the conversation!</Text>
                        ) : (
                          <ScrollView
                            style={styles.chatMessageList}
                            nestedScrollEnabled
                            ref={(ref) => {
                              if (ref) setTimeout(() => ref.scrollToEnd?.({ animated: false }), 100);
                            }}
                          >
                            {chatMessages.map((msg) => {
                              const isMine = msg.user_id === userId;
                              return (
                                <View key={msg.id} style={[styles.chatBubble, isMine ? styles.chatBubbleMine : styles.chatBubbleOther]}>
                                  <Text style={[styles.chatSender, isMine ? styles.chatSenderMine : styles.chatSenderOther]}>
                                    {msg.user_name || 'Unknown'}{isMine ? ' (You)' : ''}
                                  </Text>
                                  <Text style={[styles.chatText, isMine && styles.chatTextMine]}>{msg.message}</Text>
                                  <Text style={[styles.chatTime, isMine && styles.chatTimeMine]}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </Text>
                                </View>
                              );
                            })}
                          </ScrollView>
                        )}
                        <View style={styles.cannedRow}>
                          {CANNED_MESSAGES.map((msg) => (
                            <TouchableOpacity
                              key={msg}
                              style={styles.cannedChip}
                              onPress={() => {
                                if (!profileComplete || !phoneVerified || !playerInfo.first_name) {
                                  Alert.alert('Identity Required', 'You must verify your phone and enter your name before chatting.');
                                  return;
                                }
                                const name = `${playerInfo.first_name} ${playerInfo.last_name}`.trim();
                                sendChatMessage(selectedBeacon.id, userId, name, msg);
                              }}
                            >
                              <Text style={styles.cannedChipText}>{msg}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={styles.chatInputRow}>
                          <TextInput
                            style={styles.chatTextInput}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.textMuted}
                            value={chatInput}
                            onChangeText={setChatInput}
                            maxLength={500}
                            returnKeyType="send"
                            blurOnSubmit
                            onSubmitEditing={() => {
                              if (!chatInput.trim()) return;
                              if (!profileComplete || !phoneVerified || !playerInfo.first_name) {
                                Alert.alert('Identity Required', 'You must verify your phone and enter your name before chatting.');
                                return;
                              }
                              const name = `${playerInfo.first_name} ${playerInfo.last_name}`.trim();
                              sendChatMessage(selectedBeacon.id, userId, name, chatInput.trim());
                              setChatInput('');
                              Keyboard.dismiss();
                            }}
                          />
                          <TouchableOpacity
                            style={styles.chatSendButton}
                            onPress={() => {
                              if (!chatInput.trim()) return;
                              if (!profileComplete || !phoneVerified || !playerInfo.first_name) {
                                Alert.alert('Identity Required', 'You must verify your phone and enter your name before chatting.');
                                return;
                              }
                              const name = `${playerInfo.first_name} ${playerInfo.last_name}`.trim();
                              sendChatMessage(selectedBeacon!.id, userId, name, chatInput.trim());
                              setChatInput('');
                              Keyboard.dismiss();
                            }}
                          >
                            <BrandedIcon name="send" size={18} color={colors.accent} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

  // ========================
  // VIEW 2: Mode Select
  // ========================
  const renderModeSelect = () => {
    return (
      <ScrollView style={styles.flex} alwaysBounceHorizontal={false} contentContainerStyle={styles.createContent}>
        {/* Back */}
        <TouchableOpacity style={styles.backButton} onPress={() => setView('feed')}>
          <BrandedIcon name="back" size={20} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Create Beacon</Text>
        <Text style={styles.sectionSubtitle}>What kind of beacon do you want to create?</Text>

        {/* Come Join Me */}
        <TouchableOpacity
          style={[styles.modeCard, styles.modeCardCasual]}
          onPress={async () => {
            setView('create_casual');
            setCourtDropdownOpen(false);
            await loadCourtsForCreate();
          }}
        >
          <BrandedIcon name="live" size={32} color={colors.accent} />
          <Text style={styles.modeCardTitle}>Come Join Me</Text>
          <Text style={styles.modeCardSubtitle}>
            I'm already at the court. Looking for people to come play!
          </Text>
          <View style={styles.casualBadge}>
            <Text style={styles.casualBadgeText}>Casual</Text>
          </View>
        </TouchableOpacity>

        {/* A Real Spot To Fill */}
        <TouchableOpacity
          style={[styles.modeCard, styles.modeCardStructured]}
          onPress={async () => {
            setView('create_structured');
            setCourtDropdownOpen(false);
            await loadCourtsForCreate();
          }}
        >
          <BrandedIcon name="lock" size={32} color="#FFD23F" />
          <Text style={styles.modeCardTitle}>A Real Spot To Fill</Text>
          <Text style={styles.modeCardSubtitle}>
            I need to fill specific spots. Full confirmation and match scheduling.
          </Text>
          <View style={styles.structuredBadge}>
            <Text style={styles.structuredBadgeText}>Guaranteed Game</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ========================
  // VIEW 2b: Create Casual
  // ========================
  const renderCreateCasual = () => {
    return (
      <ScrollView style={styles.flex} alwaysBounceHorizontal={false} contentContainerStyle={styles.createContent}>
        {/* Back */}
        <TouchableOpacity style={styles.backButton} onPress={() => setView('mode_select')}>
          <BrandedIcon name="back" size={20} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Come Join Me</Text>

        {/* Court Selector */}
        <Text style={styles.fieldLabel}>Select Court</Text>
        {loadingCourts ? (
          <ActivityIndicator color={colors.accent} style={styles.fieldSpacer} />
        ) : (
          <View>
            <TouchableOpacity
              style={[styles.dropdownTrigger, courtDropdownOpen && styles.dropdownTriggerOpen]}
              onPress={() => setCourtDropdownOpen(!courtDropdownOpen)}
            >
              <Text style={createCourtId ? styles.dropdownTriggerText : styles.dropdownPlaceholder}>
                {createCourtId
                  ? createCourts.find(c => c.id === createCourtId)?.name || 'Select a court'
                  : 'Select a court'}
              </Text>
              <BrandedIcon
                name={courtDropdownOpen ? 'minus' : 'add'}
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {courtDropdownOpen && (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {createCourts.map((court) => (
                    <TouchableOpacity
                      key={court.id}
                      style={[
                        styles.dropdownItem,
                        createCourtId === court.id && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setCreateCourtId(court.id);
                        setCourtDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          createCourtId === court.id && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {court.name}
                      </Text>
                      {createCourtId === court.id && (
                        <BrandedIcon name="confirm" size={16} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Message */}
        <Text style={styles.fieldLabel}>Message (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          placeholder="Courts are open, come play!"
          placeholderTextColor={colors.inputPlaceholder}
          value={createMessage}
          onChangeText={(t) => setCreateMessage(t.slice(0, 255))}
          maxLength={255}
          multiline
          numberOfLines={3}
        />
        <Text style={styles.charCount}>{createMessage.length}/255</Text>

        {/* Duration */}
        <Text style={styles.fieldLabel}>How long will you be here?</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.durationChip,
                createDuration === opt.value && styles.durationChipActive,
              ]}
              onPress={() => setCreateDuration(opt.value)}
            >
              <Text
                style={[
                  styles.durationChipText,
                  createDuration === opt.value && styles.durationChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Go Live Button */}
        <TouchableOpacity
          style={[styles.goLiveButtonCasual, loading && styles.buttonDisabled]}
          onPress={handleGoLiveCasual}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <BrandedIcon name="live" size={20} color="#ffffff" />
              <Text style={styles.goLiveText}>I'm Here — Come Play!</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ========================
  // VIEW 2c: Create Structured
  // ========================
  const renderCreateStructured = () => {
    return (
      <ScrollView style={styles.flex} alwaysBounceHorizontal={false} contentContainerStyle={styles.createContent}>
        {/* Back */}
        <TouchableOpacity style={styles.backButton} onPress={() => setView('mode_select')}>
          <BrandedIcon name="back" size={20} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>A Real Spot To Fill</Text>

        {/* Court Selector — Dropdown */}
        <Text style={styles.fieldLabel}>Select Court</Text>
        {loadingCourts ? (
          <ActivityIndicator color={colors.accent} style={styles.fieldSpacer} />
        ) : (
          <View>
            <TouchableOpacity
              style={[styles.dropdownTrigger, courtDropdownOpen && styles.dropdownTriggerOpen]}
              onPress={() => setCourtDropdownOpen(!courtDropdownOpen)}
            >
              <Text style={createCourtId ? styles.dropdownTriggerText : styles.dropdownPlaceholder}>
                {createCourtId
                  ? createCourts.find(c => c.id === createCourtId)?.name || 'Select a court'
                  : 'Select a court'}
              </Text>
              <BrandedIcon
                name={courtDropdownOpen ? 'minus' : 'add'}
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {courtDropdownOpen && (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {createCourts.map((court) => (
                    <TouchableOpacity
                      key={court.id}
                      style={[
                        styles.dropdownItem,
                        createCourtId === court.id && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setCreateCourtId(court.id);
                        setCourtDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          createCourtId === court.id && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {court.name}
                      </Text>
                      {createCourtId === court.id && (
                        <BrandedIcon name="confirm" size={16} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Spots To Fill */}
        <Text style={styles.fieldLabel}>Spots To Fill</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => {
              const idx = PLAYER_COUNT_OPTIONS.indexOf(createPlayerCount);
              if (idx > 0) setCreatePlayerCount(PLAYER_COUNT_OPTIONS[idx - 1]);
            }}
            disabled={createPlayerCount === PLAYER_COUNT_OPTIONS[0]}
          >
            <BrandedIcon
              name="minus"
              size={20}
              color={
                createPlayerCount === PLAYER_COUNT_OPTIONS[0]
                  ? colors.textMuted
                  : colors.text
              }
            />
          </TouchableOpacity>
          <View style={styles.stepperValue}>
            <Text style={styles.stepperValueText}>{createPlayerCount}</Text>
          </View>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => {
              const idx = PLAYER_COUNT_OPTIONS.indexOf(createPlayerCount);
              if (idx < PLAYER_COUNT_OPTIONS.length - 1)
                setCreatePlayerCount(PLAYER_COUNT_OPTIONS[idx + 1]);
            }}
            disabled={
              createPlayerCount ===
              PLAYER_COUNT_OPTIONS[PLAYER_COUNT_OPTIONS.length - 1]
            }
          >
            <BrandedIcon
              name="add"
              size={20}
              color={
                createPlayerCount ===
                PLAYER_COUNT_OPTIONS[PLAYER_COUNT_OPTIONS.length - 1]
                  ? colors.textMuted
                  : colors.text
              }
            />
          </TouchableOpacity>
        </View>

        {/* Skill Level */}
        <Text style={styles.fieldLabel}>Skill Level (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 3.0-3.5"
          placeholderTextColor={colors.inputPlaceholder}
          value={createSkillLevel}
          onChangeText={setCreateSkillLevel}
          autoCapitalize="none"
        />

        {/* Message */}
        <Text style={styles.fieldLabel}>Message (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          placeholder="Looking for competitive doubles..."
          placeholderTextColor={colors.inputPlaceholder}
          value={createMessage}
          onChangeText={(t) => setCreateMessage(t.slice(0, 255))}
          maxLength={255}
          multiline
          numberOfLines={3}
        />
        <Text style={styles.charCount}>{createMessage.length}/255</Text>

        {/* Duration */}
        <Text style={styles.fieldLabel}>Duration</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.durationChip,
                createDuration === opt.value && styles.durationChipActive,
              ]}
              onPress={() => setCreateDuration(opt.value)}
            >
              <Text
                style={[
                  styles.durationChipText,
                  createDuration === opt.value && styles.durationChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Go Live Button */}
        <TouchableOpacity
          style={[styles.goLiveButton, loading && styles.buttonDisabled]}
          onPress={handleGoLive}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <BrandedIcon name="live" size={20} color="#ffffff" />
              <Text style={styles.goLiveText}>Go Live</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ========================
  // VIEW 3: Lobby
  // ========================
  const renderLobby = () => {
    const syncStatus: 'connected' | 'syncing' | 'disconnected' = lobby
      ? 'connected'
      : 'syncing';

    return (
      <ScrollView style={styles.flex} alwaysBounceHorizontal={false} contentContainerStyle={styles.lobbyContent}>
        {/* Back */}
        <TouchableOpacity style={styles.backButton} onPress={handleLeaveLobby}>
          <BrandedIcon name="back" size={20} color={colors.text} />
          <Text style={styles.backText}>Leave Lobby</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Lobby</Text>
        {lobby?.court_name ? (
          <Text style={styles.sectionSubtitle}>{lobby.court_name}</Text>
        ) : null}

        {/* Status */}
        <StatusBox
          label={syncStatus === 'connected' ? 'Connected' : 'Syncing...'}
          status={syncStatus}
          detail={lobby ? `${confirmedCount}/${lobby.target_players} confirmed` : undefined}
        />

        {/* Members */}
        <View style={styles.membersSection}>
          <Text style={styles.fieldLabel}>Players</Text>
          <View style={styles.confirmedCounter}>
            <Text style={styles.confirmedCounterText}>
              {confirmedCount} / {lobby?.target_players || '?'} confirmed
            </Text>
          </View>

          {members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberLeft}>
                <BrandedIcon
                  name={member.gender === 'F' ? 'gender-female' : 'gender-male'}
                  size={18}
                  color={member.gender === 'F' ? colors.female : colors.male}
                />
                <Text style={styles.memberName}>
                  {member.first_name} {member.last_name}
                </Text>
              </View>
              <View style={styles.memberRight}>
                {member.reliability_pct !== null && (
                  <View style={styles.reliabilityRow}>
                    <BrandedIcon name="reliability" size={12} color={colors.accent} />
                    <Text style={styles.reliabilitySmallText}>
                      {member.reliability_pct}%
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.statusBadge,
                    member.status === 'confirmed'
                      ? styles.statusConfirmed
                      : member.status === 'left'
                      ? styles.statusLeft
                      : member.status === 'seeking_replacement'
                      ? styles.statusSeekingReplacement
                      : member.status === 'replaced'
                      ? styles.statusReplaced
                      : styles.statusJoined,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      member.status === 'confirmed' && { color: '#ffffff' },
                      member.status === 'seeking_replacement' && { color: '#FF9500' },
                      member.status === 'replaced' && { color: '#8E8E93' },
                    ]}
                  >
                    {member.status === 'confirmed'
                      ? 'Confirmed'
                      : member.status === 'left'
                      ? 'Left'
                      : member.status === 'seeking_replacement'
                      ? 'Seeking Sub'
                      : member.status === 'replaced'
                      ? 'Replaced'
                      : 'Joined'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        {error ? (
          <View style={styles.errorContainer}>
            <WarningBox text={error} />
          </View>
        ) : null}

        {isHost && lobby?.status === 'gathering' && allConfirmed && (
          <TouchableOpacity
            style={[styles.accentButtonLarge, loading && styles.buttonDisabled]}
            onPress={handleLockMatch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <BrandedIcon name="lock" size={20} color="#ffffff" />
                <Text style={styles.accentButtonLargeText}>Lock Match</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isHost && lobby?.status === 'gathering' && !allConfirmed && (
          <InfoBox text="Waiting for all players to confirm before you can lock the match." />
        )}

        {!isHost && myMember?.status === 'joined' && (
          <TouchableOpacity
            style={[styles.accentButtonLarge, loading && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <BrandedIcon name="confirm" size={20} color="#ffffff" />
                <Text style={styles.accentButtonLargeText}>Confirm</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {!isHost && myMember?.status === 'confirmed' && (
          <>
            <InfoBox text="You are confirmed. Waiting for the host to lock the match." />
            <TouchableOpacity
              style={styles.dangerButtonLarge}
              onPress={() => {
                Alert.alert(
                  "Can't Make It?",
                  'Your reliability will be PROTECTED if someone fills your spot. The system will broadcast your spot to verified players.',
                  [
                    { text: 'Never Mind', style: 'cancel' },
                    {
                      text: 'Find Replacement',
                      style: 'destructive',
                      onPress: async () => {
                        if (lobby) {
                          const reqId = await requestReplacement(lobby.id);
                          if (reqId) {
                            haptic.tap();
                          }
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <BrandedIcon name="sync" size={16} color={colors.danger} />
              <Text style={styles.dangerButtonLargeText}>Can't Make It</Text>
            </TouchableOpacity>
          </>
        )}

        {!isHost && myMember?.status === 'seeking_replacement' && (
          <>
            <WarningBox text="You are seeking a replacement. Your reliability will be protected if someone fills your spot." />
            <TouchableOpacity
              style={[styles.accentButtonLarge, loading && styles.buttonDisabled]}
              onPress={() => {
                const myRequest = replacementRequests.find(r => r.departing_user_id === userId && r.status === 'open');
                if (myRequest) {
                  Alert.alert(
                    'Cancel Replacement Request?',
                    "Great news! You'll be restored to confirmed status.",
                    [
                      { text: 'No', style: 'cancel' },
                      {
                        text: "I Can Make It!",
                        onPress: async () => {
                          const success = await cancelReplacement(myRequest.id);
                          if (success) {
                            haptic.confirm();
                          }
                        },
                      },
                    ]
                  );
                }
              }}
              disabled={loading}
            >
              <BrandedIcon name="confirm" size={20} color="#ffffff" />
              <Text style={styles.accentButtonLargeText}>I Can Make It!</Text>
            </TouchableOpacity>
          </>
        )}

        {!isHost && myMember?.status === 'replaced' && (
          <InfoBox text="You have been replaced. Your reliability is protected -- no impact to your score." />
        )}
      </ScrollView>
    );
  };

  // ========================
  // VIEW 4: Locked Preview
  // ========================
  const renderLocked = () => {
    const schedule = lobby?.schedule_json;
    const matchQuality = lobby?.match_quality_percent;

    return (
      <ScrollView style={styles.flex} alwaysBounceHorizontal={false} contentContainerStyle={styles.lockedContent}>
        <Text style={styles.sectionTitle}>Match Preview</Text>

        {/* Match Quality */}
        {matchQuality !== null && matchQuality !== undefined && (
          <View style={styles.qualityCard}>
            <BrandedIcon name="matchquality" size={32} color={colors.accent} />
            <Text style={styles.qualityPercent}>{matchQuality}%</Text>
            <Text style={styles.qualityLabel}>Match Quality</Text>
          </View>
        )}

        {/* Schedule Preview */}
        {schedule && Array.isArray(schedule) && schedule.length > 0 ? (
          <View style={styles.scheduleSection}>
            <Text style={styles.fieldLabel}>Schedule</Text>
            {schedule.map((round: any, roundIndex: number) => (
              <View key={roundIndex} style={styles.roundCard}>
                <Text style={styles.roundTitle}>Round {roundIndex + 1}</Text>
                {Array.isArray(round.games) &&
                  round.games.map((game: any, gameIndex: number) => (
                    <View key={gameIndex} style={styles.gameRow}>
                      <Text style={styles.gameTeam}>
                        {Array.isArray(game.team1)
                          ? game.team1.map((p: any) => p.first_name).join(' & ')
                          : 'Team 1'}
                      </Text>
                      <Text style={styles.gameVs}>vs</Text>
                      <Text style={styles.gameTeam}>
                        {Array.isArray(game.team2)
                          ? game.team2.map((p: any) => p.first_name).join(' & ')
                          : 'Team 2'}
                      </Text>
                    </View>
                  ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Host: Start Match */}
        {isHost && (
          <TouchableOpacity
            style={[styles.goLiveButton, loading && styles.buttonDisabled]}
            onPress={handleStartMatch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <BrandedIcon name="start" size={20} color="#ffffff" />
                <Text style={styles.goLiveText}>Start Match</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <InfoBox text="All players will be auto-navigated to the scoring screen." />

        {!isHost && (
          <InfoBox text="Waiting for the host to start the match." />
        )}
      </ScrollView>
    );
  };

  // ========================
  // MAIN RENDER
  // ========================
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      {view === 'feed' && renderFeed()}
      {view === 'mode_select' && renderModeSelect()}
      {view === 'create_casual' && renderCreateCasual()}
      {view === 'create_structured' && renderCreateStructured()}
      {view === 'lobby' && renderLobby()}
      {view === 'locked' && renderLocked()}

      </KeyboardAvoidingView>

      {/* Profile Completion Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModal}>
            <Text style={styles.profileModalTitle}>Complete Your Profile</Text>
            <Text style={styles.profileModalSubtitle}>
              Enter your name to start creating beacons and connecting with players.
            </Text>

            <Text style={styles.profileLabel}>FIRST NAME</Text>
            <TextInput
              style={styles.profileInput}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
              value={profileFirstName}
              onChangeText={setProfileFirstName}
              autoFocus
              maxLength={50}
            />

            <Text style={styles.profileLabel}>LAST NAME</Text>
            <TextInput
              style={styles.profileInput}
              placeholder="Last name (optional)"
              placeholderTextColor={colors.textMuted}
              value={profileLastName}
              onChangeText={setProfileLastName}
              maxLength={50}
            />

            <TouchableOpacity
              style={[styles.accentButtonLarge, savingProfile && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.accentButtonLargeText}>Save & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileCancelButton}
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={styles.profileCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ========================
// STYLES
// ========================
const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    flex: {
      flex: 1,
    },

    // --- Header ---
    header: {
      paddingHorizontal: SPACING.screenPadding,
      paddingTop: 8,
      paddingBottom: 12,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 28,
      color: c.text,
    },

    // --- Location Warning ---
    locationWarning: {
      backgroundColor: c.gold + '20',
      borderWidth: 1,
      borderColor: c.gold,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: SPACING.screenPadding,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    locationWarningTitle: {
      color: c.text,
      fontFamily: FONT_BODY_BOLD,
      fontSize: 13,
    },
    locationWarningText: {
      color: c.textMuted,
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 12,
      marginTop: 2,
    },

    // --- Map Card ---
    mapCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden' as const,
      marginHorizontal: SPACING.screenPadding,
      marginBottom: 16,
    },
    mapImageContainer: {
      width: '100%' as const,
      height: 200,
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    mapImage: {
      width: '100%' as const,
      height: '100%' as const,
    },
    mapPlaceholder: {
      backgroundColor: c.surfaceLight,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    mapPlaceholderText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 13,
      color: c.textMuted,
    },
    beaconOverlayContainer: {
      position: 'absolute' as const,
      top: '50%' as unknown as number,
      left: '50%' as unknown as number,
      width: 60,
      height: 60,
      marginLeft: -30,
      marginTop: -30,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pulseRing: {
      position: 'absolute' as const,
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: c.accent,
      backgroundColor: 'transparent',
    },
    beaconDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.accent,
      borderWidth: 3,
      borderColor: '#ffffff',
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
      elevation: 6,
    },
    mapTimeBadge: {
      position: 'absolute' as const,
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    mapTimeText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 12,
      color: '#ffffff',
    },
    mapCardInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.cardPadding,
      paddingVertical: 12,
    },
    mapCardInfoLeft: {
      flex: 1,
      gap: 2,
    },
    mapCardCourtName: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 16,
      color: c.text,
    },
    mapCardCreatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mapCardCreator: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 13,
      color: c.textMuted,
    },
    mapCardDistance: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 12,
      color: c.textSoft,
    },
    mapCardBadgeCasual: {
      backgroundColor: 'rgba(135,202,55,0.15)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    mapCardBadgeCasualText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
      color: c.accent,
    },
    mapCardBadgeStructured: {
      backgroundColor: 'rgba(255,210,63,0.15)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    mapCardBadgeStructuredText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
      color: '#FFD23F',
    },
    mapCardChatBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: c.accent + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    mapCardChatBadgeText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
      color: c.accent,
    },
    mapCardCreatorActions: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: SPACING.cardPadding,
      paddingBottom: 12,
    },

    // --- Beacon Detail Modal ---
    beaconDetailModal: {
      backgroundColor: c.modalBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%' as unknown as number,
      overflow: 'hidden' as const,
    },
    detailMapImage: {
      width: '100%' as const,
      height: 200,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    detailCloseBtn: {
      position: 'absolute' as const,
      top: 12,
      right: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    detailContent: {
      padding: SPACING.cardPadding,
    },
    detailCourtName: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 22,
      color: c.text,
      marginBottom: 4,
    },
    detailInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    detailCreator: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: c.textMuted,
    },
    detailDistance: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 12,
      color: c.textSoft,
    },
    detailBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    directionsButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      backgroundColor: '#4285F4',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    directionsButtonText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: '#ffffff',
    },
    expiredBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      backgroundColor: c.danger + '15',
      borderWidth: 1,
      borderColor: c.danger + '40',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginTop: 16,
    },
    expiredBannerText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 15,
      color: c.danger,
    },

    // --- Empty State Create Button ---
    emptyCreateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.accent,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 16,
    },
    emptyCreateButtonText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 15,
      color: '#ffffff',
    },

    // --- History Dropdown ---
    historyDropdownContainer: {
      paddingHorizontal: SPACING.screenPadding,
      marginTop: 16,
    },
    historyDropdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surfaceLight,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 8,
    },
    historyDropdownTitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 15,
      color: c.text,
    },

    // --- Court Filter (legacy, unused) ---
    courtFilterScroll: {
      maxHeight: 48,
      marginBottom: 8,
    },
    courtFilterContent: {
      paddingHorizontal: SPACING.screenPadding,
      gap: 8,
      alignItems: 'center',
    },
    courtChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.border,
    },
    courtChipActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    courtChipText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 13,
      color: c.textMuted,
    },
    courtChipTextActive: {
      color: '#ffffff',
    },

    // --- Feed ---
    feedList: {
      paddingHorizontal: SPACING.screenPadding,
      paddingBottom: 100,
      gap: 12,
    },

    // --- Empty State ---
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.screenPadding,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 18,
      color: c.text,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 14,
      color: c.textMuted,
      textAlign: 'center',
    },

    // --- Card ---
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: SPACING.cardPadding,
    },
    cardExpired: {
      opacity: 0.5,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    cardHeaderLeft: {
      flexDirection: 'column',
      gap: 4,
    },
    cardCreator: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 16,
      color: c.text,
    },
    reliabilityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    reliabilityText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 12,
      color: c.accent,
    },
    reliabilitySmallText: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 11,
      color: c.accent,
    },
    timeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.glassBg,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    timeText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 12,
      color: c.accent,
    },
    cardBody: {
      gap: 6,
      marginBottom: 12,
    },
    cardInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardInfoText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 13,
      color: c.textSoft,
    },
    cardMessage: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 13,
      color: c.textMuted,
      marginTop: 4,
      fontStyle: 'italic',
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },

    // --- Buttons ---
    accentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.accent,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 14,
    },
    accentButtonText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: '#ffffff',
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surfaceLight,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 14,
    },
    secondaryButtonText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: c.text,
    },
    accentButtonLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.accent,
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: SPACING.sectionSpacing,
    },
    accentButtonLargeText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 16,
      color: '#ffffff',
    },
    buttonDisabled: {
      opacity: 0.6,
    },

    // --- FAB ---
    fab: {
      position: 'absolute',
      bottom: 24,
      right: SPACING.screenPadding,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.accent,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 28,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    fabText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 15,
      color: '#ffffff',
    },

    // --- Back Button ---
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      marginBottom: 8,
    },
    backText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 15,
      color: c.text,
    },

    // --- Section ---
    sectionTitle: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 26,
      color: c.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 16,
      color: c.textMuted,
      marginBottom: SPACING.sectionSpacing,
    },

    // --- Create Form ---
    createContent: {
      paddingHorizontal: SPACING.screenPadding,
      paddingBottom: 40,
    },
    fieldLabel: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: c.text,
      marginTop: SPACING.sectionSpacing,
      marginBottom: 10,
    },
    fieldSpacer: {
      marginVertical: 12,
    },
    dropdownTrigger: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    dropdownTriggerOpen: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderColor: c.accent,
    },
    dropdownTriggerText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 15,
      color: c.text,
    },
    dropdownPlaceholder: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 15,
      color: c.textMuted,
    },
    dropdownList: {
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: c.accent,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      backgroundColor: c.card,
      overflow: 'hidden' as const,
    },
    dropdownScroll: {
      maxHeight: 200,
    },
    dropdownItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    dropdownItemSelected: {
      backgroundColor: c.accentSoft,
    },
    dropdownItemText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: c.textSoft,
    },
    dropdownItemTextSelected: {
      color: c.text,
      fontFamily: FONT_BODY_BOLD,
    },

    // --- Stepper ---
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    stepperButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepperValue: {
      width: 56,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepperValueText: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 20,
      color: c.text,
    },

    // --- Text Input ---
    textInput: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: c.inputText,
    },
    textInputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    charCount: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 11,
      color: c.textMuted,
      textAlign: 'right',
      marginTop: 4,
    },

    // --- Duration ---
    durationRow: {
      flexDirection: 'row',
      gap: 10,
    },
    durationChip: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    durationChipActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    durationChipText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 13,
      color: c.textMuted,
    },
    durationChipTextActive: {
      color: '#ffffff',
    },

    // --- Go Live Button ---
    goLiveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.accent,
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: SPACING.sectionSpacing + 8,
    },
    goLiveText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 16,
      color: '#ffffff',
    },

    // --- Lobby ---
    lobbyContent: {
      paddingHorizontal: SPACING.screenPadding,
      paddingBottom: 40,
    },
    membersSection: {
      marginTop: SPACING.sectionSpacing,
    },
    confirmedCounter: {
      backgroundColor: c.glassBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    confirmedCounterText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 13,
      color: c.accent,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
    },
    memberLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    memberName: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: c.text,
    },
    memberRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusJoined: {
      backgroundColor: c.surfaceLight,
    },
    statusConfirmed: {
      backgroundColor: c.accent,
    },
    statusLeft: {
      backgroundColor: `rgba(255,71,87,0.15)`,
    },
    statusSeekingReplacement: {
      backgroundColor: 'rgba(255,149,0,0.15)',
    },
    statusReplaced: {
      backgroundColor: 'rgba(142,142,147,0.15)',
    },
    statusBadgeText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 11,
      color: c.textMuted,
    },

    // --- Locked Preview ---
    lockedContent: {
      paddingHorizontal: SPACING.screenPadding,
      paddingTop: SPACING.sectionSpacing,
      paddingBottom: 40,
    },
    qualityCard: {
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: SPACING.sectionSpacing,
      marginTop: SPACING.sectionSpacing,
      gap: 8,
    },
    qualityPercent: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 48,
      color: c.accent,
    },
    qualityLabel: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: c.textMuted,
    },
    scheduleSection: {
      marginTop: SPACING.sectionSpacing,
    },
    roundCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: SPACING.cardPadding,
      marginBottom: 10,
    },
    roundTitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 15,
      color: c.text,
      marginBottom: 10,
    },
    gameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    gameTeam: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 13,
      color: c.textSoft,
      flex: 1,
      textAlign: 'center',
    },
    gameVs: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 12,
      color: c.textMuted,
    },

    // --- Error ---
    errorContainer: {
      paddingHorizontal: SPACING.screenPadding,
      marginBottom: 8,
    },

    // --- Profile Modal ---
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    profileModal: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 380,
    },
    profileModalTitle: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 20,
      color: c.text,
      textAlign: 'center' as const,
      marginBottom: 8,
    },
    profileModalSubtitle: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 14,
      color: c.textMuted,
      textAlign: 'center' as const,
      marginBottom: 20,
      lineHeight: 20,
    },
    profileLabel: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
      color: c.textMuted,
      letterSpacing: 1.5,
      marginBottom: 6,
      marginTop: 8,
    },
    profileInput: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 16,
      color: c.text,
      marginBottom: 8,
    },
    profileCancelButton: {
      alignItems: 'center' as const,
      paddingVertical: 12,
      marginTop: 4,
    },
    profileCancelText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: c.textMuted,
    },

    // --- Creator Actions ---
    creatorActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      flex: 1,
    },
    dangerButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: 'rgba(255,59,48,0.1)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
    },
    dangerButtonLarge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      borderWidth: 2,
      borderColor: c.danger,
      backgroundColor: 'rgba(255,59,48,0.08)',
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 12,
    },
    dangerButtonLargeText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 15,
      color: c.danger,
    },

    // --- Replacement Banner ---
    replacementBanner: {
      backgroundColor: 'rgba(255,149,0,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,149,0,0.3)',
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
    },
    replacementBannerTextRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginBottom: 10,
    },
    replacementBannerText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 13,
      color: '#FF9500',
      flex: 1,
    },
    replacementButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 6,
      backgroundColor: c.accent,
      paddingVertical: 10,
      borderRadius: 10,
    },
    replacementButtonText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: '#ffffff',
    },

    // --- History Section ---
    feedScrollContent: {
      paddingBottom: 20,
    },
    emptyBlock: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 60,
    },
    historySection: {
      paddingHorizontal: SPACING.screenPadding,
      marginTop: 16,
    },
    historySectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
      gap: 12,
    },
    historyDivider: {
      flex: 1,
      height: 1,
      backgroundColor: c.border,
    },
    historySectionTitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 13,
      color: c.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
    },
    historyCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      opacity: 0.6,
    },
    historyCardTop: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 6,
    },
    historyCreator: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: c.text,
    },
    historyBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    historyBadgeCompleted: {
      backgroundColor: 'rgba(135,202,55,0.15)',
    },
    historyBadgeCancelled: {
      backgroundColor: 'rgba(255,59,48,0.15)',
    },
    historyBadgeText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
    },
    historyBadgeTextCompleted: {
      color: c.accent,
    },
    historyBadgeTextCancelled: {
      color: c.danger,
    },
    historyCardDetails: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
    },
    historyDetailText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 12,
      color: c.textMuted,
    },
    historyDot: {
      color: c.textMuted,
      fontSize: 12,
    },

    // --- Chat Notification Banner ---
    chatNotificationBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: c.accent,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      marginBottom: 10,
    },
    chatNotificationText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: '#ffffff',
      flex: 1,
    },

    // --- Canned Messages ---
    cannedRow: {
      marginBottom: 8,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    cannedRowContent: {
      gap: 6,
      paddingRight: 4,
    },
    cannedChip: {
      backgroundColor: c.surfaceLight,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.border,
    },
    cannedChipText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 12,
      color: c.textSoft,
    },

    // --- Chat ---
    chatToggleButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: c.surface,
      marginLeft: 8,
    },
    chatToggleText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 13,
      color: c.textMuted,
    },
    chatPanel: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 10,
    },
    chatEmpty: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 13,
      color: c.textMuted,
      textAlign: 'center' as const,
      paddingVertical: 12,
    },
    chatMessageList: {
      maxHeight: 200,
      marginBottom: 8,
    },
    chatBubble: {
      maxWidth: '80%' as any,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      marginBottom: 6,
    },
    chatBubbleMine: {
      backgroundColor: c.accent,
      alignSelf: 'flex-end' as const,
      borderBottomRightRadius: 4,
    },
    chatBubbleOther: {
      backgroundColor: c.surfaceLight,
      alignSelf: 'flex-start' as const,
      borderBottomLeftRadius: 4,
    },
    chatSender: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 13,
      marginBottom: 3,
    },
    chatSenderOther: {
      color: c.accent,
    },
    chatSenderMine: {
      color: 'rgba(255,255,255,0.85)',
    },
    chatText: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 14,
      color: c.text,
    },
    chatTextMine: {
      color: '#ffffff',
    },
    chatTime: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 10,
      color: c.textMuted,
      marginTop: 2,
      textAlign: 'right' as const,
    },
    chatTimeMine: {
      color: 'rgba(255,255,255,0.6)',
    },
    chatInputRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    chatTextInput: {
      flex: 1,
      backgroundColor: c.inputBg,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 14,
      color: c.text,
    },
    chatSendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    // --- Mode Select Cards ---
    modeCard: {
      borderWidth: 2,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center' as const,
      gap: 12,
      marginBottom: 16,
    },
    modeCardCasual: {
      borderColor: c.accent,
      backgroundColor: c.card,
    },
    modeCardStructured: {
      borderColor: '#FFD23F',
      backgroundColor: c.card,
    },
    modeCardTitle: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 22,
      color: c.text,
      textAlign: 'center' as const,
    },
    modeCardSubtitle: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 14,
      color: c.textMuted,
      textAlign: 'center' as const,
      lineHeight: 20,
    },

    // --- Type Badges ---
    casualBadge: {
      backgroundColor: 'rgba(135,202,55,0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    casualBadgeText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
      color: c.accent,
    },
    structuredBadge: {
      backgroundColor: 'rgba(255,210,63,0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    structuredBadgeText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
      color: '#FFD23F',
    },

    // --- Card Type Variants ---
    cardCasual: {
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
    },
    cardStructured: {
      borderLeftWidth: 3,
      borderLeftColor: '#FFD23F',
    },

    // --- On My Way Button ---
    onMyWayButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: c.accent,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 14,
    },
    respondedButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: c.accent,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 14,
    },
    onMyWayButtonText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: '#ffffff',
    },
    respondedButtonText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: c.accent,
    },

    // --- Go Live Casual ---
    goLiveButtonCasual: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      backgroundColor: c.accent,
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: SPACING.sectionSpacing + 8,
    },
  });
