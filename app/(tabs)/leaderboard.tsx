import { BrandedIcon } from '../../components/BrandedIcon';
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
import {
    ThemeColors,
    FONT_DISPLAY_BOLD,
    FONT_DISPLAY_EXTRABOLD,
    FONT_BODY_REGULAR,
    FONT_BODY_MEDIUM,
    FONT_BODY_BOLD,
    FONT_BODY_SEMIBOLD,
} from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { LeaderboardItem, useLeaderboardLogic } from '../../hooks/useLeaderboardLogic';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function LeaderboardScreen({ localHistory, localRoster }: { localHistory?: any[], localRoster?: any[] }) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const handleLogout = async () => { await AsyncStorage.clear(); router.replace('/login'); };
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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

  const isFixedTeams = params.isFixedTeams === 'true';

  // Team leaderboard for fixed teams mode — aggregate pairs from match history
  interface TeamLeaderboardItem {
      id: string;
      name: string; // "Player A & Player B"
      w: number;
      l: number;
      diff: number;
      pct: number;
      badges: string[];
      dupr?: number | null;
  }

  const teamLeaderboard: TeamLeaderboardItem[] = useMemo(() => {
      if (!isFixedTeams || history.length === 0) return [];
      const teamStats: Record<string, { names: string[]; w: number; l: number; diff: number }> = {};

      history.forEach((m: any) => {
          const s1 = parseInt(String(m.s1));
          const s2 = parseInt(String(m.s2));
          if (s1 === 0 && s2 === 0) return;

          // Team 1: p1 + p2, Team 2: p3 + p4
          const t1Key = [m.p1, m.p2].filter(Boolean).sort().join('-');
          const t2Key = [m.p3, m.p4].filter(Boolean).sort().join('-');
          const t1Names = [m.p1_name, m.p2_name].filter(Boolean);
          const t2Names = [m.p3_name, m.p4_name].filter(Boolean);

          if (!teamStats[t1Key]) teamStats[t1Key] = { names: t1Names, w: 0, l: 0, diff: 0 };
          if (!teamStats[t2Key]) teamStats[t2Key] = { names: t2Names, w: 0, l: 0, diff: 0 };

          const diff = s1 - s2;
          if (s1 > s2) { teamStats[t1Key].w++; teamStats[t2Key].l++; }
          else if (s2 > s1) { teamStats[t2Key].w++; teamStats[t1Key].l++; }
          teamStats[t1Key].diff += diff;
          teamStats[t2Key].diff -= diff;
      });

      return Object.entries(teamStats).map(([key, s]) => ({
          id: key,
          name: s.names.join(' & '),
          w: s.w,
          l: s.l,
          diff: s.diff,
          pct: s.w + s.l > 0 ? Math.round((s.w / (s.w + s.l)) * 100) : 0,
          badges: [],
      }));
  }, [isFixedTeams, history]);

  const sortedTeamLeaderboard = useMemo(() => {
      let data = [...teamLeaderboard];
      if (sortMode === 'pct') {
          data.sort((a, b) => b.pct !== a.pct ? b.pct - a.pct : b.diff - a.diff);
      } else if (sortMode === 'wins') {
          data.sort((a, b) => b.w !== a.w ? b.w - a.w : a.l - b.l);
      } else if (sortMode === 'diff') {
          data.sort((a, b) => b.diff !== a.diff ? b.diff - a.diff : b.pct - a.pct);
      }
      return data;
  }, [teamLeaderboard, sortMode]);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [skipBatchReset, setSkipBatchReset] = useState(false);

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
          // Reset to 'all' when toggling — UNLESS we just came from a finished match
          if (skipBatchReset) {
              setSkipBatchReset(false);
          } else {
              setSelectedBatchId('all');
          }
      };
      savePreference();
  }, [isGlobal]);

  // --- INIT LOGIC ---
  useFocusEffect(
    useCallback(() => {
        if (localHistory && localHistory.length > 0) return;

        const init = async () => {
            const forceGlobal = params.forceGlobal === 'true';
            const incomingSessionId = params.sessionId as string;

            if (forceGlobal) {
                // CASE: Coming from a finished match — show that specific session in MINE mode
                if (isGlobal) {
                    setSkipBatchReset(true);
                    setIsGlobal(false);
                    await AsyncStorage.setItem('leaderboard_mode', 'mine');
                }

                let activeGroup = params.groupName as string;
                if (!activeGroup) {
                    activeGroup = await AsyncStorage.getItem('active_group_name') || '';
                }
                if (activeGroup) {
                    setGroupName(activeGroup);
                    await AsyncStorage.setItem('active_group_name', activeGroup);
                }

                const batchToUse = incomingSessionId || 'all';
                setSelectedBatchId(batchToUse);

                if (deviceId) {
                    fetchLeaderboard(activeGroup || '', deviceId, false, batchToUse);
                    fetchUniversalSessions(deviceId, false);
                }
            } else if (deviceId) {
                // CASE: Rankings tab click — check if user has their own sessions
                setSelectedBatchId('all');
                const mineSessions = await fetchUniversalSessions(deviceId, false);

                if (mineSessions.length > 0) {
                    // User has matches → MINE + ALL TIME
                    setSkipBatchReset(true);
                    setIsGlobal(false);
                    await AsyncStorage.setItem('leaderboard_mode', 'mine');

                    let activeGroup = await AsyncStorage.getItem('active_group_name') || '';
                    if (activeGroup) setGroupName(activeGroup);
                    fetchLeaderboard(activeGroup, deviceId, false, 'all');
                } else {
                    // New user (no matches) → GLOBAL + ALL TIME
                    setSkipBatchReset(true);
                    setIsGlobal(true);
                    await AsyncStorage.setItem('leaderboard_mode', 'global');

                    let activeGroup = await AsyncStorage.getItem('active_group_name_global') || '';
                    if (activeGroup) setGroupName(activeGroup);
                    fetchLeaderboard(activeGroup || '', deviceId, true, 'all');
                    fetchUniversalSessions(deviceId, true);
                }
            }
        };
        init();
    }, [params.groupName, params.forceGlobal, params.sessionId, localHistory, deviceId])
  );

  // --- RE-FETCH ON TOGGLE ---
  useEffect(() => {
      if (localHistory && localHistory.length > 0) return;

      const refetch = async () => {
          // If we have an incoming session from match finish, always use it
          const incomingSessionId = params.sessionId as string;
          const batchToUse = incomingSessionId || selectedBatchId;

          // Load the correct group name for the current mode
          const storageKey = isGlobal ? 'active_group_name_global' : 'active_group_name';
          const modeGroupName = await AsyncStorage.getItem(storageKey);

          // Use stored name if exists, otherwise keep current groupName
          const nameToUse = modeGroupName || groupName;

          if (nameToUse && deviceId) {
              if (modeGroupName) setGroupName(modeGroupName);
              setLoading(true);
              fetchLeaderboard(nameToUse, deviceId, isGlobal, batchToUse);
              fetchUniversalSessions(deviceId, isGlobal);
          } else if (deviceId) {
              if (isGlobal) {
                  setLoading(true);
                  fetchLeaderboard('', deviceId, true, batchToUse);
              }
              fetchUniversalSessions(deviceId, isGlobal);
              if (!isGlobal) setLoading(false);
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
      console.log('handleSessionSelectPodium - isGlobal:', isGlobal);
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
      console.log('handleSessionSelectHistory - isGlobal:', isGlobal);
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
            <Text style={styles.record}>
                {item.w}W - {item.l}L  •  {item.diff > 0 ? '+' : ''}{item.diff} Diff
                {item.dupr ? `  •  DUPR ${Number(item.dupr).toFixed(2)}` : ''}
            </Text>
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
                  {p.dupr && <Text style={[styles.podiumStat, {fontSize:9, color: colors.accent}]}>DUPR {Number(p.dupr).toFixed(2)}</Text>}
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
                  <BrandedIcon name="leaderboard" size={30} color={colors.gold} />
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

  // ── FIXED TEAMS: Team podium and list ──
  const renderTeamPodiumStats = (team: TeamLeaderboardItem, rank: string) => (
      <>
          <Text style={styles.podiumName} numberOfLines={2} adjustsFontSizeToFit>{team.name}</Text>
          <Text style={styles.podiumStat}>{team.w}W - {team.l}L</Text>
          <Text style={[styles.podiumStat, {fontSize:9, opacity:0.8}]}>{team.diff > 0 ? '+' : ''}{team.diff} Diff</Text>
          <Text style={[styles.podiumStat, rank === 'gold' ? styles.textGold : null, {marginTop:2}]}>{team.pct}%</Text>
      </>
  );

  const renderTeamPedestal = () => {
      if (sortedTeamLeaderboard.length === 0) return null;
      const top3 = sortedTeamLeaderboard.slice(0, 3);
      const gold = top3[0] || { name: '-', w:0, l:0, diff:0, pct:0 };
      const silver = top3[1] || { name: '-', w:0, l:0, diff:0, pct:0 };
      const bronze = top3[2] || { name: '-', w:0, l:0, diff:0, pct:0 };

      const getInitials = (name: string) => name.split(' & ').map(n => n.charAt(0)).join('');

      return (
          <View style={styles.pedestalContainer}>
              <View style={styles.podiumCol}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{getInitials(silver.name)}</Text></View>
                  {renderTeamPodiumStats(silver as TeamLeaderboardItem, 'silver')}
                  <View style={[styles.podiumBar, styles.barSilver]}><Text style={styles.placeText}>2</Text></View>
              </View>
              <View style={[styles.podiumCol, {zIndex: 10}]}>
                  <BrandedIcon name="leaderboard" size={30} color={colors.gold} />
                  <View style={[styles.avatarCircle, styles.avatarGold]}><Text style={styles.avatarText}>{getInitials(gold.name)}</Text></View>
                  {renderTeamPodiumStats(gold as TeamLeaderboardItem, 'gold')}
                  <View style={[styles.podiumBar, styles.barGold]}><Text style={styles.placeText}>1</Text></View>
              </View>
              <View style={styles.podiumCol}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{getInitials(bronze.name)}</Text></View>
                  {renderTeamPodiumStats(bronze as TeamLeaderboardItem, 'bronze')}
                  <View style={[styles.podiumBar, styles.barBronze]}><Text style={styles.placeText}>3</Text></View>
              </View>
          </View>
      );
  };

  const renderTeamRow = ({ item, index }: { item: TeamLeaderboardItem, index: number }) => {
      const rank = index + Math.min(sortedTeamLeaderboard.length, 3) + 1;
      return (
          <View style={styles.card}>
              <View style={styles.rankBox}><Text style={styles.rankText}>{rank}</Text></View>
              <View style={styles.nameBox}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.record}>
                      {item.w}W - {item.l}L  •  {item.diff > 0 ? '+' : ''}{item.diff} Diff
                  </Text>
              </View>
              <View style={styles.pctBox}><Text style={styles.pct}>{item.pct}%</Text></View>
          </View>
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
            <BrandedIcon name="home" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={{alignItems:'center', gap: 5}}>
            <Text style={styles.title}>GAME STATS</Text>

            <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, !isGlobal && styles.activeLabel]}>MINE</Text>
                <Switch
                    value={isGlobal}
                    onValueChange={setIsGlobal}
                    trackColor={{false: colors.textMuted, true: colors.accent}}
                    thumbColor={colors.text}
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

        <View style={{flexDirection:'row', gap: 10, alignItems: 'center'}}>
            <TouchableOpacity onPress={() => setCompareModalVisible(true)} style={styles.backBtn}>
                <BrandedIcon name="players" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} hitSlop={8}>
                <BrandedIcon name="logout" size={20} color={colors.textMuted} />
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
        <ActivityIndicator size="large" color={colors.accent} style={{marginTop:50}} />
      ) : isFixedTeams && sortedTeamLeaderboard.length > 0 ? (
        <FlatList
            data={sortedTeamLeaderboard.length >= 3 ? sortedTeamLeaderboard.slice(3) : []}
            renderItem={renderTeamRow}
            keyExtractor={(i) => i.id}
            ListHeaderComponent={renderTeamPedestal}
            alwaysBounceHorizontal={false}
            contentContainerStyle={{padding: 20, paddingBottom: 100}}
            ListEmptyComponent={<Text style={styles.empty}>{sortedTeamLeaderboard.length === 0 ? "No data found." : ""}</Text>}
        />
      ) : (
        <FlatList
            data={sortedLeaderboard.length >= 3 ? sortedLeaderboard.slice(3) : []}
            renderItem={renderLeaderboardRow}
            keyExtractor={(i) => i.id}
            ListHeaderComponent={renderPedestal}
            alwaysBounceHorizontal={false}
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

const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { padding: 15, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.surface },
  title: { color: c.accent, fontSize: 16, fontFamily: FONT_DISPLAY_EXTRABOLD, textTransform: 'uppercase', textAlign:'center', marginBottom: 5 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  toggleLabel: { color: c.textMuted, fontFamily: FONT_BODY_BOLD, fontSize: 10 },
  activeLabel: { color: c.text },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  sortBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: c.surfaceLight },
  sortBtnActive: { backgroundColor: isDark ? c.text : c.card, borderWidth: 1, borderColor: c.border },
  sortBtnText: { color: c.textMuted, fontSize: 10, fontFamily: FONT_BODY_BOLD },
  sortBtnTextActive: { color: isDark ? c.surface : c.text },
  dateBar: { backgroundColor: c.surface, padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border },
  dateBarText: { color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 12 },
  backBtn: { padding: 5 },
  pedestalContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: 250, marginBottom: 30, marginTop: 30 },
  podiumCol: { alignItems: 'center', width: SCREEN_WIDTH * 0.28 },
  podiumBar: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 10 },
  barGold: { height: 120, backgroundColor: isDark ? 'rgba(255, 210, 63, 0.15)' : 'rgba(245, 166, 35, 0.15)', borderWidth: 2, borderColor: c.gold },
  barSilver: { height: 90, backgroundColor: isDark ? 'rgba(192, 199, 214, 0.15)' : 'rgba(142, 153, 164, 0.15)', borderWidth: 2, borderColor: c.silver },
  barBronze: { height: 70, backgroundColor: isDark ? 'rgba(232, 152, 90, 0.15)' : 'rgba(205, 127, 50, 0.15)', borderWidth: 2, borderColor: c.bronze },
  placeText: { fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.text, opacity: 0.5, fontSize: 30 },
  crown: { fontSize: 30, marginBottom: -10, zIndex: 20 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderWidth:2, borderColor: c.border },
  avatarGold: { borderColor: c.gold },
  avatarText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 24, color: c.text },
  podiumName: { color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 11, marginBottom: 2, textAlign: 'center' },
  podiumStat: { color: c.textSoft, fontSize: 10, fontFamily: FONT_BODY_BOLD, marginBottom: 2 },
  textGold: { color: c.gold },
  card: { backgroundColor: c.card, padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: c.border },
  rankBox: { width: 30, alignItems: 'center' },
  rankText: { fontSize: 16, fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.textMuted },
  nameBox: { flex: 1, paddingHorizontal: 10 },
  name: { fontSize: 18, fontFamily: FONT_DISPLAY_BOLD, color: c.text },
  record: { fontSize: 12, color: c.textSoft, fontFamily: FONT_BODY_MEDIUM, marginTop: 2 },
  pctBox: { alignItems: 'flex-end' },
  pct: { fontSize: 20, fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.accent },
  empty: { textAlign: 'center', color: c.text, fontFamily: FONT_BODY_REGULAR, marginTop: 50, opacity: 0.5 },
});
