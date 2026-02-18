import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Group {
    id: number;
    name: string;
}

interface GroupSelectorProps {
    groups: Group[];
    selectedGroupId: number | null;
    selectedCount: number;
    onSelectGroup: (groupId: number) => void;
    onAddToGroup: () => void;
    onCreateMatch: () => void;
}

export function GroupSelector({ groups, selectedGroupId, selectedCount, onSelectGroup, onAddToGroup, onCreateMatch }: GroupSelectorProps) {
    if (selectedCount === 0) return null;

    return (
        <View style={styles.selectorContainer}>
            <View style={styles.header}>
                <Ionicons name="people" size={20} color="#4a90e2" />
                <Text style={styles.headerText}>
                    {selectedCount} player{selectedCount > 1 ? 's' : ''} selected
                </Text>
            </View>

            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedGroupId}
                    onValueChange={(value) => onSelectGroup(value as number)}
                    style={styles.picker}
                >
                    <Picker.Item label="Select a group..." value={null} />
                    {groups.map(group => (
                        <Picker.Item 
                            key={group.id} 
                            label={group.name} 
                            value={group.id} 
                        />
                    ))}
                </Picker>
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity 
                    style={[styles.addBtn, !selectedGroupId && styles.addBtnDisabled]} 
                    onPress={onAddToGroup}
                    disabled={!selectedGroupId}
                >
                    <Text style={styles.addBtnText}>ADD TO GROUP</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.matchBtn} 
                    onPress={onCreateMatch}
                >
                    <Text style={styles.matchBtnText}>CREATE MATCH NOW</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    selectorContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 15,
        borderTopWidth: 2,
        borderTopColor: '#4a90e2',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    headerText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    pickerContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 10,
    },
    picker: {
        height: 50,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
    },
    addBtn: {
        flex: 1,
        backgroundColor: '#4a90e2',
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
    },
    addBtnDisabled: {
        backgroundColor: '#ccc',
    },
    addBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    matchBtn: {
        flex: 1,
        backgroundColor: '#87ca37',
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
    },
    matchBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
