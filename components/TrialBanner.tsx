import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';

export const TrialBanner: React.FC = () => {
    const { isTrial, isFree, trialDaysRemaining, showPaywall, subscription } = useSubscription();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    // Show trial banner during active trial
    if (isTrial && trialDaysRemaining > 0) {
        const isUrgent = trialDaysRemaining <= 3;
        return (
            <View style={[styles.banner, isUrgent ? styles.urgentBanner : styles.trialBanner]}>
                <View style={styles.bannerContent}>
                    <Ionicons name={isUrgent ? 'flash' : 'star'} size={18} color="white" />
                    <Text style={styles.bannerText}>
                        {isUrgent
                            ? `Trial ending in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'}!`
                            : `Pro Trial \u2014 ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining`}
                    </Text>
                    <TouchableOpacity style={styles.subscribeBtn} onPress={() => showPaywall('Subscribe now to keep all Pro features!')}>
                        <Text style={styles.subscribeBtnText}>Subscribe</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setDismissed(true)}>
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </View>
        );
    }

    // Show expired trial / free tier nudge
    if (isFree && subscription?.trialExpired) {
        return (
            <View style={[styles.banner, styles.expiredBanner]}>
                <View style={styles.bannerContent}>
                    <Ionicons name="lock-closed" size={16} color="white" />
                    <Text style={styles.bannerText}>Your trial has ended</Text>
                    <TouchableOpacity style={styles.subscribeBtn} onPress={() => showPaywall('Upgrade to Pro to get back all your premium features!')}>
                        <Text style={styles.subscribeBtnText}>Upgrade</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setDismissed(true)}>
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </View>
        );
    }

    return null;
};

const styles = StyleSheet.create({
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
        backgroundColor: '#87ca37',
    },
    urgentBanner: {
        backgroundColor: '#ff6b35',
    },
    expiredBanner: {
        backgroundColor: '#e74c3c',
    },
    bannerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bannerText: {
        color: 'white',
        fontWeight: '700',
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
        color: 'white',
        fontWeight: '900',
        fontSize: 12,
    },
    dismissBtn: {
        padding: 4,
        marginLeft: 4,
    },
});
