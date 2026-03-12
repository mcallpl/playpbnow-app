import React, { useMemo, useState } from 'react';
import { BrandedIcon } from './BrandedIcon';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

export const TrialBanner: React.FC = () => {
    const { isTrial, isFree, isAdmin, trialDaysRemaining, showPaywall, subscription } = useSubscription();
    const [dismissed, setDismissed] = useState(false);
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    if (dismissed || isAdmin) return null;

    // Show trial banner during active trial
    if (isTrial && trialDaysRemaining > 0) {
        const isUrgent = trialDaysRemaining <= 3;
        return (
            <View style={[styles.banner, isUrgent ? styles.urgentBanner : styles.trialBanner]}>
                <View style={styles.bannerContent}>
                    <BrandedIcon name={isUrgent ? 'flash' : 'star'} size={18} color={colors.text} />
                    <Text style={styles.bannerText}>
                        {isUrgent
                            ? `Trial ending in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'}!`
                            : `Pro Trial \u2014 ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining`}
                    </Text>
                    <TouchableOpacity style={styles.subscribeBtn} onPress={() => showPaywall('Your Pro trial includes all premium features!')}>
                        <Text style={styles.subscribeBtnText}>Learn More</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setDismissed(true)}>
                    <BrandedIcon name="close" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </View>
        );
    }

    // Show expired trial / free tier nudge
    if (isFree && subscription?.trialExpired) {
        return (
            <View style={[styles.banner, styles.expiredBanner]}>
                <View style={styles.bannerContent}>
                    <BrandedIcon name="lock" size={16} color={colors.text} />
                    <Text style={styles.bannerText}>Your trial has ended</Text>
                    <TouchableOpacity style={styles.subscribeBtn} onPress={() => showPaywall('Upgrade to Pro to unlock all features!')}>
                        <Text style={styles.subscribeBtnText}>Upgrade</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setDismissed(true)}>
                    <BrandedIcon name="close" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </View>
        );
    }

    return null;
};

const createStyles = (c: ThemeColors) => StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginHorizontal: 15,
        marginTop: 10,
        borderRadius: 12,
    },
    trialBanner: {
        backgroundColor: c.accent,
    },
    urgentBanner: {
        backgroundColor: '#ff6b35',
    },
    expiredBanner: {
        backgroundColor: c.danger,
    },
    bannerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bannerText: {
        color: c.text,
        fontFamily: FONT_BODY_BOLD,
        fontSize: 13,
        flex: 1,
    },
    subscribeBtn: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    subscribeBtnText: {
        color: c.text,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        fontSize: 12,
    },
    dismissBtn: {
        padding: 4,
        marginLeft: 4,
    },
});
