import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert } from 'react-native';

const API_URL = 'https://peoplestar.com/Chipleball/api';

export interface Group {
    id: number;
    name: string;
    group_key: string;
    count: number;
}

export function useGroupManagement() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);

    const loadGroups = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) {
                Alert.alert('Error', 'Please login first');
                return;
            }

            const response = await fetch(`${API_URL}/get_groups.php?user_id=${userId}`);
            const data = await response.json();

            if (data.status === 'success') {
                setGroups(data.groups || []);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const addPlayersToGroup = async (playerIds: number[], groupId: number) => {
        try {
            const response = await fetch(`${API_URL}/add_players_to_group.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_ids: playerIds,
                    group_id: groupId
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                Alert.alert('Success', `${playerIds.length} player(s) added to group!`);
                return true;
            } else {
                Alert.alert('Error', data.message || 'Failed to add players to group');
                return false;
            }
        } catch (error) {
            console.error('Error adding players to group:', error);
            Alert.alert('Error', 'Failed to add players to group');
            return false;
        }
    };

    return {
        groups,
        loading,
        loadGroups,
        addPlayersToGroup
    };
}
