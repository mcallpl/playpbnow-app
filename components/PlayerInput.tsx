import { BrandedIcon } from '../components/BrandedIcon';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

interface PlayerInputProps {
    onAddPlayer: (name: string, gender: 'male' | 'female') => void;
}

export function PlayerInput({ onAddPlayer }: PlayerInputProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [playerName, setPlayerName] = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const inputRef = useRef<TextInput>(null);

    const handleAdd = () => {
        if (playerName.trim()) {
            onAddPlayer(playerName.trim(), gender);
            setPlayerName('');
            // Keep focus on the input for rapid entry
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    return (
        <View style={styles.inputArea}>
            <View style={styles.inputRow}>
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={playerName}
                    onChangeText={setPlayerName}
                    placeholder="Enter Player Name"
                    placeholderTextColor={colors.inputPlaceholder}
                    onSubmitEditing={handleAdd}
                    returnKeyType="next"
                    blurOnSubmit={false}
                />
                <TouchableOpacity
                    style={[styles.genderBtn, gender === 'male' && styles.genderMale]}
                    onPress={() => setGender('male')}
                >
                    <BrandedIcon name="gender-male" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.genderBtn, gender === 'female' && styles.genderFemale]}
                    onPress={() => setGender('female')}
                >
                    <BrandedIcon name="gender-female" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                    <BrandedIcon name="add" size={32} color={colors.accent} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    inputArea: { padding: 15, backgroundColor: c.card, borderBottomWidth: 1, borderColor: c.border },
    inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    input: { flex: 1, backgroundColor: c.inputBg, borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16, fontFamily: FONT_BODY_REGULAR, borderWidth: 1, borderColor: c.border, color: c.inputText },
    genderBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.textMuted, justifyContent: 'center', alignItems: 'center' },
    genderMale: { backgroundColor: c.male },
    genderFemale: { backgroundColor: c.female },
    addBtn: { padding: 5 },
});
