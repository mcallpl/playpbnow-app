import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

  // Court (from group)
  const [courtId, setCourtId] = useState<number | null>(null);
  const [courtName, setCourtName] = useState('');

  // Global search
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Modals
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [phoneInfoVisible, setPhoneInfoVisible] = useState(false);

  const [roundsConfig, setRoundsConfig] = useState<RoundConfig[]>([
      { type: 'mixed' }, { type: 'mixed' }, { type: 'mixed' },
      { type: 'mixed' }, { type: 'mixed' }, { type: 'mixed' }
  ]);

  // --- LOAD DATA ---
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

            // Court from params
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

  // --- GLOBAL SEARCH ---
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

  // --- ADD EXISTING PLAYER ---
  const addExistingPlayer = async (result: SearchResult) => {
      try {
          const res = await fetch(`${API_URL}/add_player.php`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ group_key: groupKey, existing_player_id: result.id })
          });
          const data = await res.json();
          if (data.status === 'success') {
              setPlayers([{
                  id: result.player_key, db_id: result.id, first_name: result.first_name,
                  last_name: result.last_name, gender: result.gender,
                  home_court_name: result.home_court_name, wins: result.wins,
                  losses: result.losses, win_pct: result.win_pct,
                  groups: result.groups, is_verified: result.is_verified
              }, ...players]);
              setNewPlayerName(''); setSearchResults([]); setShowSearchResults(false); setShowPhoneInput(false); setNewPlayerPhone('');
          } else { Alert.alert('Error', data.message); }
      } catch (e) { Alert.alert('Error', 'Failed to add player'); }
  };

  // --- ADD NEW PLAYER (with duplicate detection + debounce) ---
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
              // Ask user if this is the same person or a different one
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
              setPlayers([{
                  id: data.player_key || pk, first_name: data.first_name || name,
                  gender, home_court_name: courtName || null
              }, ...players]);
              setNewPlayerName(''); setSearchResults([]); setShowSearchResults(false); setShowPhoneInput(false); setNewPlayerPhone('');
          } else { Alert.alert('Error', data.message); }
      } catch (e) {
          // Fallback local add
          setPlayers([{ id: Date.now().toString(), first_name: newPlayerName.trim(), gender: newPlayerGender }, ...players]);
          setNewPlayerName(''); setShowPhoneInput(false); setNewPlayerPhone('');
      } finally {
          setIsAdding(false);
      }
  };

  const removePlayer = (pid: string) => setPlayers(players.filter(p => p.id !== pid));

  // --- SAVE ---
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

  // --- DRAG ORDER ---
  const handleDragEnd = ({ data }: { data: Player[] }) => {
      setPlayers(data);
      if (groupKey && deviceId) {
          fetch(`${API_URL}/save_players.php`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ group_key: groupKey, user_id: deviceId, players: data })
          }).catch(() => {});
      }
  };

  // --- MATCH SETUP ---
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

  // --- RENDER ---
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Player>) => {
    const totalGames = (item.wins || 0) + (item.losses || 0);
    const hasStats = totalGames > 0;
    return (
      <ScaleDecorator>
        <View style={[styles.playerRow, isActive && { backgroundColor: '#eef', elevation: 5 }]}>
          <View style={styles.playerInfo}>
             <Pressable onPressIn={drag} hitSlop={20} style={styles.dragHandle}>
                 <Ionicons name="menu" size={28} color="#999" />
             </Pressable>
             <Ionicons name={item.gender === 'female' ? 'woman' : 'man'} size={20} 
                color={item.gender === 'female' ? '#ff69b4' : '#4dabf7'} style={{ marginLeft: 10 }} />
             <View style={{ marginLeft: 10, flex: 1 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                     <Text style={styles.playerName}>{item.first_name}</Text>
                     {item.is_verified && <Ionicons name="checkmark-circle" size={14} color="#87ca37" />}
                 </View>
                 {hasStats ? (
                     <Text style={styles.playerStats}>{item.wins}W-{item.losses}L • {(item.win_pct || 0).toFixed(0)}% • Diff: {(item.diff || 0) > 0 ? '+' : ''}{item.diff || 0}</Text>
                 ) : item.home_court_name ? (
                     <Text style={styles.playerStats}>{item.home_court_name}</Text>
                 ) : null}
             </View>
          </View>
          <TouchableOpacity onPress={() => removePlayer(item.id)}>
            <Ionicons name="close-circle" size={24} color="#ff4444" />
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
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>{groupName ? groupName.toUpperCase() : 'NEW GROUP'}</Text>
                <Text style={styles.headerSub}>{players.length} PLAYERS: {femaleCount} F & {maleCount} M</Text>
                {courtName ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="location" size={11} color="#87ca37" />
                        <Text style={{ color: '#87ca37', fontSize: 10, fontWeight: '700' }}>{courtName}</Text>
                    </View>
                ) : null}
            </View>
            <TouchableOpacity onPress={handleSavePress} style={styles.saveHeaderBtn}>
                <Text style={styles.saveHeaderText}>SAVE</Text>
            </TouchableOpacity>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.createMatchBtn} onPress={handleSetupPress}>
                <Ionicons name="game-controller" size={20} color="white" />
                <Text style={styles.actionBtnText}>CREATE MATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editPlayersBtn} onPress={() => router.push('/(tabs)/players')}>
                <Ionicons name="people" size={20} color="white" />
                <Text style={styles.actionBtnText}>ALL PLAYERS</Text>
            </TouchableOpacity>
        </View>

        {/* PLAYER INPUT WITH GLOBAL SEARCH */}
        <View style={styles.inputArea}>
            <View style={styles.inputRow}>
                <TextInput style={styles.input} placeholder="Search or add player..."
                    value={newPlayerName} onChangeText={handleNameChange}
                    onSubmitEditing={isAdding ? undefined : addNewPlayer} returnKeyType="done" blurOnSubmit={false}
                    editable={!isAdding} />
                <TouchableOpacity style={[styles.genderBtn, newPlayerGender === 'male' ? styles.maleActive : styles.femaleActive]}
                    onPress={() => setNewPlayerGender(prev => prev === 'male' ? 'female' : 'male')}
                    disabled={isAdding}>
                    <Ionicons name={newPlayerGender === 'male' ? 'man' : 'woman'} size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, isAdding && { opacity: 0.5 }]} onPress={addNewPlayer} disabled={isAdding}>
                    {isAdding ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="add" size={28} color="white" />}
                </TouchableOpacity>
            </View>
            
            {/* Optional phone input */}
            {!showPhoneInput ? (
                <TouchableOpacity onPress={() => setShowPhoneInput(true)} style={styles.phoneToggle}>
                    <Ionicons name="call-outline" size={14} color="#4a90e2" />
                    <Text style={styles.phoneToggleText}>Add phone number</Text>
                    <TouchableOpacity onPress={() => setPhoneInfoVisible(true)} hitSlop={10}>
                        <Ionicons name="information-circle-outline" size={16} color="#999" />
                    </TouchableOpacity>
                </TouchableOpacity>
            ) : (
                <View style={styles.phoneRow}>
                    <TextInput style={styles.phoneInput} placeholder="Phone (optional)"
                        value={newPlayerPhone} onChangeText={setNewPlayerPhone}
                        keyboardType="phone-pad" />
                    <TouchableOpacity onPress={() => { setShowPhoneInput(false); setNewPlayerPhone(''); }}>
                        <Ionicons name="close" size={20} color="#999" />
                    </TouchableOpacity>
                </View>
            )}
            
            {/* SEARCH RESULTS */}
            {showSearchResults && (
                <View style={styles.searchDropdown}>
                    <Text style={styles.searchHeader}>EXISTING PLAYERS</Text>
                    {searchResults.slice(0, 5).map(result => (
                        <TouchableOpacity key={result.id} style={styles.searchRow} onPress={() => addExistingPlayer(result)}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name={result.gender === 'female' ? 'woman' : 'man'} size={16} 
                                        color={result.gender === 'female' ? '#ff69b4' : '#4dabf7'} />
                                    <Text style={styles.searchName}>{result.first_name} {result.last_name}</Text>
                                    {result.is_verified && <Ionicons name="checkmark-circle" size={12} color="#87ca37" />}
                                </View>
                                <Text style={styles.searchMeta}>
                                    {result.source}{result.groups.length > 0 ? ` • ${result.groups.join(', ')}` : ''}
                                    {result.wins + result.losses > 0 ? ` • ${result.wins}W-${result.losses}L` : ''}
                                </Text>
                            </View>
                            <Ionicons name="add-circle" size={24} color="#87ca37" />
                        </TouchableOpacity>
                    ))}
                    {isSearching && <ActivityIndicator size="small" color="#4a90e2" style={{ padding: 10 }} />}
                </View>
            )}
        </View>

        <DraggableFlatList data={players} onDragEnd={handleDragEnd} keyExtractor={(item) => item.id}
          renderItem={renderItem} contentContainerStyle={styles.listContent} 
          ListEmptyComponent={<Text style={styles.emptyText}>No players added yet. Type a name above to search or create.</Text>} />

        <View style={styles.bottomBtnArea}>
            <TouchableOpacity style={styles.startBtn} onPress={handleSetupPress}>
                <Text style={styles.startBtnText}>MATCH SETUP</Text>
            </TouchableOpacity>
        </View>

        {/* PHONE INFO MODAL */}
        <Modal visible={phoneInfoVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { padding: 30 }]}>
                    <Ionicons name="shield-checkmark" size={48} color="#87ca37" style={{ alignSelf: 'center', marginBottom: 15 }} />
                    <Text style={styles.modalTitle}>Why Add a Phone?</Text>
                    <Text style={styles.infoText}>
                        Adding a phone number creates a <Text style={{ fontWeight: '900' }}>verified player profile</Text> that tracks stats across ALL groups and courts.
                    </Text>
                    <Text style={[styles.infoText, { marginTop: 10 }]}>
                        Without a phone number, players are matched by name only, which can create duplicates if someone plays in multiple groups.
                    </Text>
                    <Text style={[styles.infoText, { marginTop: 10 }]}>
                        Phone numbers are <Text style={{ fontWeight: '900' }}>never shared</Text> with other users — they're only used to link player records.
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
                <TextInput style={styles.modalInput} value={saveAsName} onChangeText={setSaveAsName} />
                <TouchableOpacity style={[styles.optionBtn, styles.createOption]} onPress={handleSmartSave}>
                    <Ionicons name="save" size={24} color="white" />
                    <Text style={[styles.optionTitle, {color:'white'}]}>SAVE GROUP</Text>
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
                        <Ionicons name="location" size={16} color="#87ca37" />
                        <Text style={styles.courtDisplayText}>{courtName}</Text>
                    </View>
                ) : null}
                <View style={styles.infoBox}>
                    <Text style={styles.infoBoxText}>{players.length} Players</Text>
                    <Text style={styles.infoBoxText}>•</Text>
                    <Text style={styles.infoBoxText}>{courtCount} Courts</Text>
                </View>
                <View style={styles.counterRow}>
                    <Text style={styles.label}>ROUNDS:</Text>
                    <View style={styles.roundControls}>
                        <TouchableOpacity onPress={removeRound} style={styles.roundBtn}><Ionicons name="remove" size={24} color="#1b3358" /></TouchableOpacity>
                        <Text style={styles.roundCountText}>{roundsConfig.length}</Text>
                        <TouchableOpacity onPress={addRound} style={styles.roundBtn}><Ionicons name="add" size={24} color="#1b3358" /></TouchableOpacity>
                    </View>
                </View>
                <View style={{height: 250, marginVertical: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 10}}>
                    <ScrollView contentContainerStyle={{padding: 10}}>
                        {roundsConfig.map((conf, index) => (
                            <View key={index} style={styles.roundConfigRow}>
                                <Text style={styles.roundNum}>#{index + 1}</Text>
                                <View style={styles.toggleGroup}>
                                    {(['mixed', 'gender', 'mixer'] as const).map(t => (
                                        <TouchableOpacity key={t} style={[styles.smallTypeBtn, conf.type === t && styles.smallTypeActive]}
                                            onPress={() => updateRoundType(index, t)}>
                                            <Text style={[styles.smallTypeText, conf.type === t && {color:'#1b3358'}]}>{t.toUpperCase()}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { backgroundColor: '#1b3358', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
  headerSub: { color: '#87ca37', fontSize: 10, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  saveHeaderBtn: { backgroundColor: '#87ca37', paddingVertical: 5, paddingHorizontal: 15, borderRadius: 20 },
  saveHeaderText: { color: 'white', fontWeight: '900', fontSize: 12 },
  actionButtons: { flexDirection: 'row', padding: 15, gap: 10 },
  createMatchBtn: { flex: 1, backgroundColor: '#87ca37', borderRadius: 25, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  editPlayersBtn: { flex: 1, backgroundColor: '#4a90e2', borderRadius: 25, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  inputArea: { backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 15 },
  input: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 10, paddingHorizontal: 15, fontSize: 16, height: 44 },
  genderBtn: { width: 50, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  maleActive: { backgroundColor: '#4dabf7' },
  femaleActive: { backgroundColor: '#ff69b4' },
  addBtn: { backgroundColor: '#1b3358', width: 50, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  phoneToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingBottom: 12 },
  phoneToggleText: { color: '#4a90e2', fontSize: 13, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingBottom: 12 },
  phoneInput: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 10, paddingHorizontal: 15, fontSize: 16, height: 40 },
  searchDropdown: { backgroundColor: '#fafafa', borderTopWidth: 1, borderColor: '#eee', paddingBottom: 5 },
  searchHeader: { fontSize: 10, fontWeight: '900', color: '#999', paddingHorizontal: 15, paddingTop: 8, paddingBottom: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  searchName: { fontSize: 15, fontWeight: '700', color: '#333' },
  searchMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  listContent: { padding: 20, paddingBottom: 350 },
  bottomBtnArea: { padding: 15, backgroundColor: '#f4f6f8' },
  playerRow: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dragHandle: { padding: 5, marginRight: 10 },
  playerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  playerStats: { fontSize: 11, color: '#888', marginTop: 2, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16, paddingHorizontal: 30 },
  startBtn: { backgroundColor: '#87ca37', padding: 18, borderRadius: 30, alignItems: 'center' },
  startBtnText: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  courtDisplayBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fff0', padding: 10, borderRadius: 10, marginBottom: 15 },
  courtDisplayText: { flex: 1, fontWeight: '700', color: '#1b3358', fontSize: 14 },
  // Info modal
  infoText: { fontSize: 15, color: '#555', lineHeight: 22 },
  infoCloseBtn: { backgroundColor: '#87ca37', borderRadius: 25, padding: 15, marginTop: 20, alignItems: 'center' },
  infoCloseBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, maxHeight: '90%' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1b3358', textAlign: 'center', marginBottom: 20 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 10 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, padding: 15, borderRadius: 12, marginBottom: 10 },
  createOption: { backgroundColor: '#1b3358' },
  optionTitle: { fontWeight: 'bold', fontSize: 16 },
  closeModalBtn: { marginTop: 10, alignItems: 'center', padding: 10 },
  closeText: { color: '#999', fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20, backgroundColor: '#f0f2f5', padding: 10, borderRadius: 10 },
  infoBoxText: { fontWeight: 'bold', color: '#666' },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '900', color: '#999' },
  roundControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  roundBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  roundCountText: { fontSize: 20, fontWeight: '900', color: '#1b3358' },
  roundConfigRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 5, borderBottomWidth: 1, borderColor: '#f9f9f9' },
  roundNum: { width: 30, fontWeight: 'bold', color: '#ccc' },
  toggleGroup: { flex: 1, flexDirection: 'row', gap: 5 },
  smallTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f9f9f9', alignItems: 'center' },
  smallTypeActive: { backgroundColor: '#eef', borderWidth: 1, borderColor: '#1b3358' },
  smallTypeText: { fontSize: 10, fontWeight: 'bold', color: '#ccc' },
  startMatchBtn: { backgroundColor: '#87ca37', padding: 15, borderRadius: 15, marginTop: 10, alignItems: 'center' },
  startMatchText: { color: 'white', fontWeight: '900', fontSize: 16 }
});
