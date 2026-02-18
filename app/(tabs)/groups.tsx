import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { JoinMatchModal } from '../../components/JoinMatchModal';
import { TrialBanner } from '../../components/TrialBanner';
import { useSubscription } from '../../context/SubscriptionContext';

interface Court {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
}

interface Group {
  id: number;
  group_key: string;
  name: string;
  court_id?: number | null;
  court_name?: string | null;
  court_city?: string | null;
  count?: number;
  maleCount?: number;
  femaleCount?: number;
}

const API_URL = 'https://peoplestar.com/Chipleball/api';

export default function HomeScreen() {
  const router = useRouter();
  const { isPro, isFree, isTrial, trialDaysRemaining, showPaywall, features, subscription, refreshSubscription } = useSubscription();
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  // Single modal with view states
  const [modalVisible, setModalVisible] = useState(false);
  type ModalView = 'form' | 'courtPicker' | 'addCourt';
  const [modalView, setModalView] = useState<ModalView>('form');

  // Group form
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Court selection
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [loadingCourts, setLoadingCourts] = useState(false);

  // Add court form
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtCity, setNewCourtCity] = useState('');
  const [newCourtState, setNewCourtState] = useState('');
  const [savingCourt, setSavingCourt] = useState(false);

  useFocusEffect(
    useCallback(() => {
      initializeAndLoad();
    }, [])
  );

  const initializeAndLoad = async () => {
    const uid = await AsyncStorage.getItem('user_id');
    if (!uid) { 
      router.replace('/login'); 
      return; 
    }
    setUserId(uid);
    await loadGroups(uid);
    await loadCourts();
  };

  const loadGroups = async (did: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/get_groups.php?user_id=${did}`);
      const data = await res.json();
      if (data.status === 'success') setGroups(data.groups || []);
      else setGroups([]);
    } catch (e) { setGroups([]); }
    finally { setLoading(false); }
  };

  const loadCourts = async () => {
    try {
      setLoadingCourts(true);
      const res = await fetch(`${API_URL}/get_courts.php`);
      const data = await res.json();
      if (data.status === 'success') setCourts(data.courts || []);
    } catch (e) {} finally { setLoadingCourts(false); }
  };

  const getSelectedCourtName = (): string | null => {
    if (!selectedCourtId) return null;
    const court = courts.find(c => c.id === selectedCourtId);
    return court ? court.name : null;
  };

  const getSelectedCourtCity = (): string | null => {
    if (!selectedCourtId) return null;
    const court = courts.find(c => c.id === selectedCourtId);
    return court?.city || null;
  };

  // --- MODAL MANAGEMENT ---
  const openCreateModal = () => {
    // Gate: free users limited to maxGroups
    if (isFree && groups.length >= features.maxGroups) {
      showPaywall(`You've reached the free limit of ${features.maxGroups} groups. Upgrade to Pro for unlimited groups!`);
      return;
    }
    setEditingGroup(null);
    setNewGroupName('');
    setSelectedCourtId(null);
    setModalView('form');
    setModalVisible(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setSelectedCourtId(group.court_id || null);
    setModalView('form');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewGroupName('');
    setEditingGroup(null);
    setSelectedCourtId(null);
    setModalView('form');
  };

  // --- SAVE GROUP ---
  const saveGroup = async () => {
    if (!newGroupName.trim()) { Alert.alert('Error', 'Please enter a group name.'); return; }
    if (!selectedCourtId && !editingGroup) { Alert.alert('Select Location', 'Please select a match location for this group.'); return; }

    setLoading(true);
    try {
      if (editingGroup) {
        const res = await fetch(`${API_URL}/update_group.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_key: editingGroup.group_key, new_name: newGroupName.trim(), user_id: userId }),
        });
        const data = await res.json();
        if (data.status === 'success') { await loadGroups(userId); closeModal(); }
        else Alert.alert('Error', data.message || 'Failed to update group');
      } else {
        const res = await fetch(`${API_URL}/create_group.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newGroupName.trim(), user_id: userId, court_id: selectedCourtId }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          await loadGroups(userId);
          const group = data.group;
          await AsyncStorage.setItem('active_group_name', group.name);
          await AsyncStorage.setItem('active_group_key', group.group_key);
          closeModal();
          router.push({
            pathname: '/setup',
            params: { groupId: group.id.toString(), groupName: group.name, groupKey: group.group_key, courtId: (selectedCourtId || '').toString(), courtName: getSelectedCourtName() || '' }
          });
        } else Alert.alert('Error', data.message || 'Failed to create group');
      }
    } catch (e) { Alert.alert('Error', 'Failed to save group'); }
    finally { setLoading(false); }
  };

  // --- ADD NEW COURT ---
  const handleAddCourt = async () => {
    if (!newCourtName.trim()) { Alert.alert('Error', 'Court name is required.'); return; }
    if (!newCourtCity.trim()) { Alert.alert('Error', 'City is required.'); return; }

    setSavingCourt(true);
    try {
      const res = await fetch(`${API_URL}/add_court.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCourtName.trim(),
          city: newCourtCity.trim(),
          state: newCourtState.trim(),
          user_id: userId
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const newCourt = data.court;
        setCourts(prev => [...prev, { id: newCourt.id, name: newCourt.name, city: newCourt.city, state: newCourt.state || null }]);
        setSelectedCourtId(newCourt.id);
        setNewCourtName('');
        setNewCourtCity('');
        setNewCourtState('');
        setModalView('form'); // Go back to group form
      } else { Alert.alert('Error', data.message); }
    } catch (e) { Alert.alert('Error', 'Failed to create court'); }
    finally { setSavingCourt(false); }
  };

  // --- DELETE GROUP ---
  const deleteGroup = (group: Group) => {
    Alert.alert("Delete Group", `Delete "${group.name}" and all its data?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/delete_group.php`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ group_key: group.group_key, user_id: userId }),
            });
            const data = await res.json();
            if (data.status === 'success') await loadGroups(userId);
            else Alert.alert('Error', data.message);
          } catch (e) { Alert.alert('Error', 'Failed to delete group'); }
          finally { setLoading(false); }
      }}
    ]);
  };

  const handleGroupSelect = async (group: Group) => {
    try {
      await AsyncStorage.setItem('active_group_name', group.name);
      await AsyncStorage.setItem('active_group_key', group.group_key);
      router.push({
        pathname: '/setup',
        params: {
          groupId: group.id.toString(), groupName: group.name, groupKey: group.group_key,
          courtId: (group.court_id || '').toString(), courtName: group.court_name || ''
        }
      });
    } catch (e) { Alert.alert("Error", "Could not load group."); }
  };

  const handleLogout = async () => { await AsyncStorage.clear(); router.replace('/login'); };

  // --- RENDER ---
  const renderGroupItem = ({ item }: { item: Group }) => (
    <View style={styles.cardWrapper}>
      <TouchableOpacity style={styles.card} onPress={() => handleGroupSelect(item)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardText}>{item.name}</Text>
          {item.court_name ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Ionicons name="location" size={12} color="#87ca37" />
              <Text style={styles.courtLabel}>{item.court_name}{item.court_city ? ` — ${item.court_city}` : ''}</Text>
            </View>
          ) : null}
          <Text style={styles.countText}>
            {item.count || 0} PLAYERS
            {item.femaleCount !== undefined && item.maleCount !== undefined
              ? `: ${item.femaleCount} F & ${item.maleCount} M` : ''}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={24} color="#87ca37" />
      </TouchableOpacity>
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
          <Ionicons name="pencil" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteGroup(item)} style={styles.iconBtn}>
          <Ionicons name="trash" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- MODAL CONTENT BY VIEW ---
  const renderModalContent = () => {
    if (modalView === 'courtPicker') {
      return (
        <>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalView('form')} style={{ padding: 5 }}>
              <Ionicons name="arrow-back" size={24} color="#1b3358" />
            </TouchableOpacity>
            <Text style={styles.modalTitleInline}>SELECT LOCATION</Text>
            <View style={{ width: 34 }} />
          </View>

          {loadingCourts ? (
            <ActivityIndicator size="large" color="#1b3358" style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {courts.map((court, idx) => (
                <TouchableOpacity key={`court-${court.id}-${idx}`}
                  style={[styles.courtOption, selectedCourtId === court.id ? styles.courtOptionSelected : null]}
                  onPress={() => { setSelectedCourtId(court.id); setModalView('form'); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.courtNameText, selectedCourtId === court.id ? { color: '#1b3358', fontWeight: '900' as const } : null]}>
                      {court.name}
                    </Text>
                    {court.city ? <Text style={styles.courtCity}>{court.city}{court.state ? `, ${court.state}` : ''}</Text> : null}
                  </View>
                  {selectedCourtId === court.id ? <Ionicons name="checkmark-circle" size={24} color="#87ca37" /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ADD NEW COURT BUTTON */}
          <TouchableOpacity style={styles.addCourtBtn} onPress={() => {
            setNewCourtName(''); setNewCourtCity(''); setNewCourtState('');
            setModalView('addCourt');
          }}>
            <Ionicons name="add-circle-outline" size={20} color="#4a90e2" />
            <Text style={styles.addCourtBtnText}>Add New Location</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModalView('form')} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>BACK</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (modalView === 'addCourt') {
      return (
        <>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalView('courtPicker')} style={{ padding: 5 }}>
              <Ionicons name="arrow-back" size={24} color="#1b3358" />
            </TouchableOpacity>
            <Text style={styles.modalTitleInline}>ADD NEW LOCATION</Text>
            <View style={{ width: 34 }} />
          </View>

          <Text style={styles.fieldLabel}>Court / Venue Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Sun and Sail" value={newCourtName}
            onChangeText={setNewCourtName} autoFocus />

          <Text style={styles.fieldLabel}>City *</Text>
          <TextInput style={styles.input} placeholder="e.g. Lake Forest" value={newCourtCity}
            onChangeText={setNewCourtCity} />

          <Text style={styles.fieldLabel}>State (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g. CA" value={newCourtState}
            onChangeText={setNewCourtState} autoCapitalize="characters" maxLength={2} />

          <TouchableOpacity style={styles.saveCourtBtn} onPress={handleAddCourt} disabled={savingCourt}>
            {savingCourt ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="checkmark" size={22} color="white" />
                <Text style={styles.saveCourtBtnText}>SAVE LOCATION</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModalView('courtPicker')} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>BACK</Text>
          </TouchableOpacity>
        </>
      );
    }

    // DEFAULT: form view
    return (
      <>
        <Text style={styles.modalTitle}>{editingGroup ? 'EDIT GROUP' : 'NEW GROUP'}</Text>

        {/* STEP 1: Match Location */}
        {!editingGroup && (
          <View style={styles.stepSection}>
            <Text style={styles.stepLabel}>STEP 1: MATCH LOCATION</Text>
            <TouchableOpacity
              style={[styles.courtSelector, selectedCourtId ? styles.courtSelectorSelected : null]}
              onPress={() => setModalView('courtPicker')}
            >
              <Ionicons name="location" size={20} color={selectedCourtId ? '#87ca37' : '#999'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.courtSelectorText, selectedCourtId ? { color: '#1b3358', fontWeight: '900' as const } : null]}>
                  {getSelectedCourtName() || 'Tap to select location'}
                </Text>
                {getSelectedCourtCity() ? (
                  <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{getSelectedCourtCity()}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Group Name */}
        <View style={styles.stepSection}>
          <Text style={styles.stepLabel}>{editingGroup ? 'GROUP NAME' : 'STEP 2: GROUP NAME'}</Text>
          <TextInput style={styles.input} placeholder="e.g. Friday Crew"
            value={newGroupName} onChangeText={setNewGroupName}
            autoFocus={!!editingGroup} editable={!loading} />
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal} disabled={loading}>
            <Text style={styles.modalBtnText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveGroup} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : (
              <Text style={[styles.modalBtnText, { color: 'white' }]}>
                {editingGroup ? 'UPDATE' : 'CREATE'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const tierLabel = isPro ? 'PRO' : isTrial ? 'TRIAL' : 'FREE';
  const tierColor = isPro ? '#87ca37' : isTrial ? '#87ca37' : '#ff6b35';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Image source={require('../../assets/images/PlayPBNow-Logo-SMALL.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.logoSub}>LOAD A SAVED GROUP</Text>
        </View>
        <TouchableOpacity onPress={() => setJoinModalVisible(true)} style={styles.joinBtn}>
          <Ionicons name="flash" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Trial / Subscription Banner */}
      <TrialBanner />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#87ca37" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      <FlatList
        data={groups}
        keyExtractor={(item) => item.group_key}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No groups found.</Text>
            <Text style={styles.emptySub}>Create a group to get started!</Text>
          </View>
        ) : null}
      />

      <View style={styles.footer}>
        {isFree && (
          <Text style={styles.groupCountLabel}>{groups.length}/{features.maxGroups} Groups</Text>
        )}
        <TouchableOpacity style={styles.createBtn} onPress={openCreateModal} disabled={loading}>
          <Ionicons name="add-circle" size={24} color="white" style={{ marginRight: 10 }} />
          <Text style={styles.createBtnText}>CREATE NEW GROUP</Text>
        </TouchableOpacity>
      </View>

      {/* SINGLE MODAL — view switches between form / courtPicker / addCourt */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {renderModalContent()}
          </View>
        </View>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal animationType="slide" transparent visible={settingsVisible} onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ width: 34 }} />
              <Text style={styles.modalTitleInline}>SETTINGS</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Subscription Status */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>SUBSCRIPTION</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Current Plan</Text>
                <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
                  <Text style={styles.tierBadgeText}>{tierLabel}</Text>
                </View>
              </View>
              {isTrial && trialDaysRemaining > 0 && (
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>Trial Ends In</Text>
                  <Text style={styles.settingsValue}>{trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'}</Text>
                </View>
              )}
              {subscription?.expiryDate && (
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>Expires</Text>
                  <Text style={styles.settingsValue}>{new Date(subscription.expiryDate).toLocaleDateString()}</Text>
                </View>
              )}
              {isFree && (
                <TouchableOpacity style={styles.upgradeBtn} onPress={() => { setSettingsVisible(false); showPaywall(); }}>
                  <Ionicons name="star" size={18} color="white" />
                  <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
                </TouchableOpacity>
              )}
              {isPro && (
                <TouchableOpacity style={styles.manageBtn} onPress={handleManageSubscription}>
                  <Text style={styles.manageBtnText}>Manage Subscription</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Restore Purchases */}
            <View style={styles.settingsSection}>
              <TouchableOpacity style={styles.settingsActionRow} onPress={() => {
                Alert.alert('Restore Purchases', 'Purchase restoration will be available once in-app purchases are enabled.');
              }}>
                <Ionicons name="refresh" size={20} color="#1b3358" />
                <Text style={styles.settingsActionText}>Restore Purchases</Text>
              </TouchableOpacity>
            </View>

            {/* Account */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>ACCOUNT</Text>
              <TouchableOpacity style={styles.settingsActionRow} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                <Text style={[styles.settingsActionText, { color: '#e74c3c' }]}>Log Out</Text>
              </TouchableOpacity>
            </View>

            {/* App Info */}
            <Text style={styles.appVersion}>PlayPBNow v1.1.0</Text>
          </View>
        </View>
      </Modal>

      <JoinMatchModal visible={joinModalVisible} onClose={() => setJoinModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b3358' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 30, paddingTop: 60 },
  logoImage: { height: 100, width: 200 },
  logoSub: { color: '#87ca37', fontWeight: 'bold', fontSize: 12, letterSpacing: 1.5, marginTop: 5 },
  joinBtn: { padding: 8, marginRight: 10 },
  settingsBtn: { padding: 8 },
  loadingContainer: { alignItems: 'center', marginTop: 40 },
  loadingText: { color: 'white', marginTop: 10, fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 150 },
  
  cardWrapper: { marginBottom: 15 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardText: { fontSize: 20, fontWeight: '900', color: '#1b3358', fontStyle: 'italic' },
  courtLabel: { fontSize: 11, fontWeight: '700', color: '#87ca37' },
  countText: { fontSize: 10, fontWeight: 'bold', color: '#666', marginTop: 4, textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5, paddingRight: 10, gap: 15 },
  iconBtn: { padding: 5 },
  
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptySub: { color: '#ccc', fontSize: 14, marginTop: 5 },
  
  footer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  createBtn: { backgroundColor: '#87ca37', flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 } },
  createBtnText: { color: 'white', fontWeight: '900', fontSize: 18 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, maxHeight: '85%' },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#1b3358', textAlign: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitleInline: { fontSize: 20, fontWeight: '900', color: '#1b3358' },
  
  stepSection: { marginBottom: 20 },
  stepLabel: { fontSize: 11, fontWeight: '900', color: '#999', letterSpacing: 1, marginBottom: 8 },
  
  courtSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0f2f5', padding: 15, borderRadius: 12, borderWidth: 2, borderColor: '#eee' },
  courtSelectorSelected: { borderColor: '#87ca37', backgroundColor: '#f0fff0' },
  courtSelectorText: { fontSize: 16, color: '#999' },
  
  input: { backgroundColor: '#f0f2f5', padding: 15, borderRadius: 10, fontSize: 18, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6 },
  
  modalButtons: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#ddd' },
  saveBtn: { backgroundColor: '#1b3358' },
  modalBtnText: { fontWeight: '900', fontSize: 16 },
  
  // Court picker
  courtOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  courtOptionSelected: { backgroundColor: '#f0fff0', borderRadius: 10 },
  courtNameText: { fontSize: 16, fontWeight: '600', color: '#333' },
  courtCity: { fontSize: 12, color: '#888', marginTop: 2 },
  
  addCourtBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, marginTop: 10, borderTopWidth: 1, borderColor: '#eee' },
  addCourtBtnText: { color: '#4a90e2', fontWeight: '700', fontSize: 15 },
  
  saveCourtBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#87ca37', padding: 15, borderRadius: 12, marginTop: 10 },
  saveCourtBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeBtnText: { color: '#999', fontWeight: 'bold' },

  // Group count label
  groupCountLabel: { color: '#ff6b35', fontWeight: '700', fontSize: 12, marginBottom: 8, textAlign: 'center' },

  // Settings Modal
  settingsSection: { marginBottom: 20 },
  settingsSectionTitle: { fontSize: 11, fontWeight: '900', color: '#999', letterSpacing: 1.5, marginBottom: 10 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingsLabel: { color: '#333', fontSize: 15 },
  settingsValue: { color: '#666', fontSize: 15, fontWeight: '600' },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  tierBadgeText: { color: 'white', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#87ca37', padding: 14, borderRadius: 12, marginTop: 12 },
  upgradeBtnText: { color: 'white', fontWeight: '900', fontSize: 15 },
  manageBtn: { padding: 12, alignItems: 'center', marginTop: 8 },
  manageBtnText: { color: '#4a90e2', fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  settingsActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  settingsActionText: { color: '#1b3358', fontSize: 15, fontWeight: '600' },
  appVersion: { textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 10 },
});
