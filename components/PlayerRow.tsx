import { BrandedIcon } from '../components/BrandedIcon';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

export interface PlayerRowData {
    id: number;
    first_name: string;
    last_name?: string;
    gender: string;
    cell_phone?: string;
    dupr_rating?: number | null;
    wins?: number;
    losses?: number;
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
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const isFemale = player.gender?.toLowerCase().startsWith('f');

    return (
        <TouchableOpacity
            style={[styles.playerRow, isSelected && styles.playerRowSelected]}
            onPress={selectionMode ? onToggleSelect : undefined}
            activeOpacity={selectionMode ? 0.7 : 1}
        >
            {selectionMode && (
                <View style={styles.checkboxContainer}>
                    <BrandedIcon
                        name={isSelected ? 'checkbox' : 'checkbox-empty'}
                        size={24}
                        color={isSelected ? colors.secondary : colors.textMuted}
                    />
                </View>
            )}

            <View style={styles.playerInfo}>
                <View style={[styles.genderBadge, { backgroundColor: isFemale ? colors.female : colors.male }]}>
                    <Text style={styles.genderText}>{isFemale ? 'F' : 'M'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.playerName}>
                            {player.first_name} {player.last_name || ''}
                        </Text>
                        {((player.wins ?? 0) > 0 || (player.losses ?? 0) > 0) && (
                            <Text style={styles.wlText}>
                                ({player.wins ?? 0}W-{player.losses ?? 0}L)
                            </Text>
                        )}
                        {player.dupr_rating != null && player.dupr_rating > 0 && (
                            <View style={styles.duprBadge}>
                                <Text style={styles.duprText}>{Number(player.dupr_rating).toFixed(2)}</Text>
                            </View>
                        )}
                    </View>
                    {player.cell_phone && <Text style={styles.playerPhone}>{player.cell_phone}</Text>}
                </View>
            </View>

            {!selectionMode && (
                <View style={styles.actions}>
                    <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
                        <BrandedIcon name="edit" size={20} color={colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
                        <BrandedIcon name="trash" size={20} color={colors.danger} />
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    playerRow: {
        backgroundColor: c.card,
        padding: 15,
        borderRadius: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: c.border,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
    },
    playerRowSelected: {
        backgroundColor: c.accentSoft,
        borderWidth: 2,
        borderColor: c.secondary
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
        color: c.text,
        fontFamily: FONT_BODY_BOLD,
        fontSize: 14
    },
    playerName: {
        fontSize: 16,
        fontFamily: FONT_BODY_BOLD,
        color: c.text
    },
    playerPhone: {
        fontSize: 14,
        fontFamily: FONT_BODY_REGULAR,
        color: c.textMuted,
        marginTop: 2
    },
    wlText: {
        fontSize: 13,
        color: c.textSoft,
        fontFamily: FONT_BODY_SEMIBOLD,
    },
    duprBadge: {
        backgroundColor: c.surface,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    duprText: {
        color: c.accent,
        fontSize: 11,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
    },
    actions: {
        flexDirection: 'row',
        gap: 10
    },
    actionBtn: {
        padding: 8
    },
});
