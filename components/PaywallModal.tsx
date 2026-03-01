import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { FONT_BODY_BOLD, FONT_BODY_MEDIUM, FONT_BODY_REGULAR, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, ThemeColors } from '../constants/theme';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { BrandedIcon } from './BrandedIcon';

const BENEFITS = [
    { icon: 'document', title: 'Clean HD Match Reports', desc: 'No watermark on your professional reports' },
    { icon: 'players', title: 'Unlimited Collab Sessions', desc: 'Real-time scoring with unlimited collaborators' },
    { icon: 'layers', title: 'Unlimited Groups', desc: 'Create as many pickleball groups as you want' },
    { icon: 'stats-chart', title: 'Match History & Stats', desc: 'Track wins, losses, and player performance' },
    { icon: 'headset', title: 'Priority Support', desc: 'Get help when you need it' },
];

export const PaywallModal: React.FC = () => {
    const {
        paywallVisible, paywallMessage, hidePaywall,
        isTrial, trialDaysRemaining, isPro,
        offerings, purchaseSubscription, restorePurchases, purchaseLoading,
    } = useSubscription();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const monthlyPrice = offerings.monthly?.product?.priceString || '$4.99';
    const annualPrice = offerings.annual?.product?.priceString || '$29.99';
    const annualMonthly = offerings.annual?.product?.price
        ? `$${(offerings.annual.product.price / 12).toFixed(2)}/mo`
        : '$2.50/mo';

    const handlePurchaseMonthly = async () => {
        if (!offerings.monthly) return;
        const success = await purchaseSubscription(offerings.monthly);
        if (success) hidePaywall();
    };

    const handlePurchaseAnnual = async () => {
        if (!offerings.annual) return;
        const success = await purchaseSubscription(offerings.annual);
        if (success) hidePaywall();
    };

    const handleRestore = async () => {
        const success = await restorePurchases();
        if (success) hidePaywall();
    };

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

                    {/* Trial Info */}
                    {isTrial && trialDaysRemaining > 0 && (
                        <View style={styles.infoBox}>
                            <BrandedIcon name="star" size={20} color={colors.accent} />
                            <Text style={styles.infoText}>
                                You're enjoying a free <Text style={styles.infoBold}>{trialDaysRemaining}-day Pro trial</Text>! Subscribe now to keep all features.
                            </Text>
                        </View>
                    )}

                    {/* Purchase Buttons */}
                    {!isPro && (
                        <View style={styles.purchaseSection}>
                            {/* Annual — Best Value */}
                            <TouchableOpacity
                                style={[styles.purchaseBtn, styles.purchaseBtnAnnual]}
                                onPress={handlePurchaseAnnual}
                                disabled={purchaseLoading || !offerings.annual}
                                activeOpacity={0.8}
                            >
                                {purchaseLoading ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <>
                                        <View style={styles.bestValueBadge}>
                                            <Text style={styles.bestValueText}>BEST VALUE</Text>
                                        </View>
                                        <Text style={styles.purchaseBtnTitle}>Annual</Text>
                                        <Text style={styles.purchaseBtnPrice}>{annualPrice}/year</Text>
                                        <Text style={styles.purchaseBtnSub}>{annualMonthly} — Save 50%</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Monthly */}
                            <TouchableOpacity
                                style={[styles.purchaseBtn, styles.purchaseBtnMonthly]}
                                onPress={handlePurchaseMonthly}
                                disabled={purchaseLoading || !offerings.monthly}
                                activeOpacity={0.8}
                            >
                                {purchaseLoading ? (
                                    <ActivityIndicator color={colors.text} />
                                ) : (
                                    <>
                                        <Text style={styles.purchaseBtnTitleMonthly}>Monthly</Text>
                                        <Text style={styles.purchaseBtnPriceMonthly}>{monthlyPrice}/month</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Already Pro */}
                    {isPro && (
                        <View style={styles.infoBox}>
                            <BrandedIcon name="confirm" size={20} color={colors.accent} />
                            <Text style={styles.infoText}>
                                You're a <Text style={styles.infoBold}>Pro member</Text>! All features are unlocked.
                            </Text>
                        </View>
                    )}

                    {/* Restore Purchases */}
                    {!isPro && (
                        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={purchaseLoading}>
                            <Text style={styles.restoreBtnText}>Restore Purchases</Text>
                        </TouchableOpacity>
                    )}

                    {/* Dismiss */}
                    {isPro && (
                        <TouchableOpacity style={styles.gotItBtn} onPress={hidePaywall} activeOpacity={0.8}>
                            <Text style={styles.gotItBtnText}>Got It</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {/* Legal Links — REQUIRED for Apple Approval */}
                {!isPro && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 10 }}>
                        <TouchableOpacity onPress={() => Linking.openURL('https://peoplestar.com/privacy')}>
                            <Text style={{ fontSize: 11, color: colors.textMuted, textDecorationLine: 'underline' }}>Privacy Policy</Text>
                        </TouchableOpacity>
                        
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>|</Text>

                        <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                            <Text style={{ fontSize: 11, color: colors.textMuted, textDecorationLine: 'underline' }}>Terms of Use (EULA)</Text>
                        </TouchableOpacity>
                    </View>
                )}
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
        marginBottom: 16,
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
    purchaseSection: {
        gap: 10,
        marginBottom: 12,
    },
    purchaseBtn: {
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    purchaseBtnAnnual: {
        backgroundColor: c.accent,
        elevation: 4,
        shadowColor: c.accent,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    purchaseBtnMonthly: {
        backgroundColor: c.surfaceLight,
        borderWidth: 1,
        borderColor: c.border,
    },
    bestValueBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FFD23F',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderBottomLeftRadius: 8,
    },
    bestValueText: {
        fontFamily: FONT_DISPLAY_BOLD,
        fontSize: 10,
        color: '#000000',
        letterSpacing: 0.5,
    },
    purchaseBtnTitle: {
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        fontSize: 18,
        color: '#ffffff',
    },
    purchaseBtnPrice: {
        fontFamily: FONT_BODY_BOLD,
        fontSize: 15,
        color: '#ffffff',
        marginTop: 2,
    },
    purchaseBtnSub: {
        fontFamily: FONT_BODY_REGULAR,
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    purchaseBtnTitleMonthly: {
        fontFamily: FONT_DISPLAY_BOLD,
        fontSize: 16,
        color: c.text,
    },
    purchaseBtnPriceMonthly: {
        fontFamily: FONT_BODY_MEDIUM,
        fontSize: 14,
        color: c.textMuted,
        marginTop: 2,
    },
    restoreBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    restoreBtnText: {
        fontFamily: FONT_BODY_MEDIUM,
        fontSize: 13,
        color: c.textMuted,
        textDecorationLine: 'underline',
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
