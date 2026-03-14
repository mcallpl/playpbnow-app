import { BrandedIcon } from '../../components/BrandedIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { getNavData, saveActiveMatchData, loadActiveMatchData } from '../../utils/navData';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveMatch } from '../../context/ActiveMatchContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { useCollaborativeScoring } from '../../hooks/useCollaborativeScoring';
import { Player, useGameLogic } from '../../hooks/useGameLogic';
import { useSmartScoring } from '../../hooks/useSmartScoring';
import { ShareMatchModal } from '../../components/ShareMatchModal';
import { JoinMatchModal } from '../../components/JoinMatchModal';
import { ScoreUpdateToast } from '../../components/ScoreUpdateToast';
import {
    ThemeColors,
    FONT_DISPLAY_BOLD,
    FONT_DISPLAY_EXTRABOLD,
    FONT_BODY_REGULAR,
    FONT_BODY_MEDIUM,
    FONT_BODY_BOLD,
    FONT_BODY_SEMIBOLD,
} from '../../constants/theme';
import { haptic } from '../../utils/haptics';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

interface SearchResult { id: string; name: string; source: string; }

export default function GameScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [groupName, setGroupName] = useState(params.groupName as string || '');
  const [groupKey, setGroupKey] = useState(params.groupKey as string || '');
  const courtName = (params.courtName as string) || '';

  // Nav data loaded from AsyncStorage (large payloads) or fallback to URL params
  const [navScheduleJson, setNavScheduleJson] = useState<string | undefined>(
      params.schedule ? (params.schedule as string) : undefined
  );
  const [navPlayersData, setNavPlayersData] = useState<Player[]>(
      params.players ? JSON.parse(params.players as string) : []
  );
  const [navCollabScores, setNavCollabScores] = useState<any>(
      params.collabScores ? JSON.parse(params.collabScores as string) : null
  );
  const [navDataLoaded, setNavDataLoaded] = useState(false);

  useEffect(() => {
      const loadMatchData = async () => {
          // Try navId first
          if (params.navId) {
              const data = await getNavData(params.navId as string);
              if (data) {
                  if (data.schedule) setNavScheduleJson(JSON.stringify(data.schedule));
                  if (data.players) setNavPlayersData(data.players);
                  if (data.collabScores) setNavCollabScores(data.collabScores);
                  // Persist for refresh survival
                  await saveActiveMatchData({
                      schedule: data.schedule,
                      players: data.players,
                      groupName: params.groupName,
                      groupKey: params.groupKey,
                      courtName: params.courtName,
                  });
                  setNavDataLoaded(true);
                  return;
              }
          }
          // Fallback: recover from persisted active match data (hard refresh)
          const saved = await loadActiveMatchData();
          if (saved) {
              if (saved.schedule) setNavScheduleJson(JSON.stringify(saved.schedule));
              if (saved.players) setNavPlayersData(saved.players);
              if (saved.groupName && !params.groupName) setGroupName(saved.groupName as string);
              if (saved.groupKey && !params.groupKey) setGroupKey(saved.groupKey as string);
          }
          setNavDataLoaded(true);
      };
      loadMatchData();
  }, []);

  const [currentRoster, setCurrentRoster] = useState<Player[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<{r:number,g:number,t:number,p:number} | null>(null);

  // Update roster when nav data loads async
  useEffect(() => {
      if (navPlayersData.length > 0) setCurrentRoster(navPlayersData);
  }, [navPlayersData]);

  const {
      schedule, setSchedule, loading, swapSource, setSwapSource,
      partnerCounts, handlePlayerTap, handlePlayerNameChange, performShuffle, updateGame
  } = useGameLogic(navScheduleJson, navPlayersData, currentRoster, groupName);

  const finishButtonRef = React.useRef<any & { measure: Function }>(null);

  // Collab state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isCollaborator, setIsCollaborator] = useState(false);

  const {
      scores, setScores, winningScore, setWinningScore,
      clearScores, inputRefs, flatListRef, handleScoreChange
  } = useSmartScoring(groupName, schedule, () => {
      if (finishButtonRef.current && isMatchScored) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
      }
  });

  const {
      syncScoreToServer, createCollabSession, joinAndSync,
      isSyncing, connectedUsers, toastMessage, dismissToast,
      matchFinishedByRemote, finishedGroupName, finishedSessionId, clearMatchFinished
  } = useCollaborativeScoring({
      sessionId, shareCode, isCollaborator, schedule, scores, setScores, inputRefs
  });

  const { setActiveMatch, clearActiveMatch } = useActiveMatch();
  const { isPro, isTrial, isFree, isAdmin, showPaywall, features } = useSubscription();

  const [isMatchScored, setIsMatchScored] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedImageShareUrl, setGeneratedImageShareUrl] = useState<string | null>(null);
  const [dateTimeConfirmed, setDateTimeConfirmed] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [reportTitle, setReportTitle] = useState(groupName || 'Pickleball Match');
  const [saveTitle, setSaveTitle] = useState(groupName || '');
  const [userId, setUserId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gatekeeperVisible, setGatekeeperVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [matchEndToast, setMatchEndToast] = useState(false);

  const getDeviceId = async () => {
      let id = await AsyncStorage.getItem('user_id');
      if (!id) { console.warn('No user_id found'); id = ''; }
      return id;
  };

  useEffect(() => {
    const initGroupAndIdentity = async () => {
        await AsyncStorage.removeItem('device_id');
        let currentName = params.groupName as string;
        let currentKey = params.groupKey as string;
        if (currentName) {
            setGroupName(currentName);
            setReportTitle(currentName);
            setSaveTitle(currentName);
            await AsyncStorage.setItem('active_group_name', currentName);
        } else {
            const stored = await AsyncStorage.getItem('active_group_name');
            if (stored) { currentName = stored; setGroupName(stored); setReportTitle(stored); setSaveTitle(stored); }
        }
        if (currentKey) {
            setGroupKey(currentKey);
        }
        let did = await getDeviceId();
        setUserId(did);
    };
    initGroupAndIdentity();
  }, [params.groupName]);

  // UNIT B INIT: When arriving as collaborator, pull Unit A's scores
  useEffect(() => {
      if (params.isCollaborator === 'true' && params.shareCode && params.sessionId) {
          setIsCollaborator(true);
          setIsMatchScored(true); // Immediately show scoring UI
          const code = params.shareCode as string;
          const sid = params.sessionId as string;
          setShareCode(code);
          setSessionId(sid);

          // Pre-seed scores from join API data for instant display
          if (navCollabScores && typeof navCollabScores === 'object' && Object.keys(navCollabScores).length > 0) {
              console.log('Unit B: pre-seeding scores from join data...');
              setScores(navCollabScores);
          }

          // Then pull from server to get the absolute latest
          console.log('Unit B: pulling latest scores from server...');
          joinAndSync(code).then((serverScores) => {
              // Scroll to the first round that still needs scores
              if (schedule.length > 0 && serverScores) {
                  let targetRound = 0;
                  for (let rIdx = 0; rIdx < schedule.length; rIdx++) {
                      const round = schedule[rIdx];
                      const allGamesScored = round.games.every((_: any, gIdx: number) => {
                          const k1 = `${rIdx}_${gIdx}_t1`;
                          const k2 = `${rIdx}_${gIdx}_t2`;
                          return serverScores[k1] && serverScores[k2];
                      });
                      if (!allGamesScored) { targetRound = rIdx; break; }
                      targetRound = rIdx; // If all scored, stay at last round
                  }
                  if (targetRound > 0) {
                      setTimeout(() => {
                          flatListRef.current?.scrollToIndex({ index: targetRound, animated: true });
                      }, 300);
                  }
              }
          });

          setActiveMatch({
              shareCode: code,
              sessionId: sid,
              groupName,
              groupKey: groupKey || undefined,
              matchTitle: saveTitle || groupName,
              courtName: courtName || undefined,
              isOwner: false,
              schedule,
              players: currentRoster,
          });
      }
  }, [params.isCollaborator]);

  // When a collaborator finishes the match, redirect all other devices to podium
  useEffect(() => {
      if (matchFinishedByRemote && !saveModalVisible) {
          clearMatchFinished();
          clearScores();
          clearActiveMatch();
          setMatchEndToast(true);
          // Auto-navigate to leaderboard after brief delay
          setTimeout(() => {
              router.replace({
                  pathname: '/(tabs)/leaderboard',
                  params: {
                      groupName: finishedGroupName || groupName,
                      forceGlobal: 'true',
                      sessionId: finishedSessionId || '',
                      refresh: Date.now().toString()
                  }
              });
          }, 1500);
      }
  }, [matchFinishedByRemote]);

  useEffect(() => {
      if (newPlayerName.length < 2) { setSearchResults([]); return; }
      const delayDebounce = setTimeout(async () => {
          setIsSearching(true);
          try {
              const res = await fetch(`${API_URL}/search_players.php?q=${encodeURIComponent(newPlayerName)}`);
              const data = await res.json();
              if (data.status === 'success') setSearchResults(data.results);
          } catch(e) { console.log("Search error", e); }
          finally { setIsSearching(false); }
      }, 300);
      return () => clearTimeout(delayDebounce);
  }, [newPlayerName]);

  const getInitialDate = () => {
      const d = new Date(); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15); d.setSeconds(0); return d;
  };
  const [selectedDate, setSelectedDate] = useState(getInitialDate());

  const getFormattedDateStr = (date: Date) => {
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return `${time} on ${dayStr}`;
  };

  const adjustDate = (days: number) => { const d = new Date(selectedDate); d.setDate(d.getDate() + days); setSelectedDate(d); };
  const adjustTime = (direction: number) => {
      const d = new Date(selectedDate); let m = d.getMinutes();
      if (direction > 0) { d.setMinutes(m + (15 - m % 15)); }
      else { const r = m % 15; d.setMinutes(m - (r === 0 ? 15 : r)); }
      d.setSeconds(0); setSelectedDate(d);
  };

  const addNewPlayer = (existingPlayer?: SearchResult) => {
      if (!existingPlayer && !newPlayerName.trim()) return;
      let newP: Player;
      if (existingPlayer) { newP = { id: existingPlayer.id, first_name: existingPlayer.name }; }
      else {
          const trimmed = newPlayerName.trim();
          if (trimmed.toLowerCase() === 'unknown') { Alert.alert("Invalid Name", "You cannot name a player 'Unknown'."); return; }
          const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
          newP = { id: Date.now().toString(), first_name: capitalized };
      }
      setCurrentRoster([...currentRoster, newP]);
      const saveRoster = async () => {
          const saved = await AsyncStorage.getItem(`roster_${groupName}`);
          let rosterList = saved ? JSON.parse(saved) : [];
          rosterList.push(newP);
          await AsyncStorage.setItem(`roster_${groupName}`, JSON.stringify(rosterList));
      };
      saveRoster();
      Alert.alert("Added", `${newP.first_name} added to roster. Hit 'Shuffle' to include them in games.`);
      setNewPlayerName(''); setSearchResults([]); setModalVisible(false);
  };

  const handleShuffle = () => {
    const doShuffle = () => {
        performShuffle().then((s) => { if (s) clearScores(); });
    };
    if (Platform.OS === 'web') {
        if (window.confirm("Shuffle Matchups?\n\nThis will generate completely NEW matchups. Current scores will be cleared.")) {
            doShuffle();
        }
    } else {
        Alert.alert("Shuffle Matchups?", "This will generate completely NEW matchups. Current scores will be cleared.", [
            { text: "Cancel", style: "cancel" },
            { text: "Shuffle", style: "destructive", onPress: doShuffle }
        ]);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingImg(true); setGeneratedImageUrl(null); setGeneratedImageShareUrl(null);
    try {
        const uid = await getDeviceId();
        const response = await fetch(`${API_URL}/generate_report_image.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule, group_name: reportTitle, date_str: getFormattedDateStr(selectedDate), court_name: courtName, user_id: uid })
        });
        const data = await response.json(); setGeneratingImg(false);
        if (data.status === 'success') {
            setGeneratedImageUrl(data.image || data.url);
            setGeneratedImageShareUrl(data.url);
        } else Alert.alert("Error", "Failed to generate image.");
    } catch (e) { setGeneratingImg(false); Alert.alert("Error", "Network error."); }
  };

  const handleShareImage = async () => {
      if (!generatedImageUrl) { Alert.alert("No Image", "Please generate the preview first."); return; }
      if (!dateTimeConfirmed) { Alert.alert("Date & Time Required", "Please set the date and time of the match before sharing."); return; }
      const shareUrl = generatedImageShareUrl || generatedImageUrl;
      try {
          // Format date with ordinal suffix (e.g. "Friday, February 20th")
          const day = selectedDate.getDate();
          const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : (day === 2 || day === 22) ? 'nd' : (day === 3 || day === 23) ? 'rd' : 'th';
          const dateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + suffix;
          const timeLabel = selectedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const courtInfo = courtName ? ` at ${courtName}` : '';
          const shareMessage = `${dateLabel} ${timeLabel} Match Schedule for ${reportTitle}${courtInfo}\n${shareUrl}`;

          if (Platform.OS === 'web') {
              // Web: Use Web Share API if available, otherwise open in new tab
              if (navigator.share) {
                  await navigator.share({ title: `Match Schedule - ${reportTitle}`, text: shareMessage, url: shareUrl });
              } else {
                  window.open(shareUrl, '_blank');
              }
          } else {
              // Native: Download image to local cache and share the actual image
              const filename = shareUrl.split('/').pop() || 'match_report.png';
              const localUri = FileSystem.cacheDirectory + filename;
              const download = await FileSystem.downloadAsync(shareUrl, localUri);

              if (Platform.OS === 'ios') {
                  await Share.share({ message: shareMessage, url: download.uri });
              } else {
                  await Sharing.shareAsync(download.uri, { mimeType: 'image/png', dialogTitle: shareMessage });
              }
          }
      } catch (e) {
          console.error('Share error:', e);
          // Fallback to URL sharing
          const day = selectedDate.getDate();
          const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : (day === 2 || day === 22) ? 'nd' : (day === 3 || day === 23) ? 'rd' : 'th';
          const dateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + suffix;
          const timeLabel = selectedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const courtFallback = courtName ? ` at ${courtName}` : '';
          if (Platform.OS === 'web') {
              window.open(shareUrl, '_blank');
          } else {
              await Share.share({ message: `${dateLabel} ${timeLabel} Match Schedule for ${reportTitle}${courtFallback}\n${shareUrl}`, url: shareUrl });
          }
      }
      // Save the match snapshot so the LIVE tab can restore it
      setActiveMatch({
          groupName,
          groupKey: groupKey || undefined,
          matchTitle: reportTitle || groupName,
          courtName: courtName || undefined,
          isOwner: true,
          schedule,
          players: currentRoster,
      });
      setReportModalVisible(false);

      // Post-share nudge for free users (admins bypass)
      if (isFree && !isTrial && !isAdmin) {
          setTimeout(() => {
              Alert.alert(
                  'Upgrade to Pro',
                  'Your report includes a watermark. Upgrade to Pro for clean, HD reports!',
                  [
                      { text: 'Maybe Later', style: 'cancel' },
                      { text: 'Learn More', onPress: () => showPaywall('Remove watermarks and unlock all features with Pro!') }
                  ]
              );
          }, 500);
      }
  };

  const handleFinish = () => setSaveModalVisible(true);
  const handleTextMatchPress = () => { setDateTimeConfirmed(false); setReportModalVisible(true); handleGenerateReport(); };
  const handleGatekeeperSuccess = (newId: string) => setUserId(newId);

  // CREATE COLLAB SESSION (only when in scoring mode)
  const createNewCollabSession = async () => {
      if (sessionId && shareCode) { setShareModalVisible(true); return; }
      const batchId = groupKey || `collab_${Date.now()}`;
      const result = await createCollabSession(batchId, groupName, schedule);
      if (result) {
          setShareCode(result.shareCode);
          setSessionId(result.sessionId.toString());
          setShareModalVisible(true);
          setActiveMatch({
              shareCode: result.shareCode,
              sessionId: result.sessionId.toString(),
              groupName,
              groupKey: groupKey || undefined,
              matchTitle: saveTitle || groupName,
              courtName: courtName || undefined,
              isOwner: true,
              schedule,
              players: currentRoster,
          });
      } else {
          Alert.alert('Error', 'Could not create collaboration session. Try again.');
      }
  };

  // THUNDERBOLT PRESS — show options based on scoring mode
  const handleThunderboltPress = () => {
      // If already in a collab session, show share modal
      if (sessionId && shareCode) { setShareModalVisible(true); return; }

      if (isMatchScored) {
          // In scoring mode — offer to create OR join
          if (Platform.OS === 'web') {
              const choice = window.confirm('Create a shared match?\n\nOK = Create Shared Match\nCancel = Join Existing Match');
              if (choice) createNewCollabSession();
              else setJoinModalVisible(true);
          } else {
              Alert.alert('Shared Scoring', 'What would you like to do?', [
                  { text: 'Create Shared Match', onPress: createNewCollabSession },
                  { text: 'Join Match', onPress: () => setJoinModalVisible(true) },
                  { text: 'Cancel', style: 'cancel' },
              ]);
          }
      } else {
          // Not scoring — only join
          setJoinModalVisible(true);
      }
  };

  const executeSave = async (forceUpdate: boolean = false) => {
    const matchesToSave: any[] = [];
    schedule.forEach((round, rIdx) => {
        round.games.forEach((game, gIdx) => {
            const keyT1 = `${rIdx}_${gIdx}_t1`; const keyT2 = `${rIdx}_${gIdx}_t2`;
            if (scores[keyT1] && scores[keyT2]) {
                const cleanPlayer = (p: any) => ({ id: p.id || '', first_name: p.first_name || 'Unknown' });
                matchesToSave.push({
                    t1: game.team1.map(cleanPlayer),
                    t2: game.team2.map(cleanPlayer),
                    s1: scores[keyT1], s2: scores[keyT2],
                    round_num: rIdx + 1, court_num: gIdx + 1
                });
            }
        });
    });
    if (matchesToSave.length === 0) {
        if (Platform.OS === 'web') window.alert("Enter scores before finishing.");
        else Alert.alert("No Scores", "Enter scores before finishing.");
        setSaveModalVisible(false); return;
    }
    try {
        if (!groupName) {
            if (Platform.OS === 'web') window.alert("Group Name Lost.");
            else Alert.alert("Error", "Group Name Lost.");
            return;
        }
        const payload = {
            group_name: groupName, group_id: groupKey, matches: matchesToSave, user_id: userId,
            custom_timestamp: Math.floor(selectedDate.getTime() / 1000), match_title: saveTitle,
            force_update: forceUpdate,
            share_code: shareCode || undefined
        };
        const res = await fetch(`${API_URL}/save_scores.php`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const responseText = await res.text();
        let data;
        try { data = JSON.parse(responseText); } catch (parseError) {
            if (Platform.OS === 'web') window.alert("Server returned invalid data");
            else Alert.alert("Error", "Server returned invalid data");
            return;
        }

        if (data.status === 'success') {
            haptic.save();
            await clearScores(); setSaveModalVisible(false);
            clearActiveMatch();
            if (Platform.OS === 'web') {
                window.alert(data.message || "Match saved successfully!");
            } else {
                Alert.alert("Success!", data.message || "Match saved successfully!");
            }
            router.replace({ pathname: '/(tabs)/leaderboard', params: {
                groupName,
                forceGlobal: 'true',
                sessionId: data.session_id ? String(data.session_id) : '',
                refresh: Date.now().toString()
            } });
        } else if (data.status === 'already_exists') {
            setSaveModalVisible(false);
            if (Platform.OS === 'web') {
                window.alert("This match has already been saved with identical scores. Nothing to update.");
            } else {
                Alert.alert("Already Saved", "This match has already been saved with identical scores. Nothing to update.");
            }
        } else if (data.status === 'duplicate_diff_scores') {
            setSaveModalVisible(false);
            if (Platform.OS === 'web') {
                if (window.confirm("A match with this title and date already exists but with different scores. Would you like to update it?")) {
                    executeSave(true);
                }
            } else {
                Alert.alert(
                    "Update Scores?",
                    "A match with this title and date already exists but with different scores. Would you like to update it?",
                    [
                        { text: "No, Keep Original", style: "cancel" },
                        { text: "Yes, Update", style: "default", onPress: () => executeSave(true) }
                    ]
                );
            }
        } else {
            if (Platform.OS === 'web') {
                window.alert(`Could not save scores: ${data.message || 'Unknown error'}`);
            } else {
                Alert.alert("Error", `Could not save scores: ${data.message || 'Unknown error'}`);
            }
        }
    } catch (e: any) {
        if (Platform.OS === 'web') window.alert(`Network error: ${e.message || 'Unknown'}`);
        else Alert.alert("Error", `Network error: ${e.message || 'Unknown'}`);
    }
  };

  // FIXED: Uses ScoreChangeResult — syncs FINAL values after auto-fill
  const handleScoreChangeWithSync = (rIdx: number, gIdx: number, team: 't1' | 't2', value: string) => {
      const result = handleScoreChange(rIdx, gIdx, team, value);
      if (sessionId && result && result.changed) {
          syncScoreToServer(result.roundIdx, result.gameIdx, result.s1, result.s2);
      }
  };

  const renderPlayerBox = (player: Player | undefined, rIdx: number, gIdx: number, tIdx: number, pIdx: number, isTeamConflict: boolean) => {
    if (!player) return <View style={styles.emptyBox} />;
    const genderStr = (player.gender || '').toLowerCase();
    const isFemale = genderStr.startsWith('f');
    const isSelected = swapSource?.r === rIdx && swapSource?.g === gIdx && swapSource?.t === tIdx && swapSource?.p === pIdx;
    const isEditing = editingPlayer?.r === rIdx && editingPlayer?.g === gIdx && editingPlayer?.t === tIdx && editingPlayer?.p === pIdx;
    let bg = isFemale ? 'rgba(247,140,162,0.15)' : 'rgba(79,172,254,0.15)'; let txt = colors.text;
    if (isTeamConflict) { bg = '#ffa500'; txt = '#ffffff'; }
    if (isSelected) { bg = '#ffff00'; txt = '#000000'; }
    return (
      <TouchableOpacity style={[styles.playerBox, { backgroundColor: bg }, isSelected && styles.selectedBox]}
        onPress={() => { if (!isEditing) handlePlayerTap(rIdx, gIdx, tIdx, pIdx); }}
        onLongPress={() => { setSwapSource(null); setEditingPlayer({ r: rIdx, g: gIdx, t: tIdx, p: pIdx }); }} activeOpacity={0.7}>
        {isEditing ? (
          <TextInput style={[styles.pText, { color: txt, width: '100%', textAlign: 'center', padding: 2 }]}
            value={player.first_name} onChangeText={(name) => handlePlayerNameChange(rIdx, gIdx, tIdx, pIdx, name)}
            onBlur={() => setEditingPlayer(null)} autoFocus selectTextOnFocus />
        ) : (
          <Text style={[styles.pText, { color: txt }]} numberOfLines={1}>{player.first_name}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderGame = (game: any, rIdx: number, gIdx: number) => {
    let t1Conflict = false, t2Conflict = false;
    if (game.team1.length === 2) { const key = [game.team1[0].id, game.team1[1].id].sort().join('-'); if ((partnerCounts[key] || 0) > 1) t1Conflict = true; }
    if (game.team2.length === 2) { const key = [game.team2[0].id, game.team2[1].id].sort().join('-'); if ((partnerCounts[key] || 0) > 1) t2Conflict = true; }
    return (
      <View key={gIdx} style={styles.gameRow}>
        {isMatchScored && (
            <View style={styles.sideScoreContainer}>
                <TextInput ref={(el) => { inputRefs.current[`${rIdx}_${gIdx}_t1`] = el as TextInput | null; }}
                    style={styles.scoreInput} keyboardType="numeric" placeholder="-"
                    placeholderTextColor={colors.textMuted}
                    value={scores[`${rIdx}_${gIdx}_t1`] || ''}
                    onChangeText={(t) => handleScoreChangeWithSync(rIdx, gIdx, 't1', t)} returnKeyType="next" />
            </View>
        )}
        <View style={styles.teamWrapper}><View style={styles.teamContainer}>
            {renderPlayerBox(game.team1[0], rIdx, gIdx, 1, 0, t1Conflict)}
            {renderPlayerBox(game.team1[1], rIdx, gIdx, 1, 1, t1Conflict)}
        </View></View>
        <View style={styles.centerVS}>
             <Text style={styles.vsText}>VS</Text>
             <Text style={styles.crtText}>CRT {gIdx + 1}</Text>
        </View>
        <View style={styles.teamWrapper}><View style={styles.teamContainer}>
            {renderPlayerBox(game.team2[0], rIdx, gIdx, 2, 0, t2Conflict)}
            {renderPlayerBox(game.team2[1], rIdx, gIdx, 2, 1, t2Conflict)}
        </View></View>
        {isMatchScored && (
            <View style={styles.sideScoreContainer}>
                <TextInput ref={(el) => { inputRefs.current[`${rIdx}_${gIdx}_t2`] = el as TextInput | null; }}
                    style={styles.scoreInput} keyboardType="numeric" placeholder="-"
                    placeholderTextColor={colors.textMuted}
                    value={scores[`${rIdx}_${gIdx}_t2`] || ''}
                    onChangeText={(t) => handleScoreChangeWithSync(rIdx, gIdx, 't2', t)} returnKeyType="next" />
            </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        <ScoreUpdateToast visible={!!toastMessage} message={toastMessage || ''} onHide={dismissToast} />
        <ScoreUpdateToast visible={matchEndToast} message="Match completed by host" onHide={() => setMatchEndToast(false)} />

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
                <BrandedIcon name="back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
                {groupName ? groupName.toUpperCase() : "MATCH SETUP"}
            </Text>
            <TouchableOpacity onPress={() => {
                const doLogout = async () => { await AsyncStorage.clear(); router.replace('/login'); };
                if (Platform.OS === 'web') {
                    if (window.confirm('Log out of PlayPBNow?')) doLogout();
                } else {
                    Alert.alert('Log Out', 'Are you sure you want to log out?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Log Out', style: 'destructive', onPress: doLogout }
                    ]);
                }
            }} style={{ padding: 5 }}>
                <BrandedIcon name="logout" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.controlsRow}>
              <View style={styles.wtsContainer}>
                  <Text style={styles.wtsLabel}>PLAY TO:</Text>
                  <TextInput style={styles.wtsInput} keyboardType="numeric" value={winningScore.toString()}
                      onChangeText={setWinningScore} maxLength={2} />
              </View>
              <View style={styles.headerRightControls}>
                  <TouchableOpacity onPress={handleThunderboltPress} style={styles.shuffleBtn}>
                      <BrandedIcon name="flash" size={24} color={shareCode ? colors.accent : colors.text} />
                  </TouchableOpacity>
                  {shareCode && connectedUsers > 0 && (
                      <View style={styles.connectedBadge}><Text style={styles.connectedText}>{connectedUsers}</Text></View>
                  )}
                  <TouchableOpacity onPress={handleShuffle} style={styles.shuffleBtn} disabled={loading}>
                      {loading ? <ActivityIndicator size="small" color={colors.text} /> : <BrandedIcon name="shuffle" size={24} color={colors.text} />}
                  </TouchableOpacity>
                  <Switch value={isMatchScored} onValueChange={setIsMatchScored}
                    trackColor={{false: colors.textMuted, true: colors.accent}} thumbColor={colors.text}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
              </View>
          </View>
          {shareCode && (
              <View style={styles.collabStatusBar}>
                  <BrandedIcon name="live" size={14} color={colors.accent} />
                  <Text style={styles.collabStatusText}>
                      LIVE — Code: {shareCode}{connectedUsers > 0 ? ` \u2022 ${connectedUsers} connected` : ''}
                  </Text>
              </View>
          )}
        </View>

        <View style={styles.subHeaderAction}>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addPlayerBtn}>
                <BrandedIcon name="person-add" size={16} color={colors.text} /><Text style={styles.addPlayerText}>ADD PLAYER</Text>
            </TouchableOpacity>
        </View>

        <FlatList ref={flatListRef} data={schedule} keyExtractor={(item) => item.id}
          alwaysBounceHorizontal={false}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={(info) => { setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true }), 500); }}
          ListEmptyComponent={
              <View style={{alignItems:'center', marginTop: 100}}>
                  <Text style={{color: colors.text, fontFamily: FONT_BODY_BOLD, fontSize:18}}>No Matches Generated</Text>
                  <Text style={{color: colors.textMuted, marginTop:10, fontFamily: FONT_BODY_REGULAR}}>Try changing the setup or shuffling.</Text>
              </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.roundBlock}>
                <View style={styles.roundHeader}>
                    <Text style={styles.roundTitle}>
                        ROUND {index + 1} ({item.type === 'gender' ? 'SAME GENDER' : (item.type === 'mixed' ? 'MIXED DOUBLES' : 'MIXER')})
                    </Text>
                </View>
                <View style={styles.separator} />
                {item.games.map((game: any, gIdx: number) => renderGame(game, index, gIdx))}
                {item.byes.length > 0 && (
                    <View style={styles.byeRow}><Text style={styles.byeLabel}>BYES:</Text>
                        {item.byes.map((p: { id: string; first_name: string }) => (<Text key={p.id} style={styles.byeName}>{p.first_name} </Text>))}
                    </View>
                )}
            </View>
          )}
        />

        <View style={styles.footer}>
            <TouchableOpacity style={[styles.actionBtn, styles.textBtn]} onPress={handleTextMatchPress} activeOpacity={0.8}>
                <Text style={styles.btnText}>TEXT MATCH</Text>
            </TouchableOpacity>
            {isMatchScored && (
                <TouchableOpacity ref={finishButtonRef} style={[styles.actionBtn, styles.finishBtn]} onPress={handleFinish} activeOpacity={0.8}>
                    <Text style={styles.btnText}>FINISH MATCH</Text>
                </TouchableOpacity>
            )}
        </View>

        {/* REPORT MODAL */}
        <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
            <View style={styles.modalOverlay}><View style={styles.modalContent}>
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>GENERATE HD REPORT</Text>
                {isFree && !isTrial && !isAdmin && (
                    <TouchableOpacity onPress={() => showPaywall('Upgrade to Pro for clean, watermark-free reports!')} style={styles.watermarkBadge}>
                        <BrandedIcon name="lock" size={12} color="#ff6b35" />
                        <Text style={styles.watermarkBadgeText}>FREE — Reports include watermark</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.label}>Match Title</Text>
                <TextInput style={styles.modalInput} value={reportTitle} onChangeText={(t) => { setReportTitle(t); setGeneratedImageUrl(null); setGeneratedImageShareUrl(null); }} placeholder="Enter Title" placeholderTextColor={colors.inputPlaceholder} />
                <Text style={styles.label}>Date & Time</Text>
                <View style={styles.datePickerContainer}>
                    <View style={styles.dateRow}>
                        <TouchableOpacity onPress={() => { adjustDate(-1); setDateTimeConfirmed(true); setGeneratedImageUrl(null); setGeneratedImageShareUrl(null); }} style={styles.arrowBtn}><BrandedIcon name="chevron-left" size={24} color={colors.text} /></TouchableOpacity>
                        <Text style={styles.dateValue}>{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                        <TouchableOpacity onPress={() => { adjustDate(1); setDateTimeConfirmed(true); setGeneratedImageUrl(null); setGeneratedImageShareUrl(null); }} style={styles.arrowBtn}><BrandedIcon name="chevron-right" size={24} color={colors.text} /></TouchableOpacity>
                    </View>
                    <View style={styles.dateRow}>
                        <TouchableOpacity onPress={() => { adjustTime(-1); setDateTimeConfirmed(true); setGeneratedImageUrl(null); setGeneratedImageShareUrl(null); }} style={styles.arrowBtn}><BrandedIcon name="chevron-left" size={24} color={colors.text} /></TouchableOpacity>
                        <Text style={styles.dateValue}>{selectedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
                        <TouchableOpacity onPress={() => { adjustTime(1); setDateTimeConfirmed(true); setGeneratedImageUrl(null); setGeneratedImageShareUrl(null); }} style={styles.arrowBtn}><BrandedIcon name="chevron-right" size={24} color={colors.text} /></TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.previewText}>{getFormattedDateStr(selectedDate)}</Text>
                {generatingImg ? (<View style={styles.previewContainer}><ActivityIndicator size="large" color={colors.accent} /></View>)
                 : generatedImageUrl ? (<View style={styles.previewContainer}><Image source={{ uri: generatedImageUrl }} style={styles.previewImage} resizeMode="contain" /></View>)
                 : (<TouchableOpacity style={styles.generateBtn} onPress={handleGenerateReport}><Text style={styles.generateBtnText}>REFRESH PREVIEW</Text></TouchableOpacity>)}
                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setReportModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}><Text style={styles.modalBtnText}>CANCEL</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleShareImage} style={[styles.modalBtn, styles.saveBtn, !generatedImageUrl && {opacity: 0.5}]} disabled={!generatedImageUrl}>
                        <Text style={[styles.modalBtnText, {color: colors.text}]}>SHARE NOW</Text></TouchableOpacity>
                </View>
                </ScrollView>
            </View></View>
        </Modal>

        {/* SAVE MODAL */}
        <Modal visible={saveModalVisible} transparent animationType="slide" onRequestClose={() => setSaveModalVisible(false)}>
            <View style={styles.modalOverlay}><View style={styles.modalContent}>
                <Text style={styles.modalTitle}>SAVE MATCH RESULTS</Text>
                <Text style={styles.label}>Match Title</Text>
                <TextInput style={styles.modalInput} value={saveTitle} onChangeText={setSaveTitle} placeholder="Enter Title" placeholderTextColor={colors.inputPlaceholder} />
                <Text style={styles.label}>Scheduled Date & Time</Text>
                <View style={styles.datePickerContainer}>
                    <View style={styles.dateRow}>
                        <TouchableOpacity onPress={() => adjustDate(-1)} style={styles.arrowBtn}><BrandedIcon name="chevron-left" size={24} color={colors.text} /></TouchableOpacity>
                        <Text style={styles.dateValue}>{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                        <TouchableOpacity onPress={() => adjustDate(1)} style={styles.arrowBtn}><BrandedIcon name="chevron-right" size={24} color={colors.text} /></TouchableOpacity>
                    </View>
                    <View style={styles.dateRow}>
                        <TouchableOpacity onPress={() => adjustTime(-1)} style={styles.arrowBtn}><BrandedIcon name="chevron-left" size={24} color={colors.text} /></TouchableOpacity>
                        <Text style={styles.dateValue}>{selectedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
                        <TouchableOpacity onPress={() => adjustTime(1)} style={styles.arrowBtn}><BrandedIcon name="chevron-right" size={24} color={colors.text} /></TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.previewText}>{getFormattedDateStr(selectedDate)}</Text>
                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setSaveModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}><Text style={styles.modalBtnText}>CANCEL</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => executeSave()} style={[styles.modalBtn, styles.saveBtn]}><Text style={[styles.modalBtnText, {color: colors.text}]}>CONFIRM SAVE</Text></TouchableOpacity>
                </View>
            </View></View>
        </Modal>

        {/* ADD PLAYER MODAL */}
        <Modal visible={modalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}><View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Player</Text>
                <TextInput style={styles.modalInput} placeholder="Type name to search..." value={newPlayerName} onChangeText={setNewPlayerName} autoFocus placeholderTextColor={colors.inputPlaceholder} />
                {isSearching && <ActivityIndicator color={colors.accent} />}
                {searchResults.length > 0 && (
                    <View style={styles.searchResultsContainer}><Text style={styles.searchLabel}>Found Global Players:</Text>
                        <FlatList data={searchResults} keyExtractor={i => i.id} renderItem={({item}) => (
                            <TouchableOpacity style={styles.searchItem} onPress={() => addNewPlayer(item)}>
                                <Text style={styles.searchName}>{item.name}</Text><Text style={styles.searchSource}>from {item.source}</Text>
                            </TouchableOpacity>
                        )} />
                    </View>
                )}
                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}><Text style={styles.modalBtnText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => addNewPlayer()} style={[styles.modalBtn, styles.saveBtn]}><Text style={styles.modalBtnText}>Add New</Text></TouchableOpacity>
                </View>
            </View></View>
        </Modal>

        <ShareMatchModal visible={shareModalVisible} onClose={() => setShareModalVisible(false)} shareCode={shareCode || ''} matchTitle={groupName} />
        <JoinMatchModal visible={joinModalVisible} onClose={() => setJoinModalVisible(false)} />

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backButton: { padding: 5 },
  headerTitle: { color: c.text, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 20, textTransform: 'uppercase', flex: 1, textAlign: 'center' },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wtsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wtsLabel: { color: c.accent, fontSize: 12, fontFamily: FONT_BODY_BOLD },
  wtsInput: { backgroundColor: c.inputBg, color: c.inputText, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 14, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, minWidth: 40, textAlign: 'center', borderWidth: 1, borderColor: c.inputBorder },
  headerRightControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  shuffleBtn: { padding: 5 },
  connectedBadge: { backgroundColor: c.accent, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  connectedText: { color: c.text, fontSize: 10, fontFamily: FONT_DISPLAY_EXTRABOLD },
  collabStatusBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: c.border },
  collabStatusText: { color: c.accent, fontSize: 11, fontFamily: FONT_BODY_BOLD, letterSpacing: 0.5 },
  subHeaderAction: { alignItems: 'center', marginVertical: 10 },
  addPlayerBtn: { flexDirection: 'row', backgroundColor: c.surfaceLight, padding: 8, paddingHorizontal: 15, borderRadius: 20, alignItems: 'center', gap: 5 },
  addPlayerText: { color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 12 },
  listContent: { padding: 15, paddingBottom: 120 },
  roundBlock: { marginBottom: 25, backgroundColor: c.card, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: c.border },
  roundHeader: { marginBottom: 10 },
  roundTitle: { color: c.textSoft, fontFamily: FONT_BODY_BOLD, fontSize: 16 },
  separator: { height: 1, backgroundColor: c.border, marginBottom: 15 },
  gameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, height: 110 },
  sideScoreContainer: { width: 50, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  teamWrapper: { flex: 1, height: '100%', borderColor: c.border, borderWidth: 1, borderRadius: 8, padding: 2, marginHorizontal: 2 },
  teamContainer: { flex: 1, flexDirection: 'column', justifyContent: 'space-between', gap: 2 },
  centerVS: { width: 40, justifyContent: 'center', alignItems: 'center' },
  playerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  selectedBox: { borderWidth: 3, borderColor: c.accent },
  emptyBox: { flex: 1, backgroundColor: c.surfaceLight, borderRadius: 6 },
  pText: { fontFamily: FONT_BODY_BOLD, fontSize: 16 },
  vsText: { color: c.textMuted, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 18 },
  crtText: { fontFamily: FONT_BODY_BOLD, color: c.textMuted, fontSize: 10, marginTop: 4 },
  scoreInput: { width: 45, height: 45, backgroundColor: c.inputBg, borderRadius: 8, textAlign: 'center', fontSize: 20, fontFamily: FONT_BODY_BOLD, color: c.inputText, borderWidth: 1, borderColor: c.border, elevation: 2 },
  byeRow: { flexDirection: 'row', marginTop: 15, alignItems: 'center', gap: 5, paddingTop: 10, borderTopWidth: 1, borderColor: c.border },
  byeLabel: { color: c.textSoft, fontSize: 12, fontFamily: FONT_BODY_BOLD },
  byeName: { color: c.text, fontSize: 12, fontFamily: FONT_BODY_BOLD },
  footer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 20, gap: 15, backgroundColor: c.bg, position: 'absolute', bottom: 0, width: '100%' },
  actionBtn: { flex: 1, height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 27.5, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  textBtn: { backgroundColor: c.surfaceLight },
  finishBtn: { backgroundColor: c.accent },
  btnText: { color: c.text, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: c.modalOverlay, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: c.modalBg, padding: 25, borderRadius: 20, width: '90%', maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.text, marginBottom: 20, textAlign: 'center' },
  label: { color: c.textMuted, fontFamily: FONT_BODY_BOLD, marginBottom: 5, fontSize: 12 },
  modalInput: { backgroundColor: c.inputBg, padding: 15, borderRadius: 10, fontSize: 16, fontFamily: FONT_BODY_BOLD, marginBottom: 15, borderWidth: 1, borderColor: c.inputBorder, color: c.inputText },
  searchResultsContainer: { maxHeight: 150, marginBottom: 15 },
  searchLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: c.textMuted, marginBottom: 5 },
  searchItem: { padding: 10, borderBottomWidth: 1, borderColor: c.border, backgroundColor: c.surfaceLight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchName: { fontFamily: FONT_BODY_BOLD, color: c.text },
  searchSource: { fontSize: 10, color: c.textMuted, fontFamily: FONT_BODY_REGULAR },
  datePickerContainer: { marginBottom: 10 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, backgroundColor: c.inputBg, padding: 10, borderRadius: 10 },
  arrowBtn: { backgroundColor: c.surfaceLight, padding: 10, borderRadius: 8 },
  dateValue: { fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.text, fontSize: 16, flex: 1, textAlign: 'center' },
  previewText: { textAlign: 'center', color: c.accent, fontFamily: FONT_BODY_BOLD, fontSize: 16, marginBottom: 10 },
  previewContainer: { height: 200, backgroundColor: c.surfaceLight, borderRadius: 10, marginBottom: 15, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  generateBtn: { padding: 15, backgroundColor: c.surfaceLight, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  generateBtnText: { fontFamily: FONT_BODY_BOLD, color: c.textMuted },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 15, alignItems: 'center' },
  cancelBtn: { backgroundColor: c.surfaceLight },
  saveBtn: { backgroundColor: c.accent },
  modalBtnText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 14, color: c.text },
  watermarkBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: isDark ? 'rgba(255,107,53,0.1)' : '#fff3e0', padding: 8, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ff6b35' },
  watermarkBadgeText: { color: '#ff6b35', fontFamily: FONT_BODY_BOLD, fontSize: 12 },
});
