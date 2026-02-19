import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert } from 'react-native';

const API_URL = 'https://peoplestar.com/Chipleball/api';

export interface Player {
    id: number;
    player_key: string;
    first_name: string;
    last_name?: string;
    gender: string;
    cell_phone?: string;
    dupr_rating?: number | null;
    wins?: number;
    losses?: number;
    diff?: number;
    win_pct?: number;
    group_names?: string;
}

export function usePlayerManagement() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);

    const loadPlayers = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) {
                Alert.alert('Error', 'Please login first');
                return;
            }

            const response = await fetch(`${API_URL}/get_all_players.php?user_id=${userId}`);
            const data = await response.json();

            if (data.status === 'success') {
                setPlayers(data.players || []);
            }
        } catch (error) {
            console.error('Error loading players:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePlayer = async (playerId: number, updates: Partial<Player>) => {
        try {
            const response = await fetch(`${API_URL}/update_player.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: playerId,
                    ...updates
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                await loadPlayers(); // Reload to get updated data
                return true;
            } else {
                Alert.alert('Error', data.message || 'Failed to update player');
                return false;
            }
        } catch (error) {
            console.error('Error updating player:', error);
            Alert.alert('Error', 'Failed to update player');
            return false;
        }
    };

    const deletePlayer = async (playerId: number, playerName: string) => {
        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Delete Player',
                `Delete ${playerName}? This cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                const response = await fetch(`${API_URL}/delete_player.php`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ player_id: playerId })
                                });

                                const data = await response.json();

                                if (data.status === 'success') {
                                    await loadPlayers();
                                    resolve(true);
                                } else {
                                    Alert.alert('Error', data.message || 'Failed to delete player');
                                    resolve(false);
                                }
                            } catch (error) {
                                console.error('Error deleting player:', error);
                                Alert.alert('Error', 'Failed to delete player');
                                resolve(false);
                            }
                        }
                    }
                ]
            );
        });
    };

    const maleCount = players.filter(p => p.gender?.toLowerCase().startsWith('m')).length;
    const femaleCount = players.filter(p => p.gender?.toLowerCase().startsWith('f')).length;

    return {
        players,
        loading,
        maleCount,
        femaleCount,
        loadPlayers,
        updatePlayer,
        deletePlayer
    };
}
