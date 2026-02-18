import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// ✅ FIXED: Absolute import from Root
import { MatchRecord } from '@/hooks/useHeadToHead';

interface MatchCardProps {
    match: MatchRecord;
}

export function MatchCard({ match }: MatchCardProps) {
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

const styles = StyleSheet.create({
  card: { backgroundColor: '#2c3e50', padding: 12, borderRadius: 12, marginBottom: 12 },
  dateLabel: { color: '#bbb', fontWeight: 'bold', fontSize: 12, marginBottom: 8 },
  teamBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 4 },
  teamBlockBlue: { backgroundColor: 'rgba(52, 152, 219, 0.15)', borderLeftWidth: 4, borderLeftColor: '#3498db' },
  teamBlockRed: { backgroundColor: 'rgba(231, 76, 60, 0.15)', borderLeftWidth: 4, borderLeftColor: '#e74c3c' },
  teamNames: { flex: 1, marginRight: 10 },
  teamText: { color: '#eee', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  teamScore: { fontSize: 24, fontWeight: '900' },
  scoreWin: { color: '#87ca37' },
  scoreLose: { color: '#999', opacity: 0.7 },
});