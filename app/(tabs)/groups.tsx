import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { JoinMatchModal } from '../../components/JoinMatchModal';
import { TrialBanner } from '../../components/TrialBanner';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { isPro, isFree, isTrial, trialDaysRemaining, showPaywall, features, subscription, refreshSubscription } = useSubscription();
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  type ModalView = 'form' | 'courtPicker' | 'addCourt';
  const [modalView, setModalView] = useState<ModalView>('form');

  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [loadingCourts, setLoadingCourts] = useState(false);

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

  const openCreateModal = () => {
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
        setModalView('form');
      } else { Alert.alert('Error', data.message); }
    } catch (e) { Alert.alert('Error', 'Failed to create court'); }
    finally { setSavingCourt(false); }
  };

  const deleteGroup = (group: Group) => {
    Alert.alert("Delete Group", `Delete "${group.name}" and all its data?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
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
        }
      }
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

  const handleManageSubscription = async () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const tierLabel = isPro ? 'PRO' : isTrial ? 'TRIAL' : 'FREE';
  const tierColor = isPro ? colors.accent : isTrial ? colors.secondary : '#ff6b35';

  const handleLogout = async () => { await AsyncStorage.clear(); router.replace('/login'); };

  const totalPlayers = groups.reduce((sum, g) => sum + (g.count || 0), 0);

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleGroupSelect(item)} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardText}>{item.name}</Text>
        {item.court_name ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Ionicons name="location" size={12} color={colors.accent} />
            <Text style={styles.courtLabel}>{item.court_name}</Text>
            {item.court_city ? <Text style={styles.courtCityLabel}>{item.court_city}</Text> : null}
          </View>
        ) : null}
      </View>
      <View style={styles.playerBadge}>
        <Ionicons name="people" size={14} color={colors.accent} />
        <Text style={styles.playerBadgeText}>{item.count || 0}</Text>
      </View>
      {/* Gender + actions row */}
      <View style={styles.cardFooter}>
        <View style={styles.genderRow}>
          {item.maleCount !== undefined && item.maleCount > 0 ? (
            <View style={styles.genderDot}>
              <View style={[styles.dot, { backgroundColor: colors.male }]} />
              <Text style={styles.genderText}>{item.maleCount} Male</Text>
            </View>
          ) : null}
          {item.femaleCount !== undefined && item.femaleCount > 0 ? (
            <View style={styles.genderDot}>
              <View style={[styles.dot, { backgroundColor: colors.female }]} />
              <Text style={styles.genderText}>{item.femaleCount} Female</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
            <Ionicons name="pencil" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteGroup(item)} style={styles.iconBtn}>
            <Ionicons name="trash" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderModalContent = () => {
    if (modalView === 'courtPicker') {
      return (
        <>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalView('form')} style={{ padding: 5 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitleInline}>SELECT LOCATION</Text>
            <View style={{ width: 34 }} />
          </View>

          {loadingCourts ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {courts.map((court, idx) => (
                <TouchableOpacity key={`court-${court.id}-${idx}`}
                  style={[styles.courtOption, selectedCourtId === court.id ? styles.courtOptionSelected : null]}
                  onPress={() => { setSelectedCourtId(court.id); setModalView('form'); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.courtNameText, selectedCourtId === court.id ? { color: colors.accent, fontFamily: FONT_DISPLAY_EXTRABOLD } : null]}>
                      {court.name}
                    </Text>
                    {court.city ? <Text style={styles.courtCity}>{court.city}{court.state ? `, ${court.state}` : ''}</Text> : null}
                  </View>
                  {selectedCourtId === court.id ? <Ionicons name="checkmark-circle" size={24} color={colors.accent} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.addCourtBtn} onPress={() => {
            setNewCourtName(''); setNewCourtCity(''); setNewCourtState('');
            setModalView('addCourt');
          }}>
            <Ionicons name="add-circle-outline" size={20} color={colors.secondary} />
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
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitleInline}>ADD NEW LOCATION</Text>
            <View style={{ width: 34 }} />
          </View>

          <Text style={styles.fieldLabel}>Court / Venue Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Sun and Sail" placeholderTextColor={colors.inputPlaceholder}
            value={newCourtName} onChangeText={setNewCourtName} autoFocus />

          <Text style={styles.fieldLabel}>City *</Text>
          <TextInput style={styles.input} placeholder="e.g. Lake Forest" placeholderTextColor={colors.inputPlaceholder}
            value={newCourtCity} onChangeText={setNewCourtCity} />

          <Text style={styles.fieldLabel}>State (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g. CA" placeholderTextColor={colors.inputPlaceholder}
            value={newCourtState} onChangeText={setNewCourtState} autoCapitalize="characters" maxLength={2} />

          <TouchableOpacity style={styles.saveCourtBtn} onPress={handleAddCourt} disabled={savingCourt}>
            {savingCourt ? <ActivityIndicator color={colors.bg} /> : (
              <>
                <Ionicons name="checkmark" size={22} color={colors.bg} />
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

    return (
      <>
        <Text style={styles.modalTitle}>{editingGroup ? 'EDIT GROUP' : 'NEW GROUP'}</Text>

        {!editingGroup && (
          <View style={styles.stepSection}>
            <Text style={styles.stepLabel}>STEP 1: MATCH LOCATION</Text>
            <TouchableOpacity
              style={[styles.courtSelector, selectedCourtId ? styles.courtSelectorSelected : null]}
              onPress={() => setModalView('courtPicker')}
            >
              <Ionicons name="location" size={20} color={selectedCourtId ? colors.accent : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.courtSelectorText, selectedCourtId ? { color: colors.accent, fontFamily: FONT_DISPLAY_EXTRABOLD } : null]}>
                  {getSelectedCourtName() || 'Tap to select location'}
                </Text>
                {getSelectedCourtCity() ? (
                  <Text style={{ fontSize: 12, fontFamily: FONT_BODY_REGULAR, color: colors.textMuted, marginTop: 2 }}>{getSelectedCourtCity()}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.stepSection}>
          <Text style={styles.stepLabel}>{editingGroup ? 'GROUP NAME' : 'STEP 2: GROUP NAME'}</Text>
          <TextInput style={styles.input} placeholder="e.g. Friday Crew" placeholderTextColor={colors.inputPlaceholder}
            value={newGroupName} onChangeText={setNewGroupName}
            autoFocus={!!editingGroup} editable={!loading} />
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal} disabled={loading}>
            <Text style={styles.cancelBtnText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveGroup} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.bg} /> : (
              <Text style={styles.saveBtnText}>
                {editingGroup ? 'UPDATE' : 'CREATE'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Your Groups</Text>
          <Text style={styles.headerSub}>{groups.length} groups · {totalPlayers} players</Text>
        </View>
        <TouchableOpacity onPress={() => setJoinModalVisible(true)} style={styles.headerBtn}>
          <Ionicons name="flash" size={18} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading && groups.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}

      <TrialBanner />

      {isFree && (
        <Text style={styles.groupCountLabel}>{groups.length}/{features.maxGroups} Groups</Text>
      )}

      <FlatList
        data={groups}
        keyExtractor={(item) => item.group_key}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySub}>Create a group to get started!</Text>
          </View>
        ) : null}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.createBtn} onPress={openCreateModal} disabled={loading}>
          <Text style={styles.createBtnPlus}>+</Text>
          <Text style={styles.createBtnText}>NEW GROUP</Text>
        </TouchableOpacity>
      </View>

      {/* GROUP MODAL */}
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
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Appearance */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>APPEARANCE</Text>
              <View style={styles.settingsActionRow}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.textMuted} />
                <Text style={styles.settingsActionText}>Dark Mode</Text>
                <View style={{ flex: 1 }} />
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor="white"
                />
              </View>
            </View>

            {/* Subscription */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>SUBSCRIPTION</Text>
              <View style={styles.settingsActionRow}>
                <Text style={styles.settingsActionText}>Current Plan</Text>
                <View style={{ flex: 1 }} />
                <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
                  <Text style={styles.tierBadgeText}>{tierLabel}</Text>
                </View>
              </View>
              {isTrial && trialDaysRemaining !== null && (
                <Text style={{ color: colors.secondary, fontSize: 13, fontFamily: FONT_BODY_MEDIUM, marginBottom: 8 }}>
                  Trial Ends In {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}
                </Text>
              )}
              {subscription?.expires_at && (
                <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: FONT_BODY_REGULAR, marginBottom: 8 }}>
                  Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                </Text>
              )}
              {!isPro && (
                <TouchableOpacity style={styles.upgradeBtn} onPress={() => showPaywall('Unlock all features with Pro!')}>
                  <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
                </TouchableOpacity>
              )}
              {isPro && (
                <TouchableOpacity style={styles.manageBtn} onPress={handleManageSubscription}>
                  <Text style={styles.manageBtnText}>Manage Subscription</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.settingsActionRow} onPress={refreshSubscription}>
                <Ionicons name="refresh" size={18} color={colors.secondary} />
                <Text style={[styles.settingsActionText, { color: colors.secondary }]}>Restore Purchases</Text>
              </TouchableOpacity>
            </View>

            {/* Account */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>ACCOUNT</Text>
              <TouchableOpacity style={styles.settingsActionRow} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <Text style={[styles.settingsActionText, { color: colors.danger }]}>Log Out</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.appVersion}>PlayPBNow v1.3.0</Text>
          </View>
        </View>
      </Modal>

      <JoinMatchModal visible={joinModalVisible} onClose={() => setJoinModalVisible(false)} />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontFamily: FONT_DISPLAY_EXTRABOLD,
    fontSize: 28,
    color: c.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: FONT_BODY_REGULAR,
    fontSize: 12,
    color: c.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.glassStroke,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  loadingContainer: { alignItems: 'center', marginTop: 40 },
  listContent: { paddingHorizontal: 20, paddingBottom: 150 },

  card: {
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardText: {
    fontFamily: FONT_DISPLAY_BOLD,
    fontSize: 20,
    color: c.text,
  },
  courtLabel: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 13,
    color: c.accent,
  },
  courtCityLabel: {
    fontFamily: FONT_BODY_REGULAR,
    fontSize: 12,
    color: c.textMuted,
    marginLeft: 4,
  },
  playerBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  playerBadgeText: {
    fontFamily: FONT_DISPLAY_BOLD,
    fontSize: 16,
    color: c.accent,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  genderRow: { flexDirection: 'row', gap: 16 },
  genderDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  genderText: { fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: c.textSoft },
  actionRow: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: c.text, fontSize: 18, fontFamily: FONT_DISPLAY_BOLD },
  emptySub: { color: c.textMuted, fontSize: 14, fontFamily: FONT_BODY_REGULAR, marginTop: 6 },

  footer: { position: 'absolute', bottom: 32, width: '100%', alignItems: 'center' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
    backgroundColor: c.accent,
    gap: 10,
  },
  createBtnPlus: {
    fontSize: 20,
    fontFamily: FONT_DISPLAY_EXTRABOLD,
    color: c.bg,
  },
  createBtnText: {
    fontFamily: FONT_DISPLAY_EXTRABOLD,
    fontSize: 15,
    color: c.bg,
    letterSpacing: 0.5,
  },

  groupCountLabel: {
    color: c.accent,
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: c.modalOverlay, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: c.modalBg, borderRadius: 20, padding: 25, maxHeight: '85%' },
  modalTitle: {
    fontFamily: FONT_DISPLAY_EXTRABOLD,
    fontSize: 24,
    color: c.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitleInline: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 20, color: c.text },

  stepSection: { marginBottom: 20 },
  stepLabel: {
    fontSize: 11,
    fontFamily: FONT_BODY_BOLD,
    color: c.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },

  courtSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.inputBg,
    padding: 15,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: c.inputBorder,
  },
  courtSelectorSelected: { borderColor: c.accent, backgroundColor: c.accentSoft },
  courtSelectorText: { fontSize: 16, fontFamily: FONT_BODY_REGULAR, color: c.textMuted },

  input: {
    backgroundColor: c.inputBg,
    padding: 15,
    borderRadius: 14,
    fontSize: 18,
    fontFamily: FONT_BODY_MEDIUM,
    color: c.inputText,
    borderWidth: 1,
    borderColor: c.inputBorder,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    color: c.textMuted,
    marginBottom: 6,
  },

  modalButtons: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center' },
  cancelBtn: { backgroundColor: c.surfaceLight },
  cancelBtnText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16, color: c.textSoft },
  saveBtn: { backgroundColor: c.accent },
  saveBtnText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16, color: c.bg },

  // Court picker
  courtOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  courtOptionSelected: { backgroundColor: c.accentSoft, borderRadius: 10 },
  courtNameText: { fontSize: 16, fontFamily: FONT_BODY_SEMIBOLD, color: c.text },
  courtCity: { fontSize: 12, fontFamily: FONT_BODY_REGULAR, color: c.textMuted, marginTop: 2 },

  addCourtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: c.border,
  },
  addCourtBtnText: { color: c.secondary, fontFamily: FONT_BODY_BOLD, fontSize: 15 },

  saveCourtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.accent,
    padding: 15,
    borderRadius: 14,
    marginTop: 10,
  },
  saveCourtBtnText: { color: c.bg, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16 },

  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeBtnText: { color: c.textMuted, fontFamily: FONT_BODY_BOLD },

  // Settings
  settingsSection: { marginBottom: 20 },
  settingsSectionTitle: {
    fontSize: 11,
    fontFamily: FONT_BODY_BOLD,
    color: c.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  settingsActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  settingsActionText: { color: c.text, fontSize: 15, fontFamily: FONT_BODY_SEMIBOLD },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tierBadgeText: { color: 'white', fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 11, letterSpacing: 1 },
  upgradeBtn: { backgroundColor: '#ff6b35', padding: 12, borderRadius: 12, alignItems: 'center', marginVertical: 8 },
  upgradeBtnText: { color: 'white', fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 14 },
  manageBtn: { backgroundColor: c.surfaceLight, padding: 12, borderRadius: 12, alignItems: 'center', marginVertical: 8 },
  manageBtnText: { color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 14 },
  appVersion: { textAlign: 'center', color: c.textMuted, fontFamily: FONT_BODY_REGULAR, fontSize: 12, marginTop: 10 },
});
