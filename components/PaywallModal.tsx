import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';

const BENEFITS = [
    { icon: 'document-text' as const, title: 'Clean HD Match Reports', desc: 'No watermark on your professional reports' },
    { icon: 'people' as const, title: 'Unlimited Collab Sessions', desc: 'Real-time scoring with unlimited collaborators' },
    { icon: 'layers' as const, title: 'Unlimited Groups', desc: 'Create as many pickleball groups as you want' },
    { icon: 'stats-chart' as const, title: 'Match History & Stats', desc: 'Track wins, losses, and player performance' },
    { icon: 'headset' as const, title: 'Priority Support', desc: 'Get help when you need it' },
];

export const PaywallModal: React.FC = () => {
    const { paywallVisible, paywallMessage, hidePaywall, isTrial, trialDaysRemaining } = useSubscription();
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

    const handlePurchase = () => {
        if (isTrial && trialDaysRemaining > 0) {
            Alert.alert(
                'Pro Trial Active',
                `You're enjoying a free ${trialDaysRemaining}-day Pro trial! All features are unlocked. You can subscribe anytime before your trial ends.`,
                [{ text: 'Got it!', onPress: hidePaywall }]
            );
        } else {
            Alert.alert(
                'Coming Soon',
                'In-app purchases are coming soon! For now, enjoy all features during your trial period.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleRestore = () => {
        Alert.alert('Restore Purchases', 'Purchase restoration will be available once in-app purchases are enabled.', [{ text: 'OK' }]);
    };

    return (
        <Modal visible={paywallVisible} transparent animationType="slide" onRequestClose={hidePaywall}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={hidePaywall}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/images/PlayPBNow-Logo-SMALL.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.proLabel}>PRO</Text>
                    </View>

                    {/* Message */}
                    {paywallMessage ? (
                        <Text style={styles.message}>{paywallMessage}</Text>
                    ) : null}

                    {/* Benefits */}
                    <View style={styles.benefits}>
                        {BENEFITS.map((b, i) => (
                            <View key={i} style={styles.benefitRow}>
                                <View style={styles.checkCircle}>
                                    <Ionicons name="checkmark" size={14} color="white" />
                                </View>
                                <View style={styles.benefitText}>
                                    <Text style={styles.benefitTitle}>{b.title}</Text>
                                    <Text style={styles.benefitDesc}>{b.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Plan Toggle */}
                    <View style={styles.planToggle}>
                        <TouchableOpacity
                            style={[styles.planOption, selectedPlan === 'monthly' && styles.planSelected]}
                            onPress={() => setSelectedPlan('monthly')}
                        >
                            <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceSelected]}>$4.99</Text>
                            <Text style={[styles.planPeriod, selectedPlan === 'monthly' && styles.planPeriodSelected]}>per month</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.planOption, selectedPlan === 'annual' && styles.planSelected]}
                            onPress={() => setSelectedPlan('annual')}
                        >
                            <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>SAVE 33%</Text></View>
                            <Text style={[styles.planPrice, selectedPlan === 'annual' && styles.planPriceSelected]}>$39.99</Text>
                            <Text style={[styles.planPeriod, selectedPlan === 'annual' && styles.planPeriodSelected]}>per year</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Purchase Button */}
                    <TouchableOpacity style={styles.purchaseBtn} onPress={handlePurchase} activeOpacity={0.8}>
                        <Text style={styles.purchaseBtnText}>
                            {isTrial && trialDaysRemaining > 0
                                ? `Continue Free Trial (${trialDaysRemaining} days left)`
                                : `Subscribe — ${selectedPlan === 'monthly' ? '$4.99/mo' : '$39.99/yr'}`}
                        </Text>
                    </TouchableOpacity>

                    {/* Restore */}
                    <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
                        <Text style={styles.restoreText}>Restore Purchases</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 25,
        maxHeight: '90%',
    },
    closeBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
        padding: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        gap: 10,
    },
    logo: {
        height: 50,
        width: 140,
    },
    proLabel: {
        backgroundColor: '#87ca37',
        color: 'white',
        fontWeight: '900',
        fontSize: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        overflow: 'hidden',
        letterSpacing: 1,
    },
    message: {
        textAlign: 'center',
        color: '#666',
        fontSize: 14,
        marginBottom: 15,
        lineHeight: 20,
    },
    benefits: {
        marginBottom: 20,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#87ca37',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    benefitText: {
        flex: 1,
    },
    benefitTitle: {
        fontWeight: '800',
        color: '#1b3358',
        fontSize: 14,
    },
    benefitDesc: {
        color: '#888',
        fontSize: 12,
        marginTop: 1,
    },
    planToggle: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    planOption: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#eee',
        alignItems: 'center',
    },
    planSelected: {
        borderColor: '#87ca37',
        backgroundColor: '#f0fae5',
    },
    planPrice: {
        fontWeight: '900',
        fontSize: 22,
        color: '#333',
    },
    planPriceSelected: {
        color: '#1b3358',
    },
    planPeriod: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    planPeriodSelected: {
        color: '#1b3358',
    },
    saveBadge: {
        backgroundColor: '#ff6b35',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginBottom: 5,
    },
    saveBadgeText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 10,
        letterSpacing: 0.5,
    },
    purchaseBtn: {
        backgroundColor: '#87ca37',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#87ca37',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    purchaseBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    restoreBtn: {
        padding: 12,
        alignItems: 'center',
    },
    restoreText: {
        color: '#888',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
});
