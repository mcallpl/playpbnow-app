import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
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

                    {/* Trial / Coming Soon Info */}
                    <View style={styles.infoBox}>
                        {isTrial && trialDaysRemaining > 0 ? (
                            <>
                                <Ionicons name="star" size={20} color="#87ca37" />
                                <Text style={styles.infoText}>
                                    You're enjoying a free <Text style={styles.infoBold}>{trialDaysRemaining}-day Pro trial</Text>! All features are unlocked.
                                </Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="rocket" size={20} color="#87ca37" />
                                <Text style={styles.infoText}>
                                    Pro subscriptions coming soon! Stay tuned for premium features.
                                </Text>
                            </>
                        )}
                    </View>

                    {/* Got It Button */}
                    <TouchableOpacity style={styles.gotItBtn} onPress={hidePaywall} activeOpacity={0.8}>
                        <Text style={styles.gotItBtnText}>Got It</Text>
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
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fae5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(135, 202, 55, 0.3)',
    },
    infoText: {
        flex: 1,
        color: '#555',
        fontSize: 14,
        lineHeight: 20,
    },
    infoBold: {
        fontWeight: '800',
        color: '#1b3358',
    },
    gotItBtn: {
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
    gotItBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    },
});
