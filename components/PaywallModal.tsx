import React, { useMemo } from 'react';
import { BrandedIcon } from './BrandedIcon';
import {
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

const BENEFITS = [
    { icon: 'document', title: 'Clean HD Match Reports', desc: 'No watermark on your professional reports' },
    { icon: 'players', title: 'Unlimited Collab Sessions', desc: 'Real-time scoring with unlimited collaborators' },
    { icon: 'layers', title: 'Unlimited Groups', desc: 'Create as many pickleball groups as you want' },
    { icon: 'stats-chart', title: 'Match History & Stats', desc: 'Track wins, losses, and player performance' },
    { icon: 'headset', title: 'Priority Support', desc: 'Get help when you need it' },
];

export const PaywallModal: React.FC = () => {
    const { paywallVisible, paywallMessage, hidePaywall, isTrial, trialDaysRemaining } = useSubscription();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <Modal visible={paywallVisible} transparent animationType="slide" onRequestClose={hidePaywall}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={hidePaywall}>
                        <BrandedIcon name="close" size={24} color={colors.textMuted} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/images/PPBN-Logo-SMALL.png')}
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
                                    <BrandedIcon name="checkmark" size={14} color={colors.text} />
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
                                <BrandedIcon name="star" size={20} color={colors.accent} />
                                <Text style={styles.infoText}>
                                    You're enjoying a free <Text style={styles.infoBold}>{trialDaysRemaining}-day Pro trial</Text>! All features are unlocked.
                                </Text>
                            </>
                        ) : (
                            <>
                                <BrandedIcon name="rocket" size={20} color={colors.accent} />
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

const createStyles = (c: ThemeColors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: c.modalOverlay,
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: c.modalBg,
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
        backgroundColor: c.accent,
        color: c.text,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        fontSize: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        overflow: 'hidden',
        letterSpacing: 1,
    },
    message: {
        textAlign: 'center',
        color: c.textMuted,
        fontSize: 14,
        marginBottom: 15,
        lineHeight: 20,
        fontFamily: FONT_BODY_REGULAR,
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
        backgroundColor: c.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    benefitText: {
        flex: 1,
    },
    benefitTitle: {
        fontFamily: FONT_BODY_BOLD,
        color: c.text,
        fontSize: 14,
    },
    benefitDesc: {
        color: c.textMuted,
        fontSize: 12,
        marginTop: 1,
        fontFamily: FONT_BODY_REGULAR,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.accentSoft,
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        gap: 12,
        borderWidth: 1,
        borderColor: c.accentGlow,
    },
    infoText: {
        flex: 1,
        color: c.textSoft,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: FONT_BODY_REGULAR,
    },
    infoBold: {
        fontFamily: FONT_BODY_BOLD,
        color: c.text,
    },
    gotItBtn: {
        backgroundColor: c.accent,
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        elevation: 4,
        shadowColor: c.accent,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    gotItBtnText: {
        color: c.text,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        fontSize: 16,
        letterSpacing: 0.5,
    },
});
