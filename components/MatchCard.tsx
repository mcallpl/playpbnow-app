import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';
// FIXED: Absolute import from Root
import { MatchRecord } from '@/hooks/useHeadToHead';

interface MatchCardProps {
    match: MatchRecord;
}

export function MatchCard({ match }: MatchCardProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const isT1Win = match.s1 > match.s2;
    const date = new Date(match.timestamp * 1000).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
    const label = match.label ? `${match.label} - ${date}` : date;

    return (
        <View style={styles.card}>
            <Text style={styles.dateLabel}>{label}</Text>

            <View style={[styles.teamBlock, styles.teamBlockBlue]}>
                <View style={styles.teamNames}>
                    <Text style={styles.teamText} numberOfLines={1}>{match.p1_name}</Text>
                    <Text style={styles.teamText} numberOfLines={1}>{match.p2_name}</Text>
                </View>
                <Text style={[styles.teamScore, isT1Win ? styles.scoreWin : styles.scoreLose]}>
                    {match.s1}
                </Text>
            </View>

            <View style={[styles.teamBlock, styles.teamBlockRed]}>
                <View style={styles.teamNames}>
                    <Text style={styles.teamText} numberOfLines={1}>{match.p3_name}</Text>
                    <Text style={styles.teamText} numberOfLines={1}>{match.p4_name}</Text>
                </View>
                <Text style={[styles.teamScore, !isT1Win ? styles.scoreWin : styles.scoreLose]}>
                    {match.s2}
                </Text>
            </View>
        </View>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    card: { backgroundColor: c.card, padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    dateLabel: { color: c.textSoft, fontFamily: FONT_BODY_BOLD, fontSize: 12, marginBottom: 8 },
    teamBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 4 },
    teamBlockBlue: { backgroundColor: c.accentSoft, borderLeftWidth: 4, borderLeftColor: c.male },
    teamBlockRed: { backgroundColor: c.accentSoft, borderLeftWidth: 4, borderLeftColor: c.danger },
    teamNames: { flex: 1, marginRight: 10 },
    teamText: { color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 15, marginBottom: 2 },
    teamScore: { fontSize: 24, fontFamily: FONT_DISPLAY_EXTRABOLD },
    scoreWin: { color: c.accent },
    scoreLose: { color: c.textMuted, opacity: 0.7 },
});
