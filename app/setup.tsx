import { BrandedIcon } from '../components/BrandedIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
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

const API_URL = 'https://peoplestar.com/Chipleball/api';

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
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [phoneInfoVisible, setPhoneInfoVisible] = useState(false);

  const [roundsConfig, setRoundsConfig] = useState<RoundConfig[]>([
      { type: 'mixed' }, { type: 'mixed' }, { type: 'mixed' },
      { type: 'mixed' }, { type: 'mixed' }, { type: 'mixed' }
  ]);

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
        load();
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
      setNewPlayerName(text);
      searchGlobalPlayers(text);
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
                  gender, home_court_name: courtName || null
              }, ...players]);
              setNewPlayerName(''); setSearchResults([]); setShowSearchResults(false); setShowPhoneInput(false); setNewPlayerPhone('');
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
                      gender, home_court_name: courtName || null
                  }, ...players]);
              }
              setNewPlayerName(''); setSearchResults([]); setShowSearchResults(false); setShowPhoneInput(false); setNewPlayerPhone('');
          } else { Alert.alert('Error', data.message); }
      } catch (e) {
          setPlayers([{ id: Date.now().toString(), first_name: newPlayerName.trim(), gender: newPlayerGender }, ...players]);
          setNewPlayerName(''); setShowPhoneInput(false); setNewPlayerPhone('');
      } finally {
          setIsAdding(false);
      }
  };

  const removePlayer = (pid: string) => setPlayers(players.filter(p => p.id !== pid));

  const handleSavePress = () => { setSaveAsName(groupName); setSaveModalVisible(true); };
  const performSave = async () => {
     try {
        if (!groupKey || !deviceId) { Alert.alert("Error", "Missing group info"); return; }
        const res = await fetch(`${API_URL}/save_players.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_key: groupKey, user_id: deviceId, players })
        });
        const data = await res.json();
        if (data.status === 'success') { setSaveModalVisible(false); Alert.alert("Success", `Roster saved!`); }
        else Alert.alert("Error", data.message);
     } catch (e) { Alert.alert("Error", "Failed to save roster"); }
  };
  const handleSmartSave = async () => { if (!saveAsName.trim()) { Alert.alert("Error", "Enter a group name."); return; } await performSave(); };

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
    setConfigModalVisible(true);
  };

  const addRound = () => setRoundsConfig([...roundsConfig, { type: 'mixed' }]);
  const removeRound = () => { if (roundsConfig.length > 1) { const c = [...roundsConfig]; c.pop(); setRoundsConfig(c); } };
  const updateRoundType = (i: number, t: 'mixed' | 'gender' | 'mixer') => { const c = [...roundsConfig]; c[i].type = t; setRoundsConfig(c); };

  const generateSchedule = async () => {
    try {
        setConfigModalVisible(false);
        if (groupName) await AsyncStorage.removeItem(`scores_${groupName}`);
        const res = await fetch(`${API_URL}/generate_schedule.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_key: groupKey, round_configs: roundsConfig, group: groupName, players: players.map(p => ({ id: p.id, first_name: p.first_name, gender: p.gender })) }),
        });
        const data = await res.json();
        if (data.status === 'success') {
            router.push({
                pathname: '/(tabs)/game',
                params: { schedule: JSON.stringify(data.schedule), players: JSON.stringify(players), groupName, groupKey, courtName, courtId: (courtId || '').toString() }
            });
        } else { Alert.alert("Error", data.message || "Generation failed."); }
    } catch (e) { Alert.alert("Error", "Network error."); }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Player>) => {
    const totalGames = (item.wins || 0) + (item.losses || 0);
    const hasStats = totalGames > 0;
    return (
      <ScaleDecorator>
        <View style={[styles.playerRow, isActive && { backgroundColor: colors.cardHover, elevation: 5 }]}>
          <View style={styles.playerInfo}>
             <Pressable onPressIn={drag} hitSlop={20} style={styles.dragHandle}>
                 <BrandedIcon name="menu" size={24} color={colors.textMuted} />
             </Pressable>
             <View style={[styles.genderIcon, { backgroundColor: item.gender === 'female' ? 'rgba(247,140,162,0.15)' : 'rgba(79,172,254,0.15)' }]}>
                 <BrandedIcon name={item.gender === 'female' ? 'gender-female' : 'gender-male'} size={16}
                    color={item.gender === 'female' ? colors.female : colors.male} />
             </View>
             <View style={{ marginLeft: 12, flex: 1 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                     <Text style={styles.playerName}>{item.first_name}</Text>
                     {item.is_verified && <BrandedIcon name="confirm" size={14} color={colors.accent} />}
                 </View>
                 <Text style={styles.playerStats}>
                     {hasStats ? `${item.wins}W-${item.losses}L · ${(item.win_pct || 0).toFixed(0)}%` : ''}
                     {hasStats && item.home_court_name ? ' · ' : ''}
                     {item.home_court_name || ''}
                 </Text>
             </View>
          </View>
          <TouchableOpacity onPress={() => removePlayer(item.id)}>
            <BrandedIcon name="close" size={22} color={colors.danger} style={{ opacity: 0.5 }} />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  const courtCount = Math.floor(players.length / 4);
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
                {courtName ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <BrandedIcon name="location" size={10} color={colors.accent} />
                        <Text style={styles.courtText}>{courtName}</Text>
                    </View>
                ) : null}
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
                <TextInput style={styles.input} placeholder="Search or add player..."
                    placeholderTextColor={colors.inputPlaceholder}
                    value={newPlayerName} onChangeText={handleNameChange}
                    onSubmitEditing={isAdding ? undefined : addNewPlayer} returnKeyType="done" blurOnSubmit={false}
                    editable={!isAdding} />
                <TouchableOpacity style={[styles.genderBtn, newPlayerGender === 'male' ? styles.maleActive : styles.femaleActive]}
                    onPress={() => setNewPlayerGender(prev => prev === 'male' ? 'female' : 'male')}
                    disabled={isAdding}>
                    <BrandedIcon name={newPlayerGender === 'male' ? 'gender-male' : 'gender-female'} size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, isAdding && { opacity: 0.5 }]} onPress={addNewPlayer} disabled={isAdding}>
                    {isAdding ? <ActivityIndicator size="small" color={colors.text} /> : <BrandedIcon name="add" size={24} color={colors.text} />}
                </TouchableOpacity>
            </View>

            {!showPhoneInput ? (
                <TouchableOpacity onPress={() => setShowPhoneInput(true)} style={styles.phoneToggle}>
                    <BrandedIcon name="phone" size={14} color={colors.secondary} />
                    <Text style={styles.phoneToggleText}>Add phone number</Text>
                    <TouchableOpacity onPress={() => setPhoneInfoVisible(true)} hitSlop={10}>
                        <BrandedIcon name="info" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                </TouchableOpacity>
            ) : (
                <View style={styles.phoneRow}>
                    <TextInput style={styles.phoneInput} placeholder="Phone (optional)"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={newPlayerPhone} onChangeText={setNewPlayerPhone}
                        keyboardType="phone-pad" />
                    <TouchableOpacity onPress={() => { setShowPhoneInput(false); setNewPlayerPhone(''); }}>
                        <BrandedIcon name="close" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            )}

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

        <DraggableFlatList data={players} onDragEnd={handleDragEnd} keyExtractor={(item) => item.id}
          renderItem={renderItem} contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No players added yet. Type a name above to search or create.</Text>} />

        {/* PHONE INFO MODAL */}
        <Modal visible={phoneInfoVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { padding: 30 }]}>
                    <BrandedIcon name="confirm" size={48} color={colors.accent} style={{ alignSelf: 'center', marginBottom: 15 }} />
                    <Text style={styles.modalTitle}>Why Add a Phone?</Text>
                    <Text style={styles.infoText}>
                        Adding a phone number creates a <Text style={{ fontFamily: FONT_BODY_BOLD }}>verified player profile</Text> that tracks stats across ALL groups and courts.
                    </Text>
                    <Text style={[styles.infoText, { marginTop: 10 }]}>
                        Without a phone number, players are matched by name only, which can create duplicates if someone plays in multiple groups.
                    </Text>
                    <Text style={[styles.infoText, { marginTop: 10 }]}>
                        Phone numbers are <Text style={{ fontFamily: FONT_BODY_BOLD }}>never shared</Text> with other users.
                    </Text>
                    <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setPhoneInfoVisible(false)}>
                        <Text style={styles.infoCloseBtnText}>GOT IT</Text>
                    </TouchableOpacity>
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
                <Text style={styles.modalTitle}>MATCH SETUP</Text>
                {courtName ? (
                    <View style={styles.courtDisplayBar}>
                        <BrandedIcon name="location" size={16} color={colors.accent} />
                        <Text style={styles.courtDisplayText}>{courtName}</Text>
                    </View>
                ) : null}
                <View style={styles.infoBox}>
                    <Text style={styles.infoBoxText}>{players.length} Players</Text>
                    <Text style={styles.infoBoxText}>·</Text>
                    <Text style={styles.infoBoxText}>{courtCount} Courts</Text>
                </View>
                <View style={styles.counterRow}>
                    <Text style={styles.label}>ROUNDS:</Text>
                    <View style={styles.roundControls}>
                        <TouchableOpacity onPress={removeRound} style={styles.roundBtn}><BrandedIcon name="minus" size={24} color={colors.text} /></TouchableOpacity>
                        <Text style={styles.roundCountText}>{roundsConfig.length}</Text>
                        <TouchableOpacity onPress={addRound} style={styles.roundBtn}><BrandedIcon name="add" size={24} color={colors.text} /></TouchableOpacity>
                    </View>
                </View>
                <View style={{ height: 250, marginVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                    <ScrollView contentContainerStyle={{ padding: 10 }}>
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
                <TouchableOpacity style={styles.startMatchBtn} onPress={generateSchedule}>
                    <Text style={styles.startMatchText}>GENERATE MATCH</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfigModalVisible(false)} style={styles.closeModalBtn}>
                    <Text style={styles.closeText}>CANCEL</Text>
                </TouchableOpacity>
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
