import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Player } from '../../hooks/useSetupState';

interface PlayersListProps {
    players: Player[];
    setPlayers: (players: Player[]) => void;
    onRemovePlayer: (id: string) => void;
}

export function PlayersList({ players, setPlayers, onRemovePlayer }: PlayersListProps) {
    const renderItem = ({ item, drag, isActive }: RenderItemParams<Player>) => {
        const isFemale = item.gender?.toLowerCase().startsWith('f');
        
        return (
            <ScaleDecorator>
                <TouchableOpacity
                    onLongPress={drag}
                    disabled={isActive}
                    style={[
                        styles.playerRow,
                        { backgroundColor: isFemale ? '#ffc0cb' : '#add8e6' },
                        isActive && styles.activeRow
                    ]}
                >
                    <View style={styles.playerInfo}>
                        <Ionicons name="menu" size={20} color="#333" style={styles.dragIcon} />
                        <Text style={styles.playerName}>{item.first_name}</Text>
                        <Text style={styles.playerGender}>({item.gender})</Text>
                    </View>
                    <TouchableOpacity onPress={() => onRemovePlayer(item.id)} style={styles.removeBtn}>
                        <Ionicons name="trash-outline" size={20} color="#d32f2f" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <DraggableFlatList
                data={players}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => setPlayers(data)}
                contentContainerStyle={styles.listContent}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingBottom: 20 },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        marginVertical: 4,
        marginHorizontal: 10,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2
    },
    activeRow: {
        elevation: 8,
        shadowOpacity: 0.4
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    dragIcon: {
        marginRight: 10
    },
    playerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1b3358',
        marginRight: 8
    },
    playerGender: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic'
    },
    removeBtn: {
        padding: 8
    }
});
