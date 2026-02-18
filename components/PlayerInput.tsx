import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface PlayerInputProps {
    onAddPlayer: (name: string, gender: 'male' | 'female') => void;
}

export function PlayerInput({ onAddPlayer }: PlayerInputProps) {
    const [playerName, setPlayerName] = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('male');

    const handleAdd = () => {
        if (playerName.trim()) {
            onAddPlayer(playerName.trim(), gender);
            setPlayerName('');
        }
    };

    return (
        <View style={styles.inputArea}>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={playerName}
                    onChangeText={setPlayerName}
                    placeholder="Enter Player Name"
                    placeholderTextColor="#999"
                    onSubmitEditing={handleAdd}
                    returnKeyType="done"
                />
                <TouchableOpacity
                    style={[styles.genderBtn, gender === 'male' && styles.genderMale]}
                    onPress={() => setGender('male')}
                >
                    <Ionicons name="man" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.genderBtn, gender === 'female' && styles.genderFemale]}
                    onPress={() => setGender('female')}
                >
                    <Ionicons name="woman" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                    <Ionicons name="add-circle" size={32} color="#87ca37" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    inputArea: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
    genderBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
    genderMale: { backgroundColor: '#4a90e2' },
    genderFemale: { backgroundColor: '#ff69b4' },
    addBtn: { padding: 5 },
});
