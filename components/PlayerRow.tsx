import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface PlayerRowData {
    id: number;
    first_name: string;
    last_name?: string;
    gender: string;
    cell_phone?: string;
}

interface PlayerRowProps {
    player: PlayerRowData;
    selectionMode: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function PlayerRow({ player, selectionMode, isSelected, onToggleSelect, onEdit, onDelete }: PlayerRowProps) {
    const isFemale = player.gender?.toLowerCase().startsWith('f');

    return (
        <TouchableOpacity 
            style={[styles.playerRow, isSelected && styles.playerRowSelected]} 
            onPress={selectionMode ? onToggleSelect : undefined}
            activeOpacity={selectionMode ? 0.7 : 1}
        >
            {selectionMode && (
                <View style={styles.checkboxContainer}>
                    <Ionicons 
                        name={isSelected ? 'checkbox' : 'square-outline'} 
                        size={24} 
                        color={isSelected ? '#4a90e2' : '#ccc'} 
                    />
                </View>
            )}
            
            <View style={styles.playerInfo}>
                <View style={[styles.genderBadge, { backgroundColor: isFemale ? '#ff69b4' : '#4a90e2' }]}>
                    <Text style={styles.genderText}>{isFemale ? 'F' : 'M'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.playerName}>
                        {player.first_name} {player.last_name || ''}
                    </Text>
                    {player.cell_phone && <Text style={styles.playerPhone}>{player.cell_phone}</Text>}
                </View>
            </View>

            {!selectionMode && (
                <View style={styles.actions}>
                    <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
                        <Ionicons name="pencil" size={20} color="#4a90e2" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
                        <Ionicons name="trash" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    playerRow: { 
        backgroundColor: 'white', 
        padding: 15, 
        borderRadius: 12, 
        marginBottom: 10, 
        flexDirection: 'row', 
        alignItems: 'center', 
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 3, 
        elevation: 2 
    },
    playerRowSelected: { 
        backgroundColor: '#e3f2fd', 
        borderWidth: 2, 
        borderColor: '#4a90e2' 
    },
    checkboxContainer: { 
        marginRight: 12 
    },
    playerInfo: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        flex: 1 
    },
    genderBadge: { 
        width: 36, 
        height: 36, 
        borderRadius: 18, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 12 
    },
    genderText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 14 
    },
    playerName: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#333' 
    },
    playerPhone: { 
        fontSize: 14, 
        color: '#666', 
        marginTop: 2 
    },
    actions: { 
        flexDirection: 'row', 
        gap: 10 
    },
    actionBtn: { 
        padding: 8 
    },
});
