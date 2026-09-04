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

    // Trial not started yet: the clock begins on the first saved match, so
    // showing "30 days remaining" here would imply it is already counting down.
    const trialStarted = subscription?.trialStarted ?? true;
    // Ink for the green (accent) banner: the theme's dark accentText, which
    // clears 7:1 on the accent in both themes. `text` was white-on-green in
    // dark mode (about 2.6:1). Urgent/expired banners are red/orange fills and
    // keep white ink.
    const onAccent = colors.accentText;
    if (isTrial && !trialStarted) {
        return (
            <View style={[styles.banner, styles.trialBanner]}>
                <View style={styles.bannerContent}>
                    <BrandedIcon name="star" size={18} color={onAccent} />
                    <Text style={[styles.bannerText, { color: onAccent }]}>
                        {`Pro Trial \u2014 your ${trialDaysRemaining} days start with your first saved match`}
                    </Text>
                    <TouchableOpacity style={[styles.subscribeBtn, styles.subscribeBtnOnAccent]} onPress={() => showPaywall('Your Pro trial includes all premium features!')}>
                        <Text style={[styles.subscribeBtnText, { color: onAccent }]}>Learn More</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setDismissed(true)}>
                    <BrandedIcon name="close" size={16} color={onAccent} />
                </TouchableOpacity>
            </View>
        );
    }

    // Show trial banner during active trial
    if (isTrial && trialDaysRemaining > 0) {
        const isUrgent = trialDaysRemaining <= 3;
        const ink = isUrgent ? '#ffffff' : onAccent;
        return (
            <View style={[styles.banner, isUrgent ? styles.urgentBanner : styles.trialBanner]}>
                <View style={styles.bannerContent}>
                    <BrandedIcon name={isUrgent ? 'flash' : 'star'} size={18} color={ink} />
                    <Text style={[styles.bannerText, { color: ink }]}>
                        {isUrgent
                            ? `Trial ending in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'}!`
                            : `Pro Trial \u2014 ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining`}
                    </Text>
                    <TouchableOpacity style={[styles.subscribeBtn, !isUrgent && styles.subscribeBtnOnAccent]} onPress={() => showPaywall('Your Pro trial includes all premium features!')}>
                        <Text style={[styles.subscribeBtnText, { color: ink }]}>{isUrgent ? 'Subscribe' : 'Learn More'}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setDismissed(true)}>
                    <BrandedIcon name="close" size={16} color={isUrgent ? 'rgba(255,255,255,0.85)' : onAccent} />
                </TouchableOpacity>
            </View>
        );
    }

    // Show expired trial / free tier nudge
    if (isFree && subscription?.trialExpired) {
        return (
            <View style={[styles.banner, styles.expiredBanner]}>
                <View style={styles.bannerContent}>
                    <BrandedIcon name="lock" size={16} color="#ffffff" />
                    <Text style={[styles.bannerText, { color: '#ffffff' }]}>Your trial has ended</Text>
                    <TouchableOpacity style={styles.subscribeBtn} onPress={() => showPaywall('Upgrade to Pro to unlock all features!')}>
                        <Text style={[styles.subscribeBtnText, { color: '#ffffff' }]}>Upgrade</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setDismissed(true)}>
                    <BrandedIcon name="close" size={16} color="rgba(255,255,255,0.85)" />
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
    // On the green banner a translucent WHITE pill lightens the fill under
    // dark ink; a translucent dark pill keeps the ink readable.
    subscribeBtnOnAccent: {
        backgroundColor: 'rgba(0,0,0,0.12)',
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
