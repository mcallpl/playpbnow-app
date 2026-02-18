import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeadToHeadModal from '../../components/HeadToHeadModal';
import { HistoryModal } from '../../components/HistoryModal';
import { SessionSelectModal, UniversalSession } from '../../components/SessionSelectModal';
import { LeaderboardItem, useLeaderboardLogic } from '../../hooks/useLeaderboardLogic';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function LeaderboardScreen({ localHistory, localRoster }: { localHistory?: any[], localRoster?: any[] }) {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const {
      groupName, setGroupName,
      leaderboard,
      history,
      roster,
      universalSessions,
      selectedBatchId, setSelectedBatchId,
      loading, setLoading,
      isGlobal, setIsGlobal,
      deviceId, setDeviceId,
      sortMode, setSortMode,
      fetchLeaderboard,
      fetchUniversalSessions,
      saveMatchUpdate,
      deleteMatch,
      deleteSession
  } = useLeaderboardLogic(localHistory, localRoster);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Load saved MINE/GLOBAL preference on mount
  useEffect(() => {
      const loadPreference = async () => {
          const saved = await AsyncStorage.getItem('leaderboard_mode');
          if (saved === 'global') {
              setIsGlobal(true);
          } else if (saved === 'mine') {
              setIsGlobal(false);
          }
      };
      loadPreference();
  }, []);

  // Save MINE/GLOBAL preference when it changes
  useEffect(() => {
      const savePreference = async () => {
          await AsyncStorage.setItem('leaderboard_mode', isGlobal ? 'global' : 'mine');
          // Reset to 'all' when toggling to avoid mismatched group/batch
          setSelectedBatchId('all');
      };
      savePreference();
  }, [isGlobal]);

  // --- INIT LOGIC ---
  useFocusEffect(
    useCallback(() => {
        if (localHistory && localHistory.length > 0) return;

        const init = async () => {
            let activeGroup = params.groupName as string;
            if (!activeGroup) {
                // Load group name specific to current mode
                const storageKey = isGlobal ? 'active_group_name_global' : 'active_group_name';
                activeGroup = await AsyncStorage.getItem(storageKey) || '';
            }
            if (activeGroup) {
                setGroupName(activeGroup);
                const storageKey = isGlobal ? 'active_group_name_global' : 'active_group_name';
                await AsyncStorage.setItem(storageKey, activeGroup);
            }

            // Force reset to 'all' on load
            setSelectedBatchId('all');

            if (activeGroup && deviceId) {
                fetchLeaderboard(activeGroup, deviceId, isGlobal, 'all');
                fetchUniversalSessions(deviceId, isGlobal);
            } else if (deviceId) {
                // No group name — just load sessions so user can pick one
                fetchUniversalSessions(deviceId, isGlobal);
                setLoading(false);
            }
        };
        init();
    }, [params.groupName, localHistory, deviceId]) 
  );

  // --- RE-FETCH ON TOGGLE ---
  useEffect(() => {
      if (localHistory && localHistory.length > 0) return;

      const refetch = async () => {
          // Load the correct group name for the current mode
          const storageKey = isGlobal ? 'active_group_name_global' : 'active_group_name';
          const modeGroupName = await AsyncStorage.getItem(storageKey);
          
          // Use stored name if exists, otherwise keep current groupName
          const nameToUse = modeGroupName || groupName;
          
          if (nameToUse && deviceId) {
              if (modeGroupName) setGroupName(modeGroupName);
              setLoading(true);
              fetchLeaderboard(nameToUse, deviceId, isGlobal, selectedBatchId);
              fetchUniversalSessions(deviceId, isGlobal);
          } else if (deviceId) {
              // No group name available — just fetch sessions to let user select one
              fetchUniversalSessions(deviceId, isGlobal);
              setLoading(false);
          }
      };
      
      refetch();
  }, [isGlobal, selectedBatchId, localHistory]);

  const sortedLeaderboard = useMemo(() => {
      let data = [...leaderboard];
      if (sortMode === 'pct') {
          data.sort((a, b) => {
              if (b.pct !== a.pct) return b.pct - a.pct;
              return b.diff - a.diff;
          });
      } else if (sortMode === 'wins') {
          data.sort((a, b) => {
              if (b.w !== a.w) return b.w - a.w;
              return a.l - b.l;
          });
      } else if (sortMode === 'diff') {
          data.sort((a, b) => {
              if (b.diff !== a.diff) return b.diff - a.diff;
              return b.pct - a.pct;
          });
      }
      return data;
  }, [leaderboard, sortMode]);

  const handleSessionSelectPodium = async (session: UniversalSession | 'all') => {
      setFilterModalVisible(false);
      setLoading(true);
      console.log('🎯 handleSessionSelectPodium - isGlobal:', isGlobal);
      if (session === 'all') {
          setSelectedBatchId('all');
          fetchLeaderboard(groupName, deviceId, isGlobal, 'all');
      } else {
          setGroupName(session.group);
          setSelectedBatchId(session.id);
          // Save group name specific to mode (MINE or GLOBAL)
          const storageKey = isGlobal ? 'active_group_name_global' : 'active_group_name';
          await AsyncStorage.setItem(storageKey, session.group);
          fetchLeaderboard(session.group, deviceId, isGlobal, session.id);
          // DON'T open history - just show podium/leaderboard
      }
  };

  const handleSessionSelectHistory = async (session: UniversalSession) => {
      setFilterModalVisible(false);
      setLoading(true);
      console.log('📜 handleSessionSelectHistory - isGlobal:', isGlobal);
      setGroupName(session.group);
      setSelectedBatchId(session.id);
      // Save group name specific to mode (MINE or GLOBAL)
      const storageKey = isGlobal ? 'active_group_name_global' : 'active_group_name';
      await AsyncStorage.setItem(storageKey, session.group);
      fetchLeaderboard(session.group, deviceId, isGlobal, session.id);
      setHistoryModalVisible(true); // Open game history
  };

  const getActiveFilterLabel = (): string => {
      if (localHistory && localHistory.length > 0) return "CURRENT SESSION"; 
      if (selectedBatchId === 'all') return "ALL TIME / SELECT SESSION";
      const session = universalSessions.find((s: any) => s.id === selectedBatchId);
      return session?.label || "Select Session";
  };

  const checkDeleteSessionPermission = () => {
      if (localHistory && localHistory.length > 0) return false; 
      const currentSession = universalSessions.find((s: any) => s.id === selectedBatchId);
      return selectedBatchId !== 'all' && (!isGlobal || isSessionOwner(currentSession));
  };

  const isSessionOwner = (session: any) => {
      return session?.isYours === true || String(session?.device_id).trim() == String(deviceId).trim();
  }

  const renderLeaderboardRow = ({ item, index }: {item: LeaderboardItem, index: number}) => {
    const pedestalCount = Math.min(leaderboard.length, 3);
    const rank = index + pedestalCount + 1;
    return (
      <View style={styles.card}>
        <View style={styles.rankBox}><Text style={styles.rankText}>{rank}</Text></View>
        <View style={styles.nameBox}>
            <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                <Text style={styles.name}>{item.name}</Text>
                {item.badges && item.badges.map((b: string, i: number) => <Text key={i} style={{fontSize:14}}>{b}</Text>)}
            </View>
            <Text style={styles.record}>{item.w}W - {item.l}L  •  {item.diff > 0 ? '+' : ''}{item.diff} Diff</Text>
        </View>
        <View style={styles.pctBox}><Text style={styles.pct}>{item.pct}%</Text></View>
      </View>
    );
  };

  const renderPedestal = () => {
      if (leaderboard.length === 0) return null;
      
      const topThree = sortedLeaderboard.slice(0, 3);
      const gold = topThree[0] || { name: '-', w:0, l:0, diff:0, pct:0 }; 
      const silver = topThree[1] || { name: '-', w:0, l:0, diff:0, pct:0 }; 
      const bronze = topThree[2] || { name: '-', w:0, l:0, diff:0, pct:0 };
      
      const gInitial = gold.name.charAt(0); 
      const sInitial = silver.name.charAt(0); 
      const bInitial = bronze.name.charAt(0);

      const renderPodiumStats = (p: LeaderboardItem | any, rank: string) => {
          const badges = p.badges?.join(' ') || '';
          return (
              <>
                  <Text style={styles.podiumName} numberOfLines={1}>{p.name} <Text style={{fontSize:10}}>{badges}</Text></Text>
                  <Text style={styles.podiumStat}>{p.w}W - {p.l}L</Text>
                  <Text style={[styles.podiumStat, {fontSize:9, opacity:0.8}]}>{p.diff > 0 ? '+' : ''}{p.diff} Diff</Text>
                  <Text style={[styles.podiumStat, rank === 'gold' ? styles.textGold : null, {marginTop:2}]}>{p.pct}%</Text>
              </>
          );
      };
      return (
          <View style={styles.pedestalContainer}>
              <View style={styles.podiumCol}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{sInitial}</Text></View>
                  {renderPodiumStats(silver, 'silver')}
                  <View style={[styles.podiumBar, styles.barSilver]}><Text style={styles.placeText}>2</Text></View>
              </View>
              <View style={[styles.podiumCol, {zIndex: 10}]}>
                  <Text style={styles.crown}>👑</Text>
                  <View style={[styles.avatarCircle, styles.avatarGold]}><Text style={styles.avatarText}>{gInitial}</Text></View>
                  {renderPodiumStats(gold, 'gold')}
                  <View style={[styles.podiumBar, styles.barGold]}><Text style={styles.placeText}>1</Text></View>
              </View>
              <View style={styles.podiumCol}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{bInitial}</Text></View>
                  {renderPodiumStats(bronze, 'bronze')}
                  <View style={[styles.podiumBar, styles.barBronze]}><Text style={styles.placeText}>3</Text></View>
              </View>
          </View>
      );
  };

  console.log('📋 Roster data:', roster);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
            <Ionicons name="home" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={{alignItems:'center', gap: 5}}>
            <Text style={styles.title}>GAME STATS</Text>
            
            <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, !isGlobal && styles.activeLabel]}>MINE</Text>
                <Switch 
                    value={isGlobal}
                    onValueChange={setIsGlobal}
                    trackColor={{false: '#555', true: '#87ca37'}}
                    thumbColor={'white'}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} 
                />
                <Text style={[styles.toggleLabel, isGlobal && styles.activeLabel]}>GLOBAL</Text>
            </View>

            <View style={styles.sortRow}>
                <TouchableOpacity onPress={() => setSortMode('wins')} style={[styles.sortBtn, sortMode === 'wins' && styles.sortBtnActive]}>
                    <Text style={[styles.sortBtnText, sortMode === 'wins' && styles.sortBtnTextActive]}>WINS</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSortMode('pct')} style={[styles.sortBtn, sortMode === 'pct' && styles.sortBtnActive]}>
                    <Text style={[styles.sortBtnText, sortMode === 'pct' && styles.sortBtnTextActive]}>WIN %</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSortMode('diff')} style={[styles.sortBtn, sortMode === 'diff' && styles.sortBtnActive]}>
                    <Text style={[styles.sortBtnText, sortMode === 'diff' && styles.sortBtnTextActive]}>DIFF</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={{flexDirection:'row', gap: 10}}>
            <TouchableOpacity onPress={() => setCompareModalVisible(true)} style={styles.backBtn}>
                <Ionicons name="people" size={24} color="white" />
            </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={() => {
          fetchUniversalSessions(deviceId, isGlobal); 
          setFilterModalVisible(true);
      }} style={styles.dateBar}>
          <Text style={styles.dateBarText}>
              {getActiveFilterLabel()} ▼
          </Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#87ca37" style={{marginTop:50}} />
      ) : (
        <FlatList
            data={sortedLeaderboard.length >= 3 ? sortedLeaderboard.slice(3) : []}
            renderItem={renderLeaderboardRow}
            keyExtractor={(i) => i.id}
            ListHeaderComponent={renderPedestal} 
            contentContainerStyle={{padding: 20, paddingBottom: 100}}
            ListEmptyComponent={<Text style={styles.empty}>{leaderboard.length === 0 ? "No data found." : ""}</Text>}
        />
      )}

      {/* MODALS */}
      <SessionSelectModal 
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          sessions={universalSessions}
          selectedId={selectedBatchId}
          onSelectPodium={handleSessionSelectPodium}
          onSelectHistory={handleSessionSelectHistory}
          isGlobal={isGlobal}
          currentDeviceId={deviceId}
      />

      <HistoryModal 
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
          history={history}
          sessionLabel={getActiveFilterLabel()}
          isGlobal={isGlobal}
          deviceId={deviceId}
          onDeleteSession={deleteSession}
          onSaveMatch={saveMatchUpdate}
          onDeleteMatch={deleteMatch}
          canDeleteSession={checkDeleteSessionPermission()}
      />

      <HeadToHeadModal 
          visible={compareModalVisible} 
          onClose={() => setCompareModalVisible(false)}
          groupName={groupName}
          history={history}
          roster={roster}
          deviceId={deviceId}
          isGlobal={isGlobal}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b3358' },
  header: { padding: 15, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#152945' },
  title: { color: '#87ca37', fontSize: 16, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', textAlign:'center', marginBottom: 5 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  toggleLabel: { color: '#777', fontWeight: 'bold', fontSize: 10 },
  activeLabel: { color: 'white' },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  sortBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  sortBtnActive: { backgroundColor: 'white' },
  sortBtnText: { color: '#aaa', fontSize: 10, fontWeight: 'bold' },
  sortBtnTextActive: { color: '#152945' },
  dateBar: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, alignItems: 'center' },
  dateBarText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  backBtn: { padding: 5 },
  pedestalContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: 230, marginBottom: 30, marginTop: 20 },
  podiumCol: { alignItems: 'center', width: SCREEN_WIDTH * 0.28 },
  podiumBar: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 10 },
  barGold: { height: 120, backgroundColor: 'rgba(255, 215, 0, 0.2)', borderWidth: 2, borderColor: '#FFD700' },
  barSilver: { height: 90, backgroundColor: 'rgba(192, 192, 192, 0.2)', borderWidth: 2, borderColor: '#C0C0C0' },
  barBronze: { height: 70, backgroundColor: 'rgba(205, 127, 50, 0.2)', borderWidth: 2, borderColor: '#CD7F32' },
  placeText: { fontWeight: '900', color: 'white', opacity: 0.5, fontSize: 30 },
  crown: { fontSize: 30, marginBottom: -10, zIndex: 20 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f2f5', justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderWidth:2, borderColor: 'white' },
  avatarGold: { borderColor: '#FFD700' },
  avatarText: { fontWeight: '900', fontSize: 24, color: '#1b3358' },
  podiumName: { color: 'white', fontWeight: 'bold', fontSize: 11, marginBottom: 2, textAlign: 'center' },
  podiumStat: { color: '#aaa', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  textGold: { color: '#FFD700' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rankBox: { width: 30, alignItems: 'center' },
  rankText: { fontSize: 16, fontWeight: '900', color: '#ccc' },
  nameBox: { flex: 1, paddingHorizontal: 10 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1b3358' },
  record: { fontSize: 12, color: '#888', fontWeight: 'bold', marginTop: 2 },
  pctBox: { alignItems: 'flex-end' },
  pct: { fontSize: 20, fontWeight: '900', color: '#87ca37' },
  empty: { textAlign: 'center', color: 'white', marginTop: 50, opacity: 0.5 },
});
