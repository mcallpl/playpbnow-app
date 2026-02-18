import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export interface Player {
    id: string;
    first_name: string;
    last_name?: string;
    gender: string;
}

export interface RoundConfig {
    type: 'mixed' | 'gender' | 'mixer';
}

const API_URL = 'https://peoplestar.com/Chipleball/api';

export function useSetupState(params: any) {
    const [groupId, setGroupId] = useState(params.groupId as string || '');
    const [groupName, setGroupName] = useState(params.groupName as string || '');
    const [groupKey, setGroupKey] = useState(params.groupKey as string || '');
    const [deviceId, setDeviceId] = useState('');
    
    const [players, setPlayers] = useState<Player[]>([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerGender, setNewPlayerGender] = useState<'male' | 'female'>('male');

    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [configModalVisible, setConfigModalVisible] = useState(false);
    
    const [roundsConfig, setRoundsConfig] = useState<RoundConfig[]>([
        { type: 'mixed' }, { type: 'mixed' }, { type: 'mixed' },
        { type: 'mixed' }, { type: 'mixed' }, { type: 'mixed' }
    ]);

    // Load players from database on focus
    useFocusEffect(
        useCallback(() => {
            const loadFreshData = async () => {
                // Get device ID
                let did = await AsyncStorage.getItem('device_id');
                if (!did) {
                    did = `phone_${Math.random().toString(36).substring(2, 15)}`;
                    await AsyncStorage.setItem('device_id', did);
                }
                setDeviceId(did);

                // Get group info from params or AsyncStorage
                let gKey = params.groupKey as string;
                if (!gKey) {
                    gKey = await AsyncStorage.getItem('active_group_key') || '';
                }
                
                let gName = params.groupName as string;
                if (!gName) {
                    gName = await AsyncStorage.getItem('active_group_name') || '';
                }

                if (gKey) setGroupKey(gKey);
                if (gName) setGroupName(gName);
                if (params.groupId) setGroupId(params.groupId as string);

                // Load players from database
                if (gKey) {
                    try {
                        console.log('📥 Loading players for group_key:', gKey);
                        const response = await fetch(`${API_URL}/get_players.php?group_key=${gKey}`);
                        const data = await response.json();
                        
                        if (data.status === 'success') {
                            console.log('✅ Loaded', data.players.length, 'players');
                            setPlayers(data.players || []);
                        } else {
                            console.log('⚠️ No players found');
                            setPlayers([]);
                        }
                    } catch (error) {
                        console.error('Error loading players:', error);
                    }
                }
            };
            loadFreshData();
        }, [params.groupKey, params.groupName, params.groupId])
    );

    const courtCount = Math.floor(players.length / 4);
    const maleCount = players.filter(p => p.gender === 'male').length;
    const femaleCount = players.filter(p => p.gender === 'female').length;

    return {
        groupId, setGroupId,
        groupName, setGroupName,
        groupKey, setGroupKey,
        deviceId, setDeviceId,
        players, setPlayers,
        newPlayerName, setNewPlayerName,
        newPlayerGender, setNewPlayerGender,
        saveModalVisible, setSaveModalVisible,
        saveAsName, setSaveAsName,
        configModalVisible, setConfigModalVisible,
        roundsConfig, setRoundsConfig,
        courtCount,
        maleCount,
        femaleCount
    };
}
