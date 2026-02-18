import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://peoplestar.com/Chipleball/api';

export function useGameHandlers(props: any) {
  const {
    schedule, scores, groupName, groupKey, deviceId, saveTitle, selectedDate,
    reportTitle, generatedImageUrl, performShuffle, clearScores,
    setGeneratingImg, setGeneratedImageUrl, setReportModalVisible,
    setGatekeeperVisible, setSaveModalVisible, setIsSaving, router,
    setSelectedDate, currentRoster, setCurrentRoster, setNewPlayerName,
    setSearchResults, setModalVisible
  } = props;

  const handleShuffle = () => {
    Alert.alert(
      "Shuffle Matchups?",
      "This will generate completely NEW matchups using the updated roster. Current scores will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Shuffle", style: "destructive", onPress: async () => {
          const success = await performShuffle();
          if (success) clearScores();
        }}
      ]
    );
  };

  const handleGenerateReport = async () => {
    setGeneratingImg(true);
    setGeneratedImageUrl(null);
    try {
      const response = await fetch(`${API_URL}/generate_report_image.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule: schedule,
          group_name: reportTitle,
          date_str: getFormattedDateStr(selectedDate)
        })
      });
      const data = await response.json();
      setGeneratingImg(false);
      if (data.status === 'success') {
        setGeneratedImageUrl(data.url);
      } else {
        Alert.alert("Error", "Failed to generate image.");
      }
    } catch (e) {
      setGeneratingImg(false);
      Alert.alert("Error", "Network error.");
    }
  };

  const handleShareImage = async () => {
    if (!generatedImageUrl) {
      Alert.alert("No Image", "Please generate the preview first.");
      return;
    }
    const Share = require('react-native').Share;
    await Share.share({
      message: `Match Schedule for ${reportTitle}:\n${generatedImageUrl}`,
      url: generatedImageUrl
    });
    setReportModalVisible(false);
  };

  const handleFinish = () => {
    if (!deviceId || !deviceId.startsWith('phone_')) {
      setGatekeeperVisible(true);
      return;
    }
    setSaveModalVisible(true);
  };

  const handleTextMatchPress = () => {
    if (!deviceId || !deviceId.startsWith('phone_')) {
      setGatekeeperVisible(true);
      return;
    }
    setReportModalVisible(true);
    handleGenerateReport();
  };

  const handleGatekeeperSuccess = (newId: string) => {
    // Update device ID in state
  };

  const executeSave = async () => {
    if (props.isSaving) return;
    setIsSaving(true);

    const matchesToSave: any[] = [];
    schedule.forEach((round: any, rIdx: number) => {
      round.games.forEach((game: any, gIdx: number) => {
        const keyT1 = `${rIdx}_${gIdx}_t1`;
        const keyT2 = `${rIdx}_${gIdx}_t2`;
        if (scores[keyT1] && scores[keyT2]) {
          matchesToSave.push({
            t1: game.team1,
            t2: game.team2,
            s1: scores[keyT1],
            s2: scores[keyT2]
          });
        }
      });
    });

    if (matchesToSave.length === 0) {
      Alert.alert("No Scores", "Enter scores before finishing.");
      setSaveModalVisible(false);
      setIsSaving(false);
      return;
    }

    try {
      if (!groupName) {
        Alert.alert("Error", "Group Name Lost. Please go back and select group again.");
        setIsSaving(false);
        return;
      }

      const payload = {
        group_name: groupName,
        group_key: groupName,
        matches: matchesToSave,
        device_id: deviceId,
        custom_timestamp: Math.floor(selectedDate.getTime() / 1000),
        match_title: saveTitle
      };

      const res = await fetch(`${API_URL}/save_scores.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      const data = JSON.parse(responseText);

      if (data.status === 'success') {
        await clearScores();
        setSaveModalVisible(false);
        setIsSaving(false);
        Alert.alert("Success!", "Match saved successfully!");
        router.replace({
          pathname: '/(tabs)/leaderboard',
          params: { groupName: groupName, refresh: Date.now().toString() }
        });
      } else {
        Alert.alert("Error", `Could not save scores: ${data.message || 'Unknown error'}`);
        setIsSaving(false);
      }
    } catch (e: any) {
      Alert.alert("Error", `Network error: ${e.message || 'Unknown'}`);
      setIsSaving(false);
    }
  };

  const addNewPlayer = (existingPlayer?: any) => {
    if (!existingPlayer && !props.newPlayerName.trim()) return;

    let newP: any;
    if (existingPlayer) {
      newP = { id: existingPlayer.id, first_name: existingPlayer.name };
    } else {
      if (props.newPlayerName.trim().toLowerCase() === 'unknown') {
        Alert.alert("Invalid Name", "You cannot name a player 'Unknown'.");
        return;
      }
      newP = { id: Date.now().toString(), first_name: props.newPlayerName.trim() };
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
    setNewPlayerName('');
    setSearchResults([]);
    setModalVisible(false);
  };

  const adjustDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const adjustTime = (direction: number) => {
    const d = new Date(selectedDate);
    let m = d.getMinutes();
    if (direction > 0) {
      const remainder = m % 15;
      const add = 15 - remainder;
      d.setMinutes(m + add);
    } else {
      const remainder = m % 15;
      const sub = (remainder === 0) ? 15 : remainder;
      d.setMinutes(m - sub);
    }
    d.setSeconds(0);
    setSelectedDate(d);
  };

  const getFormattedDateStr = (date: Date) => {
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return `${time} on ${dayStr}`;
  };

  return {
    handleShuffle,
    handleGenerateReport,
    handleShareImage,
    handleFinish,
    handleTextMatchPress,
    handleGatekeeperSuccess,
    executeSave,
    addNewPlayer,
    adjustDate,
    adjustTime,
    getFormattedDateStr
  };
}
