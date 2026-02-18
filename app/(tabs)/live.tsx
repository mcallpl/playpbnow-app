import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveMatch } from '../../context/ActiveMatchContext';

export default function LiveTab() {
    const { activeMatch } = useActiveMatch();
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            if (activeMatch) {
                // Small delay to let the tab finish rendering before navigating
                const timer = setTimeout(() => {
                    router.push({
                        pathname: '/(tabs)/game',
                        params: {
                            schedule: JSON.stringify(activeMatch.schedule),
                            players: JSON.stringify(activeMatch.players),
                            groupName: activeMatch.groupName,
                            groupKey: activeMatch.groupKey || '',
                            courtName: activeMatch.courtName || '',
                            ...(activeMatch.shareCode ? {
                                shareCode: activeMatch.shareCode,
                                sessionId: activeMatch.sessionId,
                                isCollaborator: activeMatch.isOwner ? 'false' : 'true',
                            } : {}),
                        },
                    });
                }, 100);
                return () => clearTimeout(timer);
            }
        }, [activeMatch])
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.center}>
                {activeMatch ? (
                    <>
                        <ActivityIndicator size="large" color="#87ca37" />
                        <Text style={styles.loadingText}>Loading match...</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.emoji}>🏓</Text>
                        <Text style={styles.title}>No Active Match</Text>
                        <Text style={styles.sub}>Share a match schedule or start a collaborative session to keep your match available here.</Text>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    emoji: { fontSize: 48, marginBottom: 15 },
    title: { fontSize: 20, fontWeight: '900', color: '#1b3358', marginBottom: 8 },
    sub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
    loadingText: { color: '#1b3358', fontWeight: '700', marginTop: 12, fontSize: 14 },
});
