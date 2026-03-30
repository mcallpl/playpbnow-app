import { BrandedIcon } from '../components/BrandedIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { storeNavData } from '../utils/navData';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import {
    ThemeColors,
    FONT_DISPLAY_BOLD,
    FONT_DISPLAY_EXTRABOLD,
    FONT_BODY_REGULAR,
    FONT_BODY_MEDIUM,
    FONT_BODY_BOLD,
    FONT_BODY_SEMIBOLD,
} from '../constants/theme';

interface Player {
  id: string;
  db_id?: number;
  first_name: string;
  last_name?: string;
  gender: string;
  cell_phone?: string;
  dupr_rating?: string;
  home_court_id?: number | null;
  home_court_name?: string | null;
  wins?: number;
  losses?: number;
  diff?: number;
  win_pct?: number;
  groups?: string[];
  is_verified?: boolean;
}

interface Court { id: number; name: string; city: string | null; state: string | null; }

interface SearchResult {
  id: number; player_key: string; first_name: string; last_name: string;
  gender: string; home_court_name: string | null; wins: number; losses: number;
  win_pct: number; groups: string[]; is_verified: boolean; source: string;
}

interface RoundConfig { type: 'mixed' | 'gender' | 'mixer'; }

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

export default function SetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [groupId, setGroupId] = useState(params.groupId as string || '');
  const [groupName, setGroupName] = useState(params.groupName as string || '');
  const [groupKey, setGroupKey] = useState(params.groupKey as string || '');
  const [deviceId, setDeviceId] = useState('');

  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGender, setNewPlayerGender] = useState<'male' | 'female'>('male');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [courtId, setCourtId] = useState<number | null>(null);
  const [courtName, setCourtName] = useState('');

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const nameInputRef = useRef<any>(null);
  const listRef = useRef<any>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [editPhone, setEditPhone] = useState('');
  const [editDupr, setEditDupr] = useState('');
  const [editHomeCourtId, setEditHomeCourtId] = useState<number | null>(null);
  const [allCourts, setAllCourts] = useState<Court[]>([]);
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [courtSearchText, setCourtSearchText] = useState('');

  const [roundsConfig, setRoundsConfig] = useState<RoundConfig[]>([
      { type: 'mixed' }, { type: 'mixed' }, { type: 'mixed' },
      { type: 'mixed' }, { type: 'mixed' }, { type: 'mixed' }
  ]);
  const [isFixedTeams, setIsFixedTeams] = useState(false);

  useFocusEffect(
    useCallback(() => {
        const load = async () => {
            let did = await AsyncStorage.getItem('user_id');
            if (!did) { Alert.alert('Error', 'Please login first'); return; }
            setDeviceId(did);

            let gKey = params.groupKey as string || '';
            let gName = params.groupName as string || '';
            if (!gKey) {
                Alert.alert('Error', 'Group not loaded properly. Please go back and select again.');
                return;
            }
            setGroupKey(gKey);
            if (gName) setGroupName(gName);
            if (params.groupId) setGroupId(params.groupId as string);

            if (params.courtId) setCourtId(parseInt(params.courtId as string));
            if (params.courtName) setCourtName(params.courtName as string);

            // Load all courts for edit player dropdown
            try {
                const courtsRes = await fetch(`${API_URL}/get_courts.php`);
                const courtsData = await courtsRes.json();
                if (courtsData.status === 'success') setAllCourts(courtsData.courts || []);
            } catch (e) {}

            // Load preselected players from navData (AsyncStorage) or legacy URL params
            if (params.navId) {
                const { getNavData } = require('../utils/navData');
                const navData = await getNavData(params.navId as string);
                if (navData?.preselectedPlayers) { setPlayers(navData.preselectedPlayers); return; }
            }
            if (params.preselectedPlayers) {
                try { setPlayers(JSON.parse(params.preselectedPlayers as string)); return; } catch (e) {}
            }

            if (gKey) {
                try {
                    const res = await fetch(`${API_URL}/get_players.php?group_key=${gKey}`);
                    const data = await res.json();
                    if (data.status === 'success') setPlayers(data.players || []);
                    else setPlayers([]);
                } catch (e) { setPlayers([]); }
            }
        };
        load().then(() => {
            setTimeout(() => nameInputRef.current?.focus(), 300);
        });
        // Also focus whenever this screen regains focus
        setTimeout(() => nameInputRef.current?.focus(), 500);
    }, [params.groupId, params.groupName, params.groupKey])
  );

  const searchGlobalPlayers = useCallback(async (query: string) => {
      if (query.length < 2) { setSearchResults([]); setShowSearchResults(false); return; }
      setIsSearching(true);
      try {
          const res = await fetch(`${API_URL}/search_players.php?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (data.status === 'success' && data.results.length > 0) {
              const existingIds = new Set(players.map(p => p.id));
              const filtered = data.results.filter((r: SearchResult) => !existingIds.has(r.player_key));
              setSearchResults(filtered);
              setShowSearchResults(filtered.length > 0);
          } else { setSearchResults([]); setShowSearchResults(false); }
      } catch (e) {} finally { setIsSearching(false); }
  }, [players]);

  const handleNameChange = (text: string) => {
      const capitalized = text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      setNewPlayerName(capitalized);
      searchGlobalPlayers(capitalized);
  };

  const addExistingPlayer = async (result: SearchResult) => {
      try {
          const res = await fetch(`${API_URL}/add_player.php`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ group_key: groupKey, existing_player_id: result.id })
          });
          const data = await res.json();
          if (data.status === 'success') {
              try {
                  const rosterRes = await fetch(`${API_URL}/get_players.php?group_key=${groupKey}`);
                  const rosterData = await rosterRes.json();
                  if (rosterData.status === 'success') setPlayers(rosterData.players || []);
              } catch (e) {
                  setPlayers([{
                      id: result.player_key, db_id: result.id, first_name: result.first_name,
                      last_name: result.last_name, gender: result.gender,
                      home_court_name: result.home_court_name, wins: result.wins,
                      losses: result.losses, win_pct: result.win_pct,
                      groups: result.groups, is_verified: result.is_verified
                  }, ...players]);
              }
              setNewPlayerName(''); setSearchResults([]); setShowSearchResults(false); setShowPhoneInput(false); setNewPlayerPhone('');
              setTimeout(() => nameInputRef.current?.focus(), 100);
              scrollToNewestPlayer();
          } else { Alert.alert('Error', data.message); }
      } catch (e) { Alert.alert('Error', 'Failed to add player'); }
  };

  const addPlayerForceNew = async (name: string, gender: 'male' | 'female', phone: string | null) => {
      try {
          const pk = 'pk_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
          const res = await fetch(`${API_URL}/add_player.php`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  group_key: groupKey, first_name: name,
                  gender, player_key: pk, cell_phone: phone,
                  force_new: true
              })
          });
          const data = await res.json();
          if (data.status === 'success') {
              setPlayers([{
                  id: data.player_key || pk, first_name: data.first_name || name,
                  gender, home_court_name: null
              }, ...players]);
              setNewPlayerName(''); setSearchResults([]); setShowSearchResults(false); setShowPhoneInput(false); setNewPlayerPhone('');
              setTimeout(() => nameInputRef.current?.focus(), 100);
              scrollToNewestPlayer();
          } else { Alert.alert('Error', data.message); }
      } catch (e) { Alert.alert('Error', 'Failed to add player'); }
  };

  const addNewPlayer = async () => {
      if (isAdding) return;
      if (!newPlayerName.trim()) { Alert.alert('Enter Name', 'Please enter a player name.'); return; }
      setIsAdding(true);
      try {
          const pk = 'pk_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
          const phone = newPlayerPhone.trim() || null;
          const name = newPlayerName.trim();
          const gender = newPlayerGender;
          const res = await fetch(`${API_URL}/add_player.php`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  group_key: groupKey, first_name: name,
                  gender, player_key: pk, cell_phone: phone
              })
          });
          const data = await res.json();
          if (data.status === 'duplicate_name') {
              const existing = data.existing_players[0];
              Alert.alert(
                  'Player Already Exists',
                  `"${existing.first_name}" is already in this group. Is this the same person?`,
                  [
                      {
                          text: 'Same Person',
                          onPress: () => addExistingPlayer({
                              id: existing.id, player_key: existing.player_key,
                              first_name: existing.first_name, last_name: existing.last_name || '',
                              gender: existing.gender, home_court_name: null,
                              wins: 0, losses: 0, win_pct: 0, groups: [], is_verified: false, source: 'duplicate'
                          })
                      },
                      {
                          text: 'Different Person',
                          onPress: () => addPlayerForceNew(name, gender, phone)
                      },
                      { text: 'Cancel', style: 'cancel' }
                  ]
              );
          } else if (data.status === 'success') {
              try {
                  const rosterRes = await fetch(`${API_URL}/get_players.php?group_key=${groupKey}`);
                  const rosterData = await rosterRes.json();
                  if (rosterData.status === 'success') setPlayers(rosterData.players || []);
              } catch (e) {
                  setPlayers([{
                      id: data.player_key || pk, first_name: data.first_name || name,
                      gender, home_court_name: null
                  }, ...players]);
              }
              setNewPlayerName(''); setSearchResults([]); setShowSearchResults(false); setShowPhoneInput(false); setNewPlayerPhone('');
          } else { Alert.alert('Error', data.message); }
      } catch (e) {
          setPlayers([{ id: Date.now().toString(), first_name: newPlayerName.trim(), gender: newPlayerGender }, ...players]);
          setNewPlayerName(''); setShowPhoneInput(false); setNewPlayerPhone('');
      } finally {
          setIsAdding(false);
          setTimeout(() => nameInputRef.current?.focus(), 100);
          scrollToNewestPlayer();
      }
  };

  const scrollToNewestPlayer = () => {
    setTimeout(() => {
      try { listRef.current?.scrollToEnd({ animated: true }); } catch (e) {}
    }, 300);
  };

  const removePlayer = (pid: string) => setPlayers(players.filter(p => p.id !== pid));

  const openEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setEditName(player.first_name);
    setEditLastName(player.last_name || '');
    setEditGender(player.gender);
    setEditPhone(player.cell_phone || '');
    setEditDupr(player.dupr_rating || '');
    setEditHomeCourtId(player.home_court_id || null);
    setShowCourtPicker(false);
    setCourtSearchText('');
  };

  const saveEditPlayer = async () => {
    if (!editingPlayer || !editName.trim()) return;
    const duprVal = editDupr.trim();
    if (duprVal) {
      const num = parseFloat(duprVal);
      if (isNaN(num) || num < 1.0 || num > 8.0) {
        Alert.alert('Invalid DUPR', 'DUPR rating must be between 1.0 and 8.0');
        return;
      }
    }
    const selectedCourt = allCourts.find(c => c.id === editHomeCourtId);
    const updatedPlayers = players.map(p =>
      p.id === editingPlayer.id ? {
        ...p,
        first_name: editName.trim(),
        last_name: editLastName.trim(),
        gender: editGender,
        cell_phone: editPhone.trim() || undefined,
        dupr_rating: duprVal || undefined,
        home_court_id: editHomeCourtId,
        home_court_name: selectedCourt ? selectedCourt.name : null,
      } : p
    );
    setPlayers(updatedPlayers);
    try {
      await fetch(`${API_URL}/update_player.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_key: editingPlayer.id,
          first_name: editName.trim(),
          last_name: editLastName.trim(),
          gender: editGender,
          cell_phone: editPhone.trim() || null,
          dupr_rating: duprVal || null,
          home_court_id: editHomeCourtId || '',
        }),
      });
    } catch (e) {
      console.error('Failed to update player on server:', e);
    }
    setEditingPlayer(null);
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= players.length) return;
      const updated = [...players];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      setPlayers(updated);
  };

  const handleSavePress = () => { setSaveAsName(groupName); setSaveModalVisible(true); };
  const handleSmartSave = async () => {
     const name = saveAsName.trim();
     if (!name) { Alert.alert("Error", "Enter a group name."); return; }
     if (!groupKey || !deviceId) { Alert.alert("Error", `Missing group info (key: ${groupKey}, device: ${deviceId})`); return; }
     try {
        const payload = { group_key: groupKey, user_id: deviceId, new_name: name, players };
        console.log('Save payload:', JSON.stringify(payload).substring(0, 200));
        const res = await fetch(`${API_URL}/save_group_roster.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        console.log('Save response:', text);
        let data;
        try { data = JSON.parse(text); } catch { Alert.alert("Error", "Invalid server response: " + text.substring(0, 100)); return; }
        if (data.status === 'success') {
            setSaveModalVisible(false);
            if (data.group_key !== groupKey) {
                setGroupKey(data.group_key);
                setGroupName(data.group_name);
                await AsyncStorage.setItem('active_group_key', data.group_key);
                await AsyncStorage.setItem('active_group_name', data.group_name);
            } else if (data.group_name !== groupName) {
                setGroupName(data.group_name);
                await AsyncStorage.setItem('active_group_name', data.group_name);
            }
            Alert.alert("Saved!", name === groupName ? "Group roster updated." : `New group "${name}" created.`);
        } else Alert.alert("Error", data.message || "Unknown error");
     } catch (e: any) { Alert.alert("Error", "Failed to save: " + (e.message || e)); }
  };

  const handleDragEnd = ({ data }: { data: Player[] }) => {
      setPlayers(data);
      if (groupKey && deviceId) {
          fetch(`${API_URL}/save_players.php`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ group_key: groupKey, user_id: deviceId, players: data })
          }).catch(() => {});
      }
  };

  const handleSetupPress = () => {
    if (players.length < 4) { Alert.alert('Not Enough Players', 'You need at least 4 players.'); return; }
    if (isFixedTeams && players.length % 2 !== 0) { Alert.alert('Odd Player Count', 'Fixed Teams requires an even number of players. Every player needs a partner.'); return; }
    setConfigModalVisible(true);
  };

  const addRound = () => setRoundsConfig([...roundsConfig, { type: 'mixed' }]);
  const removeRound = () => { if (roundsConfig.length > 1) { const c = [...roundsConfig]; c.pop(); setRoundsConfig(c); } };
  const updateRoundType = (i: number, t: 'mixed' | 'gender' | 'mixer') => { const c = [...roundsConfig]; c[i].type = t; setRoundsConfig(c); };

  const generateSchedule = async () => {
    try {
        setConfigModalVisible(false);
        if (groupName) await AsyncStorage.removeItem(`scores_${groupName}`);

        // Build teams array for fixed teams mode
        const teamsPayload = isFixedTeams ? Array.from({ length: Math.floor(players.length / 2) }, (_, i) => ({
            id: `team-${i}`,
            player1: { id: players[i * 2].id, first_name: players[i * 2].first_name, gender: players[i * 2].gender },
            player2: { id: players[i * 2 + 1].id, first_name: players[i * 2 + 1].first_name, gender: players[i * 2 + 1].gender },
        })) : undefined;

        const payload = isFixedTeams
            ? { group_key: groupKey, mode: 'fixed_teams', teams: teamsPayload, players: players.map(p => ({ id: p.id, first_name: p.first_name, gender: p.gender })) }
            : { group_key: groupKey, round_configs: roundsConfig, group: groupName, players: players.map(p => ({ id: p.id, first_name: p.first_name, gender: p.gender })) };

        const res = await fetch(`${API_URL}/generate_schedule.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.status === 'success') {
            const navId = await storeNavData({ schedule: data.schedule, players, isFixedTeams, teams: teamsPayload });
            router.push({
                pathname: '/(tabs)/game',
                params: { navId, groupName, groupKey, courtName, courtId: (courtId || '').toString(), isFixedTeams: isFixedTeams.toString() }
            });
        } else { Alert.alert("Error", data.message || "Generation failed."); }
    } catch (e) { Alert.alert("Error", "Network error."); }
  };

  const renderPlayerRow = (item: Player, drag: () => void, isActive: boolean, index?: number) => {
    const totalGames = (item.wins || 0) + (item.losses || 0);
    const hasStats = totalGames > 0;
    const idx = index ?? 0;
    const isEven = idx % 2 === 0;
    const isFirstOfPair = isFixedTeams && isEven;
    const isSecondOfPair = isFixedTeams && !isEven;
    const teamNum = Math.floor(idx / 2) + 1;

    return (
        <View>
          {/* Team label above first player of each pair */}
          {isFirstOfPair && (
              <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 10, color: colors.accent, letterSpacing: 1, marginBottom: 4, marginLeft: 4 }}>
                  TEAM {teamNum}
              </Text>
          )}
          <View style={[
              styles.playerRow,
              isActive && { backgroundColor: colors.cardHover, elevation: 5 },
              isFirstOfPair && { marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
              isSecondOfPair && { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
          ]}>
            <View style={styles.playerInfo}>
               {Platform.OS === 'web' && index !== undefined ? (
                 <View style={{ marginRight: 8, gap: 0 }}>
                     <Pressable onPress={() => movePlayer(index, 'up')}
                         style={{ opacity: index === 0 ? 0.2 : 1, paddingHorizontal: 6, paddingVertical: 2 }}>
                         <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: '700' }}>▲</Text>
                     </Pressable>
                     <Pressable onPress={() => movePlayer(index, 'down')}
                         style={{ opacity: index === players.length - 1 ? 0.2 : 1, paddingHorizontal: 6, paddingVertical: 2 }}>
                         <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: '700' }}>▼</Text>
                     </Pressable>
                 </View>
               ) : Platform.OS !== 'web' ? (
                 <Pressable onPressIn={drag} hitSlop={20} style={styles.dragHandle}>
                     <BrandedIcon name="menu" size={24} color={colors.textMuted} />
                 </Pressable>
               ) : null}
               <View style={[styles.genderIcon, { backgroundColor: item.gender === 'female' ? 'rgba(247,140,162,0.15)' : 'rgba(79,172,254,0.15)' }]}>
                   <BrandedIcon name={item.gender === 'female' ? 'gender-female' : 'gender-male'} size={16}
                      color={item.gender === 'female' ? colors.female : colors.male} />
               </View>
               <View style={{ marginLeft: 12, flex: 1 }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                       <Text style={styles.playerName}>{item.first_name}{item.last_name ? ` ${item.last_name}` : ''}</Text>
                       {item.is_verified && <BrandedIcon name="confirm" size={14} color={colors.accent} />}
                   </View>
                   <Text style={styles.playerStats}>
                       {item.dupr_rating ? `DUPR ${item.dupr_rating}` : ''}
                       {item.dupr_rating && hasStats ? ' · ' : ''}
                       {hasStats ? `${item.wins}W-${item.losses}L · ${(item.win_pct || 0).toFixed(0)}%` : ''}
                       {(hasStats || item.dupr_rating) && item.home_court_name ? ' · ' : ''}
                       {item.home_court_name || ''}
                   </Text>
               </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => openEditPlayer(item)}>
                <BrandedIcon name="edit" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removePlayer(item.id)}>
                <BrandedIcon name="close" size={22} color={colors.danger} style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            </View>
          </View>
          {/* Link connector between paired players */}
          {isFirstOfPair && idx + 1 < players.length && (
              <View style={{ alignItems: 'center', marginVertical: -4, zIndex: 1 }}>
                  <View style={{ backgroundColor: colors.accent, borderRadius: 10, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                      <BrandedIcon name="link" size={14} color={colors.bg} />
                  </View>
              </View>
          )}
          {/* Extra spacing after second player of pair */}
          {isSecondOfPair && <View style={{ height: 8 }} />}
        </View>
    );
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Player>) => (
    <ScaleDecorator>{renderPlayerRow(item, drag, isActive, getIndex())}</ScaleDecorator>
  );

  const courtCount = Math.floor(players.length / 4);
  const teamCount = Math.floor(players.length / 2);
  const fixedRoundCount = teamCount > 1 ? (teamCount % 2 === 0 ? teamCount - 1 : teamCount) : 0;
  const fixedGameCount = teamCount * (teamCount - 1) / 2;
  const maleCount = players.filter(p => p.gender === 'male').length;
  const femaleCount = players.filter(p => p.gender === 'female').length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/groups')} style={styles.backBtn}>
                <BrandedIcon name="back" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>{groupName ? groupName.toUpperCase() : 'NEW GROUP'}</Text>
            </View>
            <TouchableOpacity onPress={handleSavePress} style={styles.saveHeaderBtn}>
                <Text style={styles.saveHeaderText}>SAVE</Text>
            </TouchableOpacity>
        </View>

        {/* Player count chips */}
        <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.chipText, { color: colors.accent }]}>{players.length} Players</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: 'rgba(79,172,254,0.1)' }]}>
                <Text style={[styles.chipText, { color: colors.male }]}>{maleCount} M</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: 'rgba(247,140,162,0.1)' }]}>
                <Text style={[styles.chipText, { color: colors.female }]}>{femaleCount} F</Text>
            </View>
        </View>

        {/* MODE SELECTOR */}
        <View style={styles.modeSelector}>
            <TouchableOpacity
                style={[styles.modeBtn, !isFixedTeams && styles.modeBtnActive]}
                onPress={() => setIsFixedTeams(false)}
                activeOpacity={0.7}
            >
                <BrandedIcon name="shuffle" size={18} color={!isFixedTeams ? colors.bg : colors.textMuted} />
                <Text style={[styles.modeBtnText, !isFixedTeams && styles.modeBtnTextActive]}>ROTATING PARTNERS</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.modeBtn, isFixedTeams && styles.modeBtnActive]}
                onPress={() => setIsFixedTeams(true)}
                activeOpacity={0.7}
            >
                <BrandedIcon name="link" size={18} color={isFixedTeams ? colors.bg : colors.textMuted} />
                <Text style={[styles.modeBtnText, isFixedTeams && styles.modeBtnTextActive]}>FIXED TEAMS</Text>
            </TouchableOpacity>
        </View>
        {isFixedTeams && (
            <Text style={styles.toggleInfo}>
                {teamCount} teams · {fixedRoundCount} rounds · {fixedGameCount} games
            </Text>
        )}

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.createMatchBtn} onPress={handleSetupPress}>
                <BrandedIcon name="game-controller" size={18} color={colors.bg} />
                <Text style={styles.createMatchBtnText}>CREATE MATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editPlayersBtn} onPress={() => router.push('/(tabs)/players')}>
                <BrandedIcon name="groups" size={18} color={colors.textSoft} />
                <Text style={styles.editPlayersBtnText}>ALL PLAYERS</Text>
            </TouchableOpacity>
        </View>

        {/* PLAYER INPUT WITH GLOBAL SEARCH */}
        <View style={styles.inputArea}>
            <View style={styles.inputRow}>
                <TextInput ref={nameInputRef} style={styles.input} placeholder="Search or add player..."
                    placeholderTextColor={colors.inputPlaceholder}
                    value={newPlayerName} onChangeText={handleNameChange}
                    onSubmitEditing={isAdding ? undefined : addNewPlayer} returnKeyType="done" blurOnSubmit={false}
                    editable={!isAdding} autoCapitalize="words" />
                <Pressable style={[styles.genderBtn, newPlayerGender === 'male' ? styles.maleActive : styles.femaleActive]}
                    onPress={() => { setNewPlayerGender(newPlayerGender === 'male' ? 'female' : 'male'); }}
                    disabled={isAdding}>
                    <BrandedIcon name={newPlayerGender === 'male' ? 'gender-male' : 'gender-female'} size={20} color="white" />
                </Pressable>
                <TouchableOpacity style={[styles.addBtn, isAdding && { opacity: 0.5 }]} onPress={addNewPlayer} disabled={isAdding}>
                    {isAdding ? <ActivityIndicator size="small" color={colors.text} /> : <BrandedIcon name="add" size={24} color={colors.text} />}
                </TouchableOpacity>
            </View>

            {showSearchResults && (
                <View style={styles.searchDropdown}>
                    <Text style={styles.searchHeader}>EXISTING PLAYERS</Text>
                    {searchResults.slice(0, 5).map(result => (
                        <TouchableOpacity key={result.id} style={styles.searchRow} onPress={() => addExistingPlayer(result)}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <BrandedIcon name={result.gender === 'female' ? 'gender-female' : 'gender-male'} size={16}
                                        color={result.gender === 'female' ? colors.female : colors.male} />
                                    <Text style={styles.searchName}>{result.first_name} {result.last_name}</Text>
                                    {result.is_verified && <BrandedIcon name="confirm" size={12} color={colors.accent} />}
                                </View>
                                <Text style={styles.searchMeta}>
                                    {result.source}{result.groups.length > 0 ? ` · ${result.groups.join(', ')}` : ''}
                                    {result.wins + result.losses > 0 ? ` · ${result.wins}W-${result.losses}L` : ''}
                                </Text>
                            </View>
                            <BrandedIcon name="add" size={24} color={colors.accent} />
                        </TouchableOpacity>
                    ))}
                    {isSearching && <ActivityIndicator size="small" color={colors.secondary} style={{ padding: 10 }} />}
                </View>
            )}
        </View>

        {Platform.OS === 'web' ? (
          <FlatList ref={listRef} data={players} keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => renderPlayerRow(item, () => {}, false, index)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No players added yet. Type a name above to search or create.</Text>} />
        ) : (
          <DraggableFlatList ref={listRef} data={players} onDragEnd={handleDragEnd} keyExtractor={(item) => item.id}
            renderItem={renderItem} contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No players added yet. Type a name above to search or create.</Text>} />
        )}

        {/* EDIT PLAYER MODAL */}
        <Modal visible={!!editingPlayer} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitle}>EDIT PLAYER</Text>

                    <Text style={styles.fieldLabel}>First Name</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={editName}
                        onChangeText={setEditName}
                        autoFocus
                        placeholder="First name"
                        placeholderTextColor={colors.inputPlaceholder}
                    />

                    <Text style={styles.fieldLabel}>Last Name</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={editLastName}
                        onChangeText={setEditLastName}
                        placeholder="Last name"
                        placeholderTextColor={colors.inputPlaceholder}
                    />

                    <Text style={styles.fieldLabel}>Gender</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 }}>
                        <Pressable
                            onPress={() => setEditGender('male')}
                            style={[styles.editGenderBtn, editGender === 'male' && { backgroundColor: colors.male }]}
                        >
                            <BrandedIcon name="gender-male" size={18} color={editGender === 'male' ? 'white' : colors.textMuted} />
                            <Text style={{ color: editGender === 'male' ? 'white' : colors.textMuted, fontFamily: FONT_BODY_SEMIBOLD, fontSize: 14 }}>Male</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setEditGender('female')}
                            style={[styles.editGenderBtn, editGender === 'female' && { backgroundColor: colors.female }]}
                        >
                            <BrandedIcon name="gender-female" size={18} color={editGender === 'female' ? 'white' : colors.textMuted} />
                            <Text style={{ color: editGender === 'female' ? 'white' : colors.textMuted, fontFamily: FONT_BODY_SEMIBOLD, fontSize: 14 }}>Female</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.fieldLabel}>Cell Phone</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={editPhone}
                        onChangeText={setEditPhone}
                        placeholder="(optional)"
                        placeholderTextColor={colors.inputPlaceholder}
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.fieldLabel}>DUPR Rating</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={editDupr}
                        onChangeText={setEditDupr}
                        placeholder="1.0 - 8.0 (optional)"
                        placeholderTextColor={colors.inputPlaceholder}
                        keyboardType="decimal-pad"
                    />

                    <Text style={styles.fieldLabel}>Home Court</Text>
                    <TouchableOpacity
                        style={[styles.modalInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }]}
                        onPress={() => { setShowCourtPicker(!showCourtPicker); setCourtSearchText(''); }}
                    >
                        <Text style={{ color: editHomeCourtId ? colors.inputText : colors.inputPlaceholder, fontFamily: FONT_BODY_MEDIUM, fontSize: 16 }}>
                            {editHomeCourtId ? (allCourts.find(c => c.id === editHomeCourtId)?.name || 'Unknown') : '(optional)'}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{showCourtPicker ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {showCourtPicker && (
                        <View style={{ backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 10, maxHeight: 200 }}>
                            <TextInput
                                style={[styles.modalInput, { margin: 8, marginBottom: 4 }]}
                                value={courtSearchText}
                                onChangeText={setCourtSearchText}
                                placeholder="Search courts..."
                                placeholderTextColor={colors.inputPlaceholder}
                                autoFocus
                            />
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 140 }}>
                                {editHomeCourtId && (
                                    <TouchableOpacity
                                        style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}
                                        onPress={() => { setEditHomeCourtId(null); setShowCourtPicker(false); }}
                                    >
                                        <Text style={{ color: colors.danger, fontFamily: FONT_BODY_SEMIBOLD, fontSize: 14 }}>Clear Home Court</Text>
                                    </TouchableOpacity>
                                )}
                                {allCourts
                                    .filter(c => !courtSearchText || c.name.toLowerCase().includes(courtSearchText.toLowerCase()) || (c.city && c.city.toLowerCase().includes(courtSearchText.toLowerCase())))
                                    .map(court => (
                                        <TouchableOpacity
                                            key={court.id}
                                            style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: court.id === editHomeCourtId ? colors.accentSoft : 'transparent' }}
                                            onPress={() => { setEditHomeCourtId(court.id); setShowCourtPicker(false); }}
                                        >
                                            <Text style={{ fontFamily: FONT_BODY_SEMIBOLD, fontSize: 14, color: colors.text }}>{court.name}</Text>
                                            {court.city && <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: colors.textMuted }}>{court.city}{court.state ? `, ${court.state}` : ''}</Text>}
                                        </TouchableOpacity>
                                    ))
                                }
                            </ScrollView>
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: colors.border }]} onPress={() => setEditingPlayer(null)}>
                            <Text style={[styles.modalBtnText, { color: colors.text }]}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: colors.accent }]} onPress={saveEditPlayer}>
                            <Text style={[styles.modalBtnText, { color: 'white' }]}>SAVE</Text>
                        </TouchableOpacity>
                    </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>

        {/* SAVE MODAL */}
        <Modal visible={saveModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}><View style={styles.modalContent}>
                <Text style={styles.modalTitle}>SAVE ROSTER</Text>
                <TextInput style={styles.modalInput} value={saveAsName} onChangeText={setSaveAsName}
                    placeholderTextColor={colors.inputPlaceholder} />
                <TouchableOpacity style={styles.saveOptionBtn} onPress={handleSmartSave}>
                    <BrandedIcon name="save" size={24} color={colors.bg} />
                    <Text style={styles.saveOptionText}>SAVE GROUP</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSaveModalVisible(false)} style={styles.closeModalBtn}>
                    <Text style={styles.closeText}>CANCEL</Text>
                </TouchableOpacity>
            </View></View>
        </Modal>

        {/* MATCH CONFIG MODAL */}
        <Modal visible={configModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}><View style={styles.modalContent}>
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>MATCH SETUP</Text>
                <View style={styles.infoBox}>
                    <Text style={styles.infoBoxText}>{players.length} Players</Text>
                    <Text style={styles.infoBoxText}>·</Text>
                    {isFixedTeams ? (
                        <Text style={styles.infoBoxText}>{teamCount} Teams</Text>
                    ) : (
                        <Text style={styles.infoBoxText}>{courtCount} Courts</Text>
                    )}
                </View>

                {isFixedTeams ? (
                    <>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoBoxText}>{fixedRoundCount} Rounds · {fixedGameCount} Games</Text>
                        </View>
                        <View style={{ marginVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10 }}>
                            <Text style={[styles.label, { marginBottom: 8 }]}>TEAM PAIRINGS (by roster order)</Text>
                            {Array.from({ length: teamCount }, (_, i) => (
                                <View key={i} style={[styles.roundConfigRow, { justifyContent: 'flex-start', gap: 10 }]}>
                                    <Text style={[styles.roundNum, { width: 50 }]}>Team {i + 1}</Text>
                                    <Text style={{ fontFamily: FONT_BODY_SEMIBOLD, fontSize: 14, color: colors.text, flex: 1 }}>
                                        {players[i * 2]?.first_name || '?'} & {players[i * 2 + 1]?.first_name || '?'}
                                    </Text>
                                </View>
                            ))}
                            <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                                Reorder players on the roster to change pairings
                            </Text>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.counterRow}>
                            <Text style={styles.label}>ROUNDS:</Text>
                            <View style={styles.roundControls}>
                                <TouchableOpacity onPress={removeRound} style={styles.roundBtn}><BrandedIcon name="minus" size={24} color={colors.text} /></TouchableOpacity>
                                <Text style={styles.roundCountText}>{roundsConfig.length}</Text>
                                <TouchableOpacity onPress={addRound} style={styles.roundBtn}><BrandedIcon name="add" size={24} color={colors.text} /></TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ maxHeight: 200, marginVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                            <ScrollView contentContainerStyle={{ padding: 10 }} nestedScrollEnabled>
                                {roundsConfig.map((conf, index) => (
                                    <View key={index} style={styles.roundConfigRow}>
                                        <Text style={styles.roundNum}>#{index + 1}</Text>
                                        <View style={styles.toggleGroup}>
                                            {(['mixed', 'gender', 'mixer'] as const).map(t => (
                                                <TouchableOpacity key={t} style={[styles.smallTypeBtn, conf.type === t && styles.smallTypeActive]}
                                                    onPress={() => updateRoundType(index, t)}>
                                                    <Text style={[styles.smallTypeText, conf.type === t && { color: colors.bg }]}>{t.toUpperCase()}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </>
                )}
                <TouchableOpacity style={styles.startMatchBtn} onPress={generateSchedule}>
                    <Text style={styles.startMatchText}>GENERATE MATCH</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfigModalVisible(false)} style={styles.closeModalBtn}>
                    <Text style={styles.closeText}>CANCEL</Text>
                </TouchableOpacity>
                </ScrollView>
            </View></View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    backgroundColor: c.surfaceLight,
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONT_DISPLAY_EXTRABOLD,
    fontSize: 20,
    color: c.text,
  },
  courtText: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 11,
    color: c.accent,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  saveHeaderBtn: {
    backgroundColor: c.accent,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveHeaderText: {
    color: c.bg,
    fontFamily: FONT_BODY_BOLD,
    fontSize: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: c.surfaceLight,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 11,
  },
  modeSelector: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, marginBottom: 4, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: c.surface },
  modeBtnActive: { backgroundColor: c.accent },
  modeBtnText: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 11, color: c.textMuted, letterSpacing: 0.5 },
  modeBtnTextActive: { color: c.bg },
  toggleInfo: { fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: c.textMuted, textAlign: 'center', paddingVertical: 4 },
  actionButtons: { flexDirection: 'row', padding: 16, gap: 10 },
  createMatchBtn: {
    flex: 1,
    backgroundColor: c.accent,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createMatchBtnText: {
    color: c.bg,
    fontFamily: FONT_DISPLAY_BOLD,
    fontSize: 14,
  },
  editPlayersBtn: {
    flex: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.glassStroke,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editPlayersBtnText: {
    color: c.textSoft,
    fontFamily: FONT_DISPLAY_BOLD,
    fontSize: 14,
  },
  inputArea: { paddingHorizontal: 20, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.glassStroke,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: FONT_BODY_REGULAR,
    color: c.inputText,
    height: 48,
  },
  genderBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  maleActive: { backgroundColor: c.male },
  femaleActive: { backgroundColor: c.female },
  addBtn: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.glassStroke,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  phoneToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10 },
  phoneToggleText: { color: c.secondary, fontSize: 13, fontFamily: FONT_BODY_SEMIBOLD },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10 },
  phoneInput: {
    flex: 1,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.glassStroke,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FONT_BODY_REGULAR,
    color: c.inputText,
    height: 40,
  },
  searchDropdown: { backgroundColor: c.surfaceLight, borderTopWidth: 1, borderColor: c.border, marginTop: 8, borderRadius: 12, paddingBottom: 5 },
  searchHeader: { fontSize: 10, fontFamily: FONT_BODY_BOLD, color: c.textMuted, paddingHorizontal: 15, paddingTop: 8, paddingBottom: 4, letterSpacing: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border },
  searchName: { fontSize: 15, fontFamily: FONT_DISPLAY_BOLD, color: c.text },
  searchMeta: { fontSize: 11, fontFamily: FONT_BODY_REGULAR, color: c.textMuted, marginTop: 2 },
  listContent: { padding: 20, paddingBottom: 350 },
  playerRow: {
    backgroundColor: c.card,
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  playerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dragHandle: { padding: 4 },
  genderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  playerName: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 16, color: c.text },
  playerStats: { fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: c.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 50, color: c.textMuted, fontSize: 15, fontFamily: FONT_BODY_REGULAR, paddingHorizontal: 30 },
  // Info modal
  infoText: { fontSize: 15, fontFamily: FONT_BODY_REGULAR, color: c.textSoft, lineHeight: 22 },
  infoCloseBtn: { backgroundColor: c.accent, borderRadius: 14, padding: 15, marginTop: 20, alignItems: 'center' },
  infoCloseBtnText: { color: c.bg, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: c.modalOverlay, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: c.modalBg, borderRadius: 20, padding: 25, maxHeight: '90%' },
  modalTitle: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 22, color: c.text, textAlign: 'center', marginBottom: 20 },
  modalInput: {
    borderWidth: 1,
    borderColor: c.inputBorder,
    backgroundColor: c.inputBg,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    fontFamily: FONT_BODY_MEDIUM,
    color: c.inputText,
    marginBottom: 10,
  },
  saveOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    padding: 15,
    borderRadius: 14,
    backgroundColor: c.accent,
    marginBottom: 10,
  },
  saveOptionText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16, color: c.bg },
  closeModalBtn: { marginTop: 10, alignItems: 'center', padding: 10 },
  closeText: { color: c.textMuted, fontFamily: FONT_BODY_BOLD },
  fieldLabel: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 12, color: c.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  modalBtn: { alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14 },
  modalBtnText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 15, letterSpacing: 0.5 },
  editGenderBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  courtDisplayBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accentSoft, padding: 10, borderRadius: 10, marginBottom: 15 },
  courtDisplayText: { flex: 1, fontFamily: FONT_BODY_BOLD, color: c.accent, fontSize: 14 },
  infoBox: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20, backgroundColor: c.surfaceLight, padding: 10, borderRadius: 10 },
  infoBoxText: { fontFamily: FONT_BODY_BOLD, color: c.textSoft },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: c.textMuted },
  roundControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  roundBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  roundCountText: { fontSize: 20, fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.text },
  roundConfigRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 5, borderBottomWidth: 1, borderColor: c.border },
  roundNum: { width: 30, fontFamily: FONT_BODY_BOLD, color: c.textMuted },
  toggleGroup: { flex: 1, flexDirection: 'row', gap: 5 },
  smallTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: c.surfaceLight, alignItems: 'center' },
  smallTypeActive: { backgroundColor: c.accent },
  smallTypeText: { fontSize: 10, fontFamily: FONT_BODY_BOLD, color: c.textMuted },
  startMatchBtn: { backgroundColor: c.accent, padding: 15, borderRadius: 14, marginTop: 10, alignItems: 'center' },
  startMatchText: { color: c.bg, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16 },
});
