import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { storeNavData } from '../../utils/navData';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveMatch } from '../../context/ActiveMatchContext';
import { useTheme } from '../../context/ThemeContext';
import {
    ThemeColors,
    FONT_DISPLAY_EXTRABOLD,
    FONT_BODY_REGULAR,
    FONT_BODY_BOLD,
} from '../../constants/theme';

export default function LiveTab() {
    const { activeMatch } = useActiveMatch();
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    useFocusEffect(
        useCallback(() => {
            if (activeMatch) {
                const timer = setTimeout(async () => {
                    const navId = await storeNavData({
                        schedule: activeMatch.schedule,
                        players: activeMatch.players,
                    });
                    router.push({
                        pathname: '/(tabs)/game',
                        params: {
                            navId,
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
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.loadingText}>Loading match...</Text>
                    </>
                ) : (
                    <>
                        <Image
                            source={require('../../assets/images/PPBN-Logo-SMALL.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>No Active Match</Text>
                        <Text style={styles.sub}>Share a match schedule or start a collaborative session to keep your match available here.</Text>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    logo: { width: 64, height: 64, marginBottom: 15 },
    title: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 20, color: c.text, marginBottom: 8 },
    sub: { fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
    loadingText: { fontFamily: FONT_BODY_BOLD, color: c.text, marginTop: 12, fontSize: 14 },
});
