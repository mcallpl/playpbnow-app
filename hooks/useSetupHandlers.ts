import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { Player } from './useSetupState';

const API_URL = 'https://peoplestar.com/Chipleball/api';

export function useSetupHandlers(props: any) {
    const {
        players, setPlayers,
        newPlayerName, setNewPlayerName,
        newPlayerGender,
        groupName, setGroupName,
        groupKey, setGroupKey,
        deviceId,
        saveAsName,
        setSaveModalVisible,
        roundsConfig, setRoundsConfig,
        router
    } = props;

    const addPlayer = () => {
        if (!newPlayerName.trim()) return;
        
        const newPlayer: Player = {
            id: Date.now().toString(),
            first_name: newPlayerName.trim(),
            gender: newPlayerGender
        };
        setPlayers([...players, newPlayer]);
        setNewPlayerName('');
    };

    const removePlayer = (playerId: string) => {
        setPlayers(players.filter((p: Player) => p.id !== playerId));
    };

    const handleSavePress = () => {
        setSaveModalVisible(true);
    };

    const performSave = async () => {
        try {
            // Get user_id from AsyncStorage
            const userId = await AsyncStorage.getItem('user_id');        

            console.log('💾 Saving players to database:', groupKey);
            const response = await fetch(`${API_URL}/save_players.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group_key: groupKey,
                    group_name: groupName,
                    user_id: userId,  // Changed from device_id
                    players: players
                })
            });
    
            const data = await response.json();
            if (data.status === 'success') {
                Alert.alert('Success', `Roster saved with ${players.length} players!`);
            } else {
                Alert.alert('Error', data.message || 'Failed to save roster');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to save roster');
        }
    };
    
    const handleSmartSave = async () => {
        const cleanName = saveAsName.trim();
        if (!cleanName) {
            Alert.alert('Error', 'Group name cannot be empty');
            return;
        }
    
        try {
            // Get user_id from AsyncStorage
            const userId = await AsyncStorage.getItem('user_id');
            
            console.log('💾 Saving players to database:', groupKey);
            const response = await fetch(`${API_URL}/save_players.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group_key: groupKey,
                    group_name: cleanName,
                    user_id: userId,  // Changed from device_id
                    players: players
                })
            });
    
            const data = await response.json();
            if (data.status === 'success') {
                Alert.alert('Success', `Roster saved with ${players.length} players!`);
                
                // UPDATE: Set the new group name and key
                if (data.action === 'created') {
                    setGroupName(cleanName);
                    setGroupKey(data.group_key);
                    await AsyncStorage.setItem('active_group_name', cleanName);
                    await AsyncStorage.setItem('active_group_key', data.group_key);
                }
                
                setSaveModalVisible(false);
            } else {
                Alert.alert('Error', data.message || 'Failed to save roster');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to save roster');
        }
    };

    const handleSetupPress = () => {
        if (players.length < 4) {
            Alert.alert("Too Few Players", "You need at least 4 players.");
            return;
        }
        if (players.length % 4 !== 0) {
            Alert.alert("Player Count", "Best results with a multiple of 4 players.");
        }
        props.setConfigModalVisible(true);
    };

    const addRound = () => {
        setRoundsConfig([...roundsConfig, { type: 'mixed' }]);
    };

    const removeRound = () => {
        if (roundsConfig.length > 1) {
            const newConfigs = [...roundsConfig];
            newConfigs.pop();
            setRoundsConfig(newConfigs);
        }
    };

    const updateRoundType = (index: number, newType: 'mixed' | 'gender' | 'mixer') => {
        const newConfigs = [...roundsConfig];
        newConfigs[index].type = newType;
        setRoundsConfig(newConfigs);
    };

    const generateSchedule = async () => {
        if (players.length < 4) {
            Alert.alert("Error", "Need at least 4 players");
            return;
        }
    
        try {
            const payload = {
                group_key: groupKey,  // ADD THIS LINE
                players: players.map((p: Player, i: number) => ({
                    ...p,
                    order_index: i
                })),
                round_configs: roundsConfig  // Changed from 'rounds' to 'round_configs'
            };
            console.log('📊 Generating schedule with payload:', payload);    
            const response = await fetch(`${API_URL}/generate_schedule.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
    
            const data = await response.json();
    
            if (data.status === 'success') {
                props.setConfigModalVisible(false);
                
                // Navigate to game screen
                router.push({
                    pathname: '/(tabs)/game',
                    params: {
                        schedule: JSON.stringify(data.schedule),
                        players: JSON.stringify(players),
                        groupName: groupName
                    }
                });
            } else {
                Alert.alert("Error", data.message || "Failed to generate schedule");
            }
        } catch (e: any) {
            Alert.alert("Error", e.message || "Network error");
        }
    };

    return {
        addPlayer,
        removePlayer,
        handleSavePress,
        performSave,
        handleSmartSave,
        handleSetupPress,
        addRound,
        removeRound,
        updateRoundType,
        generateSchedule
    };
}
