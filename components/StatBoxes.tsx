import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatBoxesProps {
    maleCount: number;
    femaleCount: number;
    totalCount: number;
}

export function StatBoxes({ maleCount, femaleCount, totalCount }: StatBoxesProps) {
    return (
        <View style={styles.statsRow}>
            <View style={styles.statBox}>
                <Text style={styles.statNumber}>{maleCount}</Text>
                <Text style={styles.statLabel}>Males</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statNumber}>{femaleCount}</Text>
                <Text style={styles.statLabel}>Females</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalCount}</Text>
                <Text style={styles.statLabel}>Total</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // YOUR EXACT STYLES - LOCKED IN!
    statsRow: { flexDirection: 'row', padding: 20, justifyContent: 'space-around', backgroundColor: '#2a4a6f' },
    statBox: { alignItems: 'center', flex: 1 },
    statNumber: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    statLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: -10, marginBottom: -5, fontWeight: '600', textTransform: 'uppercase' },
});
