import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Player {
    id: string;
    first_name: string;
    gender?: string;
}

interface PlayerBoxProps {
    player: Player | undefined;
    isConflict: boolean;
    isSelected: boolean;
    isEditing: boolean;
    onTap: () => void;
}

export function PlayerBox({ player, isConflict, isSelected, isEditing, onTap }: PlayerBoxProps) {
    if (!player) {
        return <View style={styles.emptyBox} />;
    }

    const genderStr = (player.gender || '').toLowerCase();
    const isFemale = genderStr.startsWith('f');

    // Determine background color
    let bg = isFemale ? '#ffc0cb' : '#add8e6'; // pink or blue
    let txt = '#1b3358';

    if (isConflict) {
        bg = '#ffcccc'; // Light red for conflicts
    }
    if (isEditing) {
        bg = '#fff3cd'; // Yellow for editing
    }

    return (
        <TouchableOpacity
            style={[
                styles.playerBox,
                { backgroundColor: bg },
                isSelected && styles.selectedBox
            ]}
            onPress={onTap}
            activeOpacity={0.7}
        >
            <Text style={[styles.pText, { color: txt }]} numberOfLines={1}>
                {player.first_name}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    playerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 4
    },
    selectedBox: {
        borderWidth: 3,
        borderColor: '#1b3358'
    },
    emptyBox: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 6
    },
    pText: {
        fontWeight: '700',
        fontSize: 16
    }
});
