import { BrandedIcon } from '../../components/BrandedIcon';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import {
  ThemeColors,
  FONT_DISPLAY_BOLD,
  FONT_DISPLAY_EXTRABOLD,
  FONT_DISPLAY_BLACK,
  FONT_BODY_REGULAR,
  FONT_BODY_MEDIUM,
  FONT_BODY_BOLD,
  FONT_BODY_SEMIBOLD,
} from '../../constants/theme';
import { haptic } from '../../utils/haptics';
import { useInviteChat, InviteChatMessage } from '../../hooks/useInviteChat';
import { KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

interface CourtItem {
  id: number;
  name: string;
  city: string;
  state: string;
  address: string;
}

interface PoolPlayer {
  id: number;
  first_name: string;
  last_name: string;
  gender: string | null;
  play_level: string | null;
  days_to_play: string;
  times_to_play: string;
  cities_to_play: string;
}

interface Invite {
  id: number;
  court_name: string;
  court_address: string;
  match_date: string;
  match_time: string;
  max_spots: number;
  spots_left: number;
  match_code: string;
  cost: string;
  match_type: string;
  status: string;
  created_at: string;
  confirmed: number;
  interested: number;
  declined: number;
  pending: number;
  waitlisted: number;
}

interface CreditPackage {
  credits: number;
  price: string;
  priceNum: number;
  perCredit: string;
  popular?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 20, price: '$1', priceNum: 1, perCredit: '$0.05' },
  { credits: 120, price: '$5', priceNum: 5, perCredit: '$0.042' },
  { credits: 300, price: '$10', priceNum: 10, perCredit: '$0.033', popular: true },
  { credits: 600, price: '$18', priceNum: 18, perCredit: '$0.030' },
  { credits: 1200, price: '$33', priceNum: 33, perCredit: '$0.028' },
  { credits: 2400, price: '$60', priceNum: 60, perCredit: '$0.025' },
  { credits: 5000, price: '$120', priceNum: 120, perCredit: '$0.024' },
];

type TabView = 'invites' | 'players' | 'credits';
type InviteModalStep = 'details' | 'select-players' | 'confirm' | 'results';

export default function InvitesScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { isPro, isAdmin, showPaywall } = useSubscription();
  const { userId } = useAuth();

  const [activeTab, setActiveTab] = useState<TabView>('invites');
  const [loading, setLoading] = useState(false);

  // Courts
  const [allCourts, setAllCourts] = useState<CourtItem[]>([]);
  const [courtSearch, setCourtSearch] = useState('');
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<CourtItem | null>(null);

  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [inviteStep, setInviteStep] = useState<InviteModalStep>('details');

  // New invite form
  const [courtName, setCourtName] = useState('');
  const [courtAddress, setCourtAddress] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [maxSpots, setMaxSpots] = useState('4');
  const [messagebody, setMessageBody] = useState('');
  const [cost, setCost] = useState('Free');
  const [matchType, setMatchType] = useState('Open Play');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSpotsPicker, setShowSpotsPicker] = useState(false);
  const [showCostPicker, setShowCostPicker] = useState(false);

  // Players
  const [poolPlayers, setPoolPlayers] = useState<PoolPlayer[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerFilter, setPlayerFilter] = useState<{ level?: string; gender?: string }>({});
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [playerPage, setPlayerPage] = useState(1);
  const [hasMorePlayers, setHasMorePlayers] = useState(true);

  // Credits
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  // Current invite being created
  const [createdInviteId, setCreatedInviteId] = useState<number | null>(null);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sendResults, setSendResults] = useState<{ sentNames: string[]; failedNames: string[]; sentCount: number; failedCount: number } | null>(null);

  // Invite detail modal
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [inviteResponses, setInviteResponses] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatListRef = useRef<FlatList>(null);
  const { messages: chatMessages, isLoading: chatLoading, sendMessage: sendChatMessage, startPolling: startChatPolling, stopPolling: stopChatPolling } = useInviteChat();

  const [error, setError] = useState('');

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadInvites();
        loadCredits();
      }
    }, [userId])
  );

  const loadInvites = async () => {
    try {
      const res = await fetch(`${API_URL}/invite_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setInvites(data.invites || []);
      }
    } catch {}
  };

  const loadCredits = async () => {
    try {
      const res = await fetch(`${API_URL}/sms_credits_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'balance', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setCreditBalance(data.credits || 0);
      }
    } catch {}
  };

  const loadPlayers = async (page = 1, append = false, searchOverride?: string) => {
    setLoading(true);
    try {
      const searchTerm = searchOverride !== undefined ? searchOverride : playerSearch;
      const res = await fetch(`${API_URL}/pool_players_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          user_id: userId,
          page,
          per_page: 500,
          search_name: searchTerm || undefined,
          ...playerFilter,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (append) {
          setPoolPlayers(prev => [...prev, ...(data.players || [])]);
        } else {
          setPoolPlayers(data.players || []);
        }
        setHasMorePlayers((data.players || []).length === 500);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'players') {
      setPlayerPage(1);
      loadPlayers(1);
    }
  }, [activeTab, playerFilter]);

  // Debounced search — works on Players tab AND in select-players invite step
  useEffect(() => {
    if (activeTab !== 'players' && inviteStep !== 'select-players') return;
    const timer = setTimeout(() => {
      setPlayerPage(1);
      loadPlayers(1, false, playerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [playerSearch]);

  const handleCreateInvite = async () => {
    if (!courtName.trim()) { setError('Court name is required'); return; }
    if (!matchDate.trim()) { setError('Match date is required'); return; }
    if (!matchTime.trim()) { setError('Match time is required'); return; }

    setError('');
    setInviteStep('select-players');
    loadPlayers(1);
  };

  const togglePlayerSelection = (id: number) => {
    haptic.tap();
    setSelectedPlayers(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSendInvites = async () => {
    if (selectedPlayers.length === 0) { setError('Select at least one player'); return; }
    if (!isAdmin && selectedPlayers.length > creditBalance) {
      setError(`Not enough credits. You need ${selectedPlayers.length} but have ${creditBalance}.`);
      return;
    }

    setError('');
    setSendingInvites(true);
    try {
      // Step 1: Create the invite
      const createRes = await fetch(`${API_URL}/invite_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          user_id: userId,
          court_name: courtName,
          court_address: courtAddress,
          match_date: matchDate,
          match_time: matchTime,
          max_spots: parseInt(maxSpots) || 4,
          message_body: messagebody,
          cost,
          match_type: matchType,
        }),
      });
      const createData = await createRes.json();
      if (createData.status !== 'success') {
        setError(createData.message || 'Failed to create invite');
        setSendingInvites(false);
        return;
      }

      const inviteId = createData.invite_id;

      // Step 2: Send the invites
      const res = await fetch(`${API_URL}/invite_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          user_id: userId,
          invite_id: inviteId,
          player_ids: selectedPlayers,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        haptic.confirm();
        setSendResults({
          sentNames: data.sent_names || [],
          failedNames: data.failed_names || [],
          sentCount: data.sent_count || 0,
          failedCount: data.failed_count || 0,
        });
        setInviteStep('results');
        loadInvites();
        loadCredits();
      } else {
        setError(data.message || 'Failed to send invites');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSendingInvites(false);
  };

  const loadCourts = async () => {
    try {
      const res = await fetch(`${API_URL}/get_courts.php`);
      const data = await res.json();
      if (data.status === 'success') {
        setAllCourts(data.courts || []);
      }
    } catch {}
  };

  // Load courts once on mount
  useEffect(() => {
    loadCourts();
  }, []);

  const filteredCourts = useMemo(() => {
    if (!courtSearch.trim()) return allCourts;
    const term = courtSearch.toLowerCase();
    return allCourts.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term)
    );
  }, [allCourts, courtSearch]);

  // Generate next 30 days for date picker
  const dateOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const value = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      opts.push({ value, label: i === 0 ? `Today — ${label}` : i === 1 ? `Tomorrow — ${label}` : label });
    }
    return opts;
  }, []);

  // Time options every 30 min from 6:00 AM to 10:00 PM
  const timeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let h = 6; h <= 22; h++) {
      for (const m of ['00', '30']) {
        if (h === 22 && m === '30') continue;
        const value = `${String(h).padStart(2, '0')}:${m}`;
        const hour12 = h % 12 || 12;
        const ampm = h >= 12 ? 'PM' : 'AM';
        opts.push({ value, label: `${hour12}:${m} ${ampm}` });
      }
    }
    return opts;
  }, []);

  // Max spots 1–40
  const spotsOptions = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      value: String(i + 1),
      label: `${i + 1} player${i + 1 > 1 ? 's' : ''}`,
    }));
  }, []);

  // Cost options: Free, $5–$200
  const costOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: 'Free', label: 'Free' }];
    for (const amt of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90, 100, 125, 150, 175, 200]) {
      opts.push({ value: `$${amt}`, label: `$${amt}` });
    }
    return opts;
  }, []);

  const selectCourt = (court: CourtItem) => {
    setSelectedCourt(court);
    setCourtName(court.name);
    setCourtAddress(court.address ? `${court.address}, ${court.city}` : court.city);
    setCourtSearch('');
    setShowCourtPicker(false);
    haptic.tap();
  };

  const resetInviteForm = () => {
    setCourtName('');
    setCourtAddress('');
    setMatchDate('');
    setMatchTime('');
    setMaxSpots('4');
    setMessageBody('');
    setCost('Free');
    setMatchType('Open Play');
    setSelectedPlayers([]);
    setCreatedInviteId(null);
    setInviteStep('details');
    setError('');
    setSelectedCourt(null);
    setCourtSearch('');
    setShowCourtPicker(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowSpotsPicker(false);
    setShowCostPicker(false);
    setSendResults(null);
  };

  const viewInviteDetail = async (invite: Invite) => {
    setSelectedInvite(invite);
    setShowChat(false);
    try {
      const res = await fetch(`${API_URL}/invite_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detail', user_id: userId, invite_id: invite.id }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setInviteResponses(data.responses || []);
      }
    } catch {}
    // Start chat polling for this invite
    if (userId) {
      startChatPolling(invite.id, userId);
    }
  };

  const closeInviteDetail = () => {
    stopChatPolling();
    setSelectedInvite(null);
    setInviteResponses([]);
    setShowChat(false);
    setChatText('');
  };

  const handleSendChat = async () => {
    if (!chatText.trim() || !selectedInvite || !userId) return;
    setChatSending(true);
    const success = await sendChatMessage(selectedInvite.id, userId, chatText.trim());
    if (success) {
      setChatText('');
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
    setChatSending(false);
  };

  const handleBuyCredits = async (pkg: CreditPackage) => {
    try {
      const res = await fetch(`${API_URL}/sms_credits_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          user_id: userId,
          credits: pkg.credits,
        }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.checkout_url) {
        Linking.openURL(data.checkout_url);
      } else {
        Alert.alert('Error', data.message || 'Failed to create checkout session');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  // Premium gate (admins bypass)
  if (!isPro && !isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.premiumGate}>
          <BrandedIcon name="lock" size={48} color={colors.accent} />
          <Text style={styles.premiumTitle}>Premium Feature</Text>
          <Text style={styles.premiumSubtitle}>
            Upgrade to Pro to browse the player pool, create match invites, and send SMS invitations to players.
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => showPaywall()}>
            <Text style={styles.upgradeBtnText}>UPGRADE TO PRO</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>INVITES</Text>
        {!isAdmin && (
        <View style={styles.creditBadge}>
          <BrandedIcon name="flash" size={14} color={colors.accent} />
          <Text style={styles.creditText}>{creditBalance} credits</Text>
        </View>
        )}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabBar}>
        {((['invites', 'players', 'credits'] as TabView[]).filter(tab => !(isAdmin && tab === 'credits'))).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'invites' ? 'My Invites' : tab === 'players' ? 'Player Pool' : 'SMS Credits'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* INVITES TAB */}
      {activeTab === 'invites' && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              haptic.lock();
              setShowCreateInvite(true);
            }}
          >
            <BrandedIcon name="add" size={20} color="#0f1b2d" />
            <Text style={styles.createBtnText}>CREATE INVITE</Text>
          </TouchableOpacity>

          <FlatList
            data={invites}
            keyExtractor={i => i.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <BrandedIcon name="send" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>No invites yet</Text>
                <Text style={styles.emptySubtext}>Create your first match invite and start inviting players!</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.inviteCard}
                onPress={() => viewInviteDetail(item)}
              >
                <View style={styles.inviteCardHeader}>
                  <Text style={styles.inviteCourtName}>{item.court_name || 'Match'}</Text>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'active' && { backgroundColor: 'rgba(135,202,55,0.15)' },
                    item.status === 'cancelled' && { backgroundColor: 'rgba(255,71,87,0.15)' },
                    item.status === 'completed' && { backgroundColor: 'rgba(255,255,255,0.08)' },
                  ]}>
                    <Text style={[
                      styles.statusText,
                      item.status === 'active' && { color: colors.accent },
                      item.status === 'cancelled' && { color: colors.danger },
                    ]}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.inviteDateTime}>
                  {formatDate(item.match_date)} at {formatTime(item.match_time)}
                </Text>
                <View style={styles.inviteStats}>
                  <View style={styles.inviteStat}>
                    <Text style={[styles.inviteStatNum, { color: colors.accent }]}>{item.confirmed}</Text>
                    <Text style={styles.inviteStatLabel}>Confirmed</Text>
                  </View>
                  <View style={styles.inviteStat}>
                    <Text style={[styles.inviteStatNum, { color: '#ffd23f' }]}>{item.interested}</Text>
                    <Text style={styles.inviteStatLabel}>Interested</Text>
                  </View>
                  <View style={styles.inviteStat}>
                    <Text style={styles.inviteStatNum}>{item.pending}</Text>
                    <Text style={styles.inviteStatLabel}>Pending</Text>
                  </View>
                  <View style={styles.inviteStat}>
                    <Text style={[styles.inviteStatNum, { color: colors.danger }]}>{item.declined}</Text>
                    <Text style={styles.inviteStatLabel}>Declined</Text>
                  </View>
                  {(item.waitlisted > 0) && (
                    <View style={styles.inviteStat}>
                      <Text style={[styles.inviteStatNum, { color: '#f78c6b' }]}>{item.waitlisted}</Text>
                      <Text style={styles.inviteStatLabel}>Waitlist</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* PLAYER POOL TAB */}
      {activeTab === 'players' && (
        <View style={{ flex: 1 }}>
          {/* Search Bar */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.inputBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              paddingHorizontal: 12,
            }}>
              <BrandedIcon name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  fontFamily: FONT_BODY_REGULAR,
                  fontSize: 15,
                  color: colors.text,
                }}
                value={playerSearch}
                onChangeText={setPlayerSearch}
                placeholder="Search by name..."
                placeholderTextColor={colors.inputPlaceholder}
                autoCorrect={false}
              />
              {playerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPlayerSearch('')}>
                  <BrandedIcon name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.filterBar}>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, !playerFilter.gender && styles.filterChipActive]}
                onPress={() => setPlayerFilter(f => ({ ...f, gender: undefined }))}
              >
                <Text style={[styles.filterChipText, !playerFilter.gender && styles.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, playerFilter.gender === 'Male' && styles.filterChipActive]}
                onPress={() => setPlayerFilter(f => ({ ...f, gender: 'Male' }))}
              >
                <Text style={[styles.filterChipText, playerFilter.gender === 'Male' && styles.filterChipTextActive]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, playerFilter.gender === 'Female' && styles.filterChipActive]}
                onPress={() => setPlayerFilter(f => ({ ...f, gender: 'Female' }))}
              >
                <Text style={[styles.filterChipText, playerFilter.gender === 'Female' && styles.filterChipTextActive]}>Female</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={poolPlayers}
            keyExtractor={p => p.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            onEndReached={() => {
              if (hasMorePlayers && !loading) {
                const nextPage = playerPage + 1;
                setPlayerPage(nextPage);
                loadPlayers(nextPage, true);
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{ padding: 20 }} /> : null}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No players found</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = selectedPlayers.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.playerCard, isSelected && styles.playerCardSelected]}
                  onPress={() => togglePlayerSelection(item.id)}
                >
                  <View style={styles.playerInfo}>
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerName}>
                        {item.first_name} {item.last_name}
                      </Text>
                      {item.gender && (
                        <BrandedIcon
                          name={item.gender === 'Male' ? 'gender-male' : 'gender-female'}
                          size={14}
                          color={item.gender === 'Male' ? colors.male : colors.female}
                        />
                      )}
                    </View>
                    <View style={styles.playerMeta}>
                      {item.play_level && (
                        <Text style={styles.playerMetaText}>Lvl {item.play_level}</Text>
                      )}
                      <Text style={styles.playerMetaText}>{item.cities_to_play}</Text>
                    </View>
                    <Text style={styles.playerAvailability}>
                      {item.days_to_play} | {item.times_to_play}
                    </Text>
                  </View>
                  <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                    {isSelected && <BrandedIcon name="checkmark" size={14} color="#0f1b2d" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {selectedPlayers.length > 0 && !showCreateInvite && (
            <View style={styles.selectionBar}>
              <Text style={styles.selectionText}>
                {selectedPlayers.length} player{selectedPlayers.length > 1 ? 's' : ''} selected
              </Text>
              <TouchableOpacity
                style={styles.selectionBtn}
                onPress={() => {
                  setShowCreateInvite(true);
                  setInviteStep('details');
                }}
              >
                <Text style={styles.selectionBtnText}>CREATE INVITE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* SMS CREDITS TAB */}
      {activeTab === 'credits' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.creditCard}>
            <Text style={styles.creditCardLabel}>Your Balance</Text>
            <Text style={styles.creditCardAmount}>{creditBalance}</Text>
            <Text style={styles.creditCardSub}>SMS Credits</Text>
          </View>

          <Text style={styles.sectionTitle}>Buy Credits</Text>
          <Text style={styles.sectionSubtitle}>1 credit = 1 SMS invitation sent to a player</Text>

          {CREDIT_PACKAGES.map(pkg => (
            <TouchableOpacity
              key={pkg.credits}
              style={[styles.packageCard, pkg.popular && styles.packageCardPopular]}
              onPress={() => handleBuyCredits(pkg)}
            >
              {pkg.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                </View>
              )}
              <View style={styles.packageInfo}>
                <Text style={styles.packageCredits}>{pkg.credits.toLocaleString()} credits</Text>
                <Text style={styles.packagePerCredit}>{pkg.perCredit}/credit</Text>
              </View>
              <Text style={styles.packagePrice}>{pkg.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* CREATE INVITE MODAL */}
      <Modal visible={showCreateInvite} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {inviteStep === 'details' ? 'Match Details' :
                 inviteStep === 'select-players' ? 'Select Players' :
                 inviteStep === 'results' ? 'Invites Sent' : 'Confirm & Send'}
              </Text>
              <TouchableOpacity onPress={() => { setShowCreateInvite(false); resetInviteForm(); }}>
                <BrandedIcon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {error !== '' && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {inviteStep === 'details' && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.inputLabel}>Court *</Text>
                {selectedCourt ? (
                  <View style={styles.courtSelected}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courtSelectedName}>{selectedCourt.name}</Text>
                      <Text style={styles.courtSelectedAddr}>
                        {selectedCourt.address ? `${selectedCourt.address}, ${selectedCourt.city}` : selectedCourt.city}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCourt(null);
                        setCourtName('');
                        setCourtAddress('');
                        setShowCourtPicker(true);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <BrandedIcon name="close" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowCourtPicker(true)}
                    >
                      <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 16, color: colors.inputPlaceholder }}>
                        Tap to search courts...
                      </Text>
                    </TouchableOpacity>
                    {showCourtPicker && (
                      <View style={styles.courtPickerContainer}>
                        <View style={styles.courtSearchRow}>
                          <BrandedIcon name="search" size={18} color={colors.textMuted} />
                          <TextInput
                            style={styles.courtSearchInput}
                            value={courtSearch}
                            onChangeText={setCourtSearch}
                            placeholder="Search by court name or city..."
                            placeholderTextColor={colors.inputPlaceholder}
                            autoFocus
                          />
                          {courtSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setCourtSearch('')}>
                              <BrandedIcon name="close" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                          )}
                        </View>
                        <FlatList
                          data={filteredCourts}
                          keyExtractor={(item) => item.id.toString()}
                          style={{ maxHeight: 200 }}
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.courtPickerItem}
                              onPress={() => selectCourt(item)}
                            >
                              <Text style={styles.courtPickerName}>{item.name}</Text>
                              <Text style={styles.courtPickerCity}>{item.city}</Text>
                            </TouchableOpacity>
                          )}
                          ListEmptyComponent={
                            <Text style={styles.courtPickerEmpty}>No courts found</Text>
                          }
                        />
                      </View>
                    )}
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Date *</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); setShowSpotsPicker(false); setShowCostPicker(false); }}
                    >
                      <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 16, color: matchDate ? colors.inputText : colors.inputPlaceholder }}>
                        {matchDate ? dateOptions.find(o => o.value === matchDate)?.label || matchDate : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <View style={styles.courtPickerContainer}>
                        <FlatList
                          data={dateOptions}
                          keyExtractor={(item) => item.value}
                          style={{ maxHeight: 200 }}
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[styles.courtPickerItem, matchDate === item.value && { backgroundColor: colors.accent + '20' }]}
                              onPress={() => { setMatchDate(item.value); setShowDatePicker(false); haptic.tap(); }}
                            >
                              <Text style={[styles.courtPickerName, matchDate === item.value && { color: colors.accent }]}>{item.label}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Time *</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); setShowSpotsPicker(false); setShowCostPicker(false); }}
                    >
                      <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 16, color: matchTime ? colors.inputText : colors.inputPlaceholder }}>
                        {matchTime ? timeOptions.find(o => o.value === matchTime)?.label || matchTime : 'Select time'}
                      </Text>
                    </TouchableOpacity>
                    {showTimePicker && (
                      <View style={styles.courtPickerContainer}>
                        <FlatList
                          data={timeOptions}
                          keyExtractor={(item) => item.value}
                          style={{ maxHeight: 200 }}
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[styles.courtPickerItem, matchTime === item.value && { backgroundColor: colors.accent + '20' }]}
                              onPress={() => { setMatchTime(item.value); setShowTimePicker(false); haptic.tap(); }}
                            >
                              <Text style={[styles.courtPickerName, matchTime === item.value && { color: colors.accent }]}>{item.label}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Max Spots</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => { setShowSpotsPicker(!showSpotsPicker); setShowDatePicker(false); setShowTimePicker(false); setShowCostPicker(false); }}
                    >
                      <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 16, color: colors.inputText }}>
                        {spotsOptions.find(o => o.value === maxSpots)?.label || maxSpots}
                      </Text>
                    </TouchableOpacity>
                    {showSpotsPicker && (
                      <View style={styles.courtPickerContainer}>
                        <FlatList
                          data={spotsOptions}
                          keyExtractor={(item) => item.value}
                          style={{ maxHeight: 200 }}
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[styles.courtPickerItem, maxSpots === item.value && { backgroundColor: colors.accent + '20' }]}
                              onPress={() => { setMaxSpots(item.value); setShowSpotsPicker(false); haptic.tap(); }}
                            >
                              <Text style={[styles.courtPickerName, maxSpots === item.value && { color: colors.accent }]}>{item.label}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Cost</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => { setShowCostPicker(!showCostPicker); setShowDatePicker(false); setShowTimePicker(false); setShowSpotsPicker(false); }}
                    >
                      <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 16, color: colors.inputText }}>
                        {cost}
                      </Text>
                    </TouchableOpacity>
                    {showCostPicker && (
                      <View style={styles.courtPickerContainer}>
                        <FlatList
                          data={costOptions}
                          keyExtractor={(item) => item.value}
                          style={{ maxHeight: 200 }}
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[styles.courtPickerItem, cost === item.value && { backgroundColor: colors.accent + '20' }]}
                              onPress={() => { setCost(item.value); setShowCostPicker(false); haptic.tap(); }}
                            >
                              <Text style={[styles.courtPickerName, cost === item.value && { color: colors.accent }]}>{item.label}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.inputLabel}>Message to Players</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={messagebody}
                  onChangeText={setMessageBody}
                  placeholder="Optional message included in the SMS"
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                />

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleCreateInvite}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f1b2d" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {selectedPlayers.length > 0 ? 'NEXT: CONFIRM & SEND' : 'NEXT: SELECT PLAYERS'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            {inviteStep === 'select-players' && (
              <View style={{ flex: 1 }}>
                {selectedPlayers.length > 0 && (
                  <View style={{ backgroundColor: colors.accent + '12', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ fontFamily: FONT_DISPLAY_BOLD, fontSize: 12, color: colors.accent, letterSpacing: 0.5, marginBottom: 8 }}>
                      SELECTED ({selectedPlayers.length})
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {poolPlayers
                        .filter(p => selectedPlayers.includes(p.id))
                        .map(p => (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => togglePlayerSelection(p.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: colors.accent,
                              borderRadius: 20,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              gap: 6,
                            }}
                          >
                            <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 13, color: '#0f1b2d' }}>
                              {p.first_name} {p.last_name}
                            </Text>
                            <BrandedIcon name="close" size={12} color="#0f1b2d" />
                          </TouchableOpacity>
                        ))
                      }
                    </View>
                  </View>
                )}
                <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                  <View style={styles.courtSearchRow}>
                    <BrandedIcon name="search" size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.courtSearchInput}
                      value={playerSearch}
                      onChangeText={setPlayerSearch}
                      placeholder="Search players by name..."
                      placeholderTextColor={colors.inputPlaceholder}
                    />
                    {playerSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setPlayerSearch('')}>
                        <BrandedIcon name="close" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.filterBar}>
                  <View style={styles.filterRow}>
                    <TouchableOpacity
                      style={[styles.filterChip, !playerFilter.gender && styles.filterChipActive]}
                      onPress={() => setPlayerFilter(f => ({ ...f, gender: undefined }))}
                    >
                      <Text style={[styles.filterChipText, !playerFilter.gender && styles.filterChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, playerFilter.gender === 'Male' && styles.filterChipActive]}
                      onPress={() => setPlayerFilter(f => ({ ...f, gender: 'Male' }))}
                    >
                      <Text style={[styles.filterChipText, playerFilter.gender === 'Male' && styles.filterChipTextActive]}>Male</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, playerFilter.gender === 'Female' && styles.filterChipActive]}
                      onPress={() => setPlayerFilter(f => ({ ...f, gender: 'Female' }))}
                    >
                      <Text style={[styles.filterChipText, playerFilter.gender === 'Female' && styles.filterChipTextActive]}>Female</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <FlatList
                  data={poolPlayers}
                  keyExtractor={p => p.id.toString()}
                  contentContainerStyle={{ padding: 16 }}
                  onEndReached={() => {
                    if (hasMorePlayers && !loading) {
                      const nextPage = playerPage + 1;
                      setPlayerPage(nextPage);
                      loadPlayers(nextPage, true);
                    }
                  }}
                  onEndReachedThreshold={0.3}
                  renderItem={({ item }) => {
                    const isSelected = selectedPlayers.includes(item.id);
                    return (
                      <TouchableOpacity
                        style={[styles.playerCard, isSelected && styles.playerCardSelected]}
                        onPress={() => togglePlayerSelection(item.id)}
                      >
                        <View style={styles.playerInfo}>
                          <Text style={styles.playerName}>
                            {item.first_name} {item.last_name}
                          </Text>
                          <Text style={styles.playerMetaText}>
                            {item.play_level ? `Lvl ${item.play_level}` : ''} {item.cities_to_play}
                          </Text>
                        </View>
                        <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                          {isSelected && <BrandedIcon name="checkmark" size={14} color="#0f1b2d" />}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />

                <View style={styles.selectionBar}>
                  <Text style={styles.selectionText}>
                    {selectedPlayers.length} selected{!isAdmin ? ` (${selectedPlayers.length} credits)` : ''}
                  </Text>
                  <TouchableOpacity
                    style={styles.selectionBtn}
                    onPress={() => setInviteStep('confirm')}
                    disabled={selectedPlayers.length === 0}
                  >
                    <Text style={styles.selectionBtnText}>REVIEW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {inviteStep === 'confirm' && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmLabel}>Court</Text>
                  <Text style={styles.confirmValue}>{courtName}</Text>
                  <Text style={styles.confirmLabel}>Date & Time</Text>
                  <Text style={styles.confirmValue}>
                    {dateOptions.find(o => o.value === matchDate)?.label || matchDate} at {timeOptions.find(o => o.value === matchTime)?.label || matchTime}
                  </Text>
                  <Text style={styles.confirmLabel}>Players to Invite ({selectedPlayers.length})</Text>
                  {poolPlayers
                    .filter(p => selectedPlayers.includes(p.id))
                    .map(p => (
                      <Text key={p.id} style={[styles.confirmValue, { marginTop: 2 }]}>
                        {p.first_name} {p.last_name}{p.play_level ? ` — Lvl ${p.play_level}` : ''}
                      </Text>
                    ))
                  }
                  {!isAdmin && (
                  <>
                  <Text style={styles.confirmLabel}>Credits Used</Text>
                  <Text style={styles.confirmValue}>{selectedPlayers.length} credits</Text>
                  <Text style={styles.confirmLabel}>Remaining Balance</Text>
                  <Text style={[styles.confirmValue, { color: creditBalance >= selectedPlayers.length ? colors.accent : colors.danger }]}>
                    {creditBalance - selectedPlayers.length} credits
                  </Text>
                  </>
                  )}
                </View>

                {!isAdmin && creditBalance < selectedPlayers.length && (
                  <View style={{ marginTop: 16 }}>
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>
                        Not enough credits! You need {selectedPlayers.length} but have {creditBalance}.
                      </Text>
                    </View>
                    <Text style={[styles.inputLabel, { marginTop: 16 }]}>Buy Credits to Continue</Text>
                    <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
                      Purchase credits below — you'll return right here to send your invites.
                    </Text>
                    {CREDIT_PACKAGES.slice(0, 4).map(pkg => (
                      <TouchableOpacity
                        key={pkg.credits}
                        style={[styles.packageCard, pkg.popular && styles.packageCardPopular]}
                        onPress={() => handleBuyCredits(pkg)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.packageCredits}>{pkg.credits.toLocaleString()} credits</Text>
                          <Text style={styles.packagePerCredit}>{pkg.perCredit}/credit</Text>
                        </View>
                        <Text style={styles.packagePrice}>{pkg.price}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, !isAdmin && creditBalance < selectedPlayers.length && { opacity: 0.5 }]}
                  onPress={handleSendInvites}
                  disabled={sendingInvites || (!isAdmin && creditBalance < selectedPlayers.length)}
                >
                  {sendingInvites ? (
                    <ActivityIndicator color="#0f1b2d" />
                  ) : (
                    <Text style={styles.primaryBtnText}>SEND {selectedPlayers.length} INVITES</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setInviteStep('select-players')}
                >
                  <Text style={styles.secondaryBtnText}>BACK TO PLAYER SELECTION</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {inviteStep === 'results' && sendResults && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <BrandedIcon name="checkmark" size={48} color={colors.accent} />
                  <Text style={[styles.premiumTitle, { marginTop: 12 }]}>
                    {sendResults.sentCount} Invite{sendResults.sentCount !== 1 ? 's' : ''} Sent!
                  </Text>
                </View>

                {sendResults.sentNames.length > 0 && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 0 }]}>SMS Sent Successfully</Text>
                    {sendResults.sentNames.map((name, i) => (
                      <View key={`sent-${i}`} style={styles.responseRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.responseName}>{name}</Text>
                        </View>
                        <View style={[styles.responseStatus, { backgroundColor: 'rgba(135,202,55,0.15)' }]}>
                          <Text style={[styles.responseStatusText, { color: colors.accent }]}>sent</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {sendResults.failedNames.length > 0 && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 20 }]}>Failed to Send</Text>
                    {sendResults.failedNames.map((name, i) => (
                      <View key={`fail-${i}`} style={styles.responseRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.responseName}>{name}</Text>
                        </View>
                        <View style={[styles.responseStatus, { backgroundColor: 'rgba(255,71,87,0.15)' }]}>
                          <Text style={[styles.responseStatusText, { color: colors.danger }]}>failed</Text>
                        </View>
                      </View>
                    ))}
                    <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
                      Check that these players have valid mobile phone numbers.
                    </Text>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 32 }]}
                  onPress={() => { setShowCreateInvite(false); resetInviteForm(); }}
                >
                  <Text style={styles.primaryBtnText}>DONE</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* INVITE DETAIL MODAL */}
      <Modal visible={!!selectedInvite} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedInvite?.court_name || 'Invite Detail'}</Text>
              <TouchableOpacity onPress={closeInviteDetail}>
                <BrandedIcon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedInvite && (
              <View style={{ flex: 1 }}>
                {/* Detail / Chat toggle tabs */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 12, alignItems: 'center' as const, borderBottomWidth: 2, borderBottomColor: !showChat ? colors.accent : 'transparent' }}
                    onPress={() => setShowChat(false)}
                  >
                    <Text style={{ fontFamily: FONT_DISPLAY_BOLD, fontSize: 13, color: !showChat ? colors.accent : colors.textMuted, letterSpacing: 0.5 }}>DETAILS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 12, alignItems: 'center' as const, borderBottomWidth: 2, borderBottomColor: showChat ? colors.accent : 'transparent' }}
                    onPress={() => {
                      setShowChat(true);
                      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: false }), 200);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontFamily: FONT_DISPLAY_BOLD, fontSize: 13, color: showChat ? colors.accent : colors.textMuted, letterSpacing: 0.5 }}>CHAT</Text>
                      {chatMessages.length > 0 && (
                        <View style={{ backgroundColor: colors.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 6 }}>
                          <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 11, color: '#0f1b2d' }}>{chatMessages.length}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {!showChat ? (
                  <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedInvite.match_date)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>{formatTime(selectedInvite.match_time)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Code</Text>
                      <Text style={styles.detailValue}>{selectedInvite.match_code}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Spots</Text>
                      <Text style={styles.detailValue}>{selectedInvite.spots_left} / {selectedInvite.max_spots} available</Text>
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 4 }]}>
                      Players Invited ({inviteResponses.length})
                    </Text>
                    <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                      {inviteResponses.filter((r: any) => r.status === 'confirmed').length} confirmed
                      {' · '}{inviteResponses.filter((r: any) => r.status === 'pending').length} pending
                      {inviteResponses.filter((r: any) => r.status === 'waitlisted').length > 0
                        ? ` · ${inviteResponses.filter((r: any) => r.status === 'waitlisted').length} waitlisted` : ''}
                      {inviteResponses.filter((r: any) => r.status === 'declined').length > 0
                        ? ` · ${inviteResponses.filter((r: any) => r.status === 'declined').length} declined` : ''}
                    </Text>
                    {inviteResponses.length === 0 ? (
                      <Text style={styles.emptySubtext}>No players invited yet.</Text>
                    ) : (
                      inviteResponses.map((r: any, i: number) => (
                        <View key={i} style={styles.responseRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.responseName}>
                              {r.first_name || r.player_name} {r.last_name || ''}
                            </Text>
                            {r.play_level && (
                              <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.textMuted }}>
                                Level {r.play_level}
                              </Text>
                            )}
                          </View>
                          <View style={[
                            styles.responseStatus,
                            r.status === 'confirmed' && { backgroundColor: 'rgba(135,202,55,0.15)' },
                            r.status === 'interested' && { backgroundColor: 'rgba(255,210,63,0.15)' },
                            r.status === 'declined' && { backgroundColor: 'rgba(255,71,87,0.15)' },
                            r.status === 'pending' && { backgroundColor: 'rgba(150,150,150,0.12)' },
                            r.status === 'waitlisted' && { backgroundColor: 'rgba(247,140,107,0.15)' },
                          ]}>
                            <Text style={[
                              styles.responseStatusText,
                              r.status === 'confirmed' && { color: colors.accent },
                              r.status === 'interested' && { color: '#ffd23f' },
                              r.status === 'declined' && { color: colors.danger },
                              r.status === 'pending' && { color: colors.textMuted },
                              r.status === 'waitlisted' && { color: '#f78c6b' },
                            ]}>{r.status}{r.waitlist_position ? ` #${r.waitlist_position}` : ''}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                ) : (
                  /* CHAT VIEW */
                  <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
                    {chatLoading ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator color={colors.accent} size="large" />
                      </View>
                    ) : (
                      <FlatList
                        ref={chatListRef}
                        data={chatMessages}
                        keyExtractor={(m) => m.id.toString()}
                        contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: chatMessages.length === 0 ? 'center' : undefined }}
                        onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
                        ListEmptyComponent={
                          <View style={{ alignItems: 'center', gap: 8 }}>
                            <BrandedIcon name="chatbubbles" size={36} color={colors.textMuted} />
                            <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                              No messages yet.{'\n'}Start the conversation!
                            </Text>
                          </View>
                        }
                        renderItem={({ item: msg }) => {
                          const isSystem = msg.is_system === '1' || msg.is_system === 1;
                          const isMe = msg.user_id === userId;
                          if (isSystem) {
                            return (
                              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                                <View style={{ backgroundColor: 'rgba(135,202,55,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 }}>
                                  <Text style={{ fontFamily: FONT_BODY_MEDIUM, fontSize: 13, color: colors.accent, textAlign: 'center' }}>
                                    {msg.message}
                                  </Text>
                                </View>
                              </View>
                            );
                          }
                          return (
                            <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginVertical: 4 }}>
                              {!isMe && (
                                <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 11, color: colors.textMuted, marginBottom: 2, marginLeft: 4 }}>
                                  {msg.sender_name}
                                </Text>
                              )}
                              <View style={{
                                backgroundColor: isMe ? colors.accent : colors.card,
                                borderRadius: 16,
                                borderTopRightRadius: isMe ? 4 : 16,
                                borderTopLeftRadius: isMe ? 16 : 4,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                maxWidth: '80%',
                                borderWidth: isMe ? 0 : 1,
                                borderColor: colors.border,
                              }}>
                                <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 15, color: isMe ? '#0f1b2d' : colors.text }}>
                                  {msg.message}
                                </Text>
                              </View>
                              <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 10, color: colors.textMuted, marginTop: 2, marginHorizontal: 4 }}>
                                {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </Text>
                            </View>
                          );
                        }}
                      />
                    )}
                    {/* Chat input */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      backgroundColor: colors.surface,
                      gap: 10,
                    }}>
                      <TextInput
                        style={{
                          flex: 1,
                          backgroundColor: colors.inputBg,
                          borderWidth: 1,
                          borderColor: colors.inputBorder,
                          borderRadius: 20,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          fontFamily: FONT_BODY_REGULAR,
                          fontSize: 15,
                          color: colors.inputText,
                          maxHeight: 100,
                        }}
                        value={chatText}
                        onChangeText={setChatText}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.inputPlaceholder}
                        multiline
                        returnKeyType="send"
                        onSubmitEditing={handleSendChat}
                        blurOnSubmit={false}
                      />
                      <TouchableOpacity
                        onPress={handleSendChat}
                        disabled={!chatText.trim() || chatSending}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: chatText.trim() ? colors.accent : colors.surface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {chatSending ? (
                          <ActivityIndicator color="#0f1b2d" size="small" />
                        ) : (
                          <BrandedIcon name="send" size={20} color={chatText.trim() ? '#0f1b2d' : colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </KeyboardAvoidingView>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    } as const,
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerTitle: {
      fontFamily: FONT_DISPLAY_BLACK,
      fontSize: 28,
      color: colors.text,
      letterSpacing: 2,
    },
    creditBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    creditText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 13,
      color: colors.accent,
    },
    tabBar: {
      flexDirection: 'row' as const,
      paddingHorizontal: 16,
      marginBottom: 4,
      gap: 8,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center' as const,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    tabItemActive: {
      backgroundColor: colors.accent,
    },
    tabLabel: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    tabLabelActive: {
      color: '#0f1b2d',
    },
    createBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      backgroundColor: colors.accent,
      marginHorizontal: 16,
      marginVertical: 12,
      padding: 14,
      borderRadius: 14,
    },
    createBtnText: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 15,
      color: '#0f1b2d',
      letterSpacing: 1,
    },
    emptyState: {
      alignItems: 'center' as const,
      paddingVertical: 48,
      gap: 12,
    },
    emptyText: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 16,
      color: colors.textMuted,
    },
    emptySubtext: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center' as const,
      maxWidth: 260,
    },
    inviteCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inviteCardHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 6,
    },
    inviteCourtName: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 16,
      color: colors.text,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    statusText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    inviteDateTime: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: colors.textSoft,
      marginBottom: 12,
    },
    inviteStats: {
      flexDirection: 'row' as const,
      gap: 16,
    },
    inviteStat: {
      alignItems: 'center' as const,
    },
    inviteStatNum: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 18,
      color: colors.text,
    },
    inviteStatLabel: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 11,
      color: colors.textMuted,
    },
    filterBar: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    filterRow: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: 'rgba(135,202,55,0.15)',
      borderColor: colors.accent,
    },
    filterChipText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 13,
      color: colors.textMuted,
    },
    filterChipTextActive: {
      color: colors.accent,
    },
    playerCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    playerCardSelected: {
      borderColor: colors.accent,
      backgroundColor: isDark ? 'rgba(135,202,55,0.05)' : 'rgba(109,184,44,0.05)',
    },
    playerInfo: {
      flex: 1,
    },
    playerNameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    playerName: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 15,
      color: colors.text,
    },
    playerMeta: {
      flexDirection: 'row' as const,
      gap: 12,
      marginTop: 4,
    },
    playerMetaText: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 13,
      color: colors.textMuted,
    },
    playerAvailability: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    selectCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    selectCircleActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    selectionBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    selectionText: {
      fontFamily: FONT_BODY_SEMIBOLD,
      fontSize: 14,
      color: colors.text,
    },
    selectionBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },
    selectionBtnText: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 13,
      color: '#0f1b2d',
      letterSpacing: 1,
    },
    creditCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    creditCardLabel: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 4,
    },
    creditCardAmount: {
      fontFamily: FONT_DISPLAY_BLACK,
      fontSize: 48,
      color: colors.accent,
    },
    creditCardSub: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 14,
      color: colors.textMuted,
    },
    sectionTitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 18,
      color: colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 16,
    },
    packageCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 18,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    packageCardPopular: {
      borderColor: colors.accent,
      backgroundColor: isDark ? 'rgba(135,202,55,0.05)' : 'rgba(109,184,44,0.05)',
    },
    popularBadge: {
      position: 'absolute' as const,
      top: -8,
      right: 12,
      backgroundColor: colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
    },
    popularBadgeText: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 10,
      color: '#0f1b2d',
      letterSpacing: 0.5,
    },
    packageInfo: {
      flex: 1,
    },
    packageCredits: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 16,
      color: colors.text,
    },
    packagePerCredit: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 12,
      color: colors.textMuted,
    },
    packagePrice: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 20,
      color: colors.accent,
    },
    premiumGate: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 40,
      gap: 16,
    },
    premiumTitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 24,
      color: colors.text,
    },
    premiumSubtitle: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center' as const,
      lineHeight: 22,
    },
    upgradeBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 8,
    },
    upgradeBtnText: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 16,
      color: '#0f1b2d',
      letterSpacing: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
    },
    modalContent: {
      flex: 1,
      backgroundColor: colors.bg,
      marginTop: 60,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 20,
      color: colors.text,
    },
    errorBanner: {
      backgroundColor: 'rgba(255,71,87,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,71,87,0.3)',
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 20,
      marginTop: 12,
    },
    errorText: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: '#ff6b7a',
    },
    inputLabel: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
      marginBottom: 6,
      marginTop: 16,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 16,
      color: colors.inputText,
    },
    courtSelected: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    courtSelectedName: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 15,
      color: colors.text,
    },
    courtSelectedAddr: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    courtPickerContainer: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginTop: 8,
      overflow: 'hidden' as const,
    },
    courtSearchRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    courtSearchInput: {
      flex: 1,
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 15,
      color: colors.inputText,
      padding: 0,
    },
    courtPickerItem: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    courtPickerName: {
      fontFamily: FONT_BODY_SEMIBOLD,
      fontSize: 14,
      color: colors.text,
    },
    courtPickerCity: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    courtPickerEmpty: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center' as const,
      padding: 20,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 14,
      alignItems: 'center' as const,
      marginTop: 24,
    },
    primaryBtnText: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 15,
      color: '#0f1b2d',
      letterSpacing: 1,
    },
    secondaryBtn: {
      padding: 14,
      borderRadius: 12,
      alignItems: 'center' as const,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 13,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    confirmCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmLabel: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginTop: 12,
    },
    confirmValue: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 16,
      color: colors.text,
      marginTop: 2,
    },
    detailRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontFamily: FONT_BODY_MEDIUM,
      fontSize: 14,
      color: colors.textMuted,
    },
    detailValue: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 14,
      color: colors.text,
    },
    responseRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    responseName: {
      fontFamily: FONT_BODY_SEMIBOLD,
      fontSize: 14,
      color: colors.text,
    },
    responseStatus: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    responseStatusText: {
      fontFamily: FONT_BODY_BOLD,
      fontSize: 11,
      color: colors.textMuted,
      textTransform: 'capitalize' as const,
    },
  };
}
