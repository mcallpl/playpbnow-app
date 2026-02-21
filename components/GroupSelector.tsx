import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

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
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    if (selectedCount === 0) return null;

    return (
        <View style={styles.selectorContainer}>
            <View style={styles.header}>
                <Ionicons name="people" size={20} color={colors.secondary} />
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

const createStyles = (c: ThemeColors) => StyleSheet.create({
    selectorContainer: {
        position: 'absolute',
        bottom: 85,
        left: 0,
        right: 0,
        backgroundColor: c.card,
        padding: 15,
        paddingBottom: 20,
        borderTopWidth: 2,
        borderTopColor: c.secondary,
        shadowColor: '#000',
        shadowOpacity: 0.15,
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
        fontFamily: FONT_BODY_BOLD,
        color: c.text,
    },
    pickerContainer: {
        backgroundColor: c.inputBg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: 10,
    },
    picker: {
        height: 50,
        color: c.inputText,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
    },
    addBtn: {
        flex: 1,
        backgroundColor: c.secondary,
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
    },
    addBtnDisabled: {
        backgroundColor: c.textMuted,
    },
    addBtnText: {
        color: c.text,
        fontSize: 14,
        fontFamily: FONT_BODY_BOLD,
    },
    matchBtn: {
        flex: 1,
        backgroundColor: c.accent,
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
    },
    matchBtnText: {
        color: c.text,
        fontSize: 14,
        fontFamily: FONT_BODY_BOLD,
    },
});
