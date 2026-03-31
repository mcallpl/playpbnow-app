import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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

const isWeb = Platform.OS === 'web';

export const PaywallModal: React.FC = () => {
    const {
        paywallVisible, paywallMessage, hidePaywall,
        isTrial, trialDaysRemaining, isPro,
        offerings, offeringsLoading, offeringsError, retryLoadOfferings,
        purchaseSubscription, restorePurchases, purchaseLoading,
        purchaseViaStripe, redeemPromoCode,
    } = useSubscription();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [promoCode, setPromoCode] = useState('');
    const [showPromoInput, setShowPromoInput] = useState(false);

    const monthlyPrice = offerings.monthly?.product?.priceString || '$4.99';
    const annualPrice = offerings.annual?.product?.priceString || '$29.99';
    const annualMonthly = offerings.annual?.product?.price
        ? `$${(offerings.annual.product.price / 12).toFixed(2)}/mo`
        : '$2.50/mo';

    const handlePurchaseMonthly = async () => {
        if (isWeb) {
            await purchaseViaStripe('monthly');
            return;
        }
        if (!offerings.monthly) return;
        const success = await purchaseSubscription(offerings.monthly);
        if (success) hidePaywall();
    };

    const handlePurchaseAnnual = async () => {
        if (isWeb) {
            await purchaseViaStripe('annual');
            return;
        }
        if (!offerings.annual) return;
        const success = await purchaseSubscription(offerings.annual);
        if (success) hidePaywall();
    };

    const handleRestore = async () => {
        const success = await restorePurchases();
        if (success) hidePaywall();
    };

    const handleRedeemPromo = async () => {
        if (!promoCode.trim()) return;
        const success = await redeemPromoCode(promoCode.trim());
        if (success) {
            setPromoCode('');
            setShowPromoInput(false);
            hidePaywall();
        }
    };

    return (
        <Modal visible={paywallVisible} transparent animationType="slide" onRequestClose={hidePaywall}>
            <View style={styles.overlay}>
                <View style={styles.containerWrapper}>
                    {/* Close Button — outside ScrollView so it stays fixed */}
                    <TouchableOpacity style={styles.closeBtn} onPress={hidePaywall}>
                        <BrandedIcon name="close" size={24} color={colors.textMuted} />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={styles.containerContent} bounces={false} showsVerticalScrollIndicator={false}>
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
                            {/* Loading offerings */}
                            {!isWeb && offeringsLoading && (
                                <View style={styles.offeringsStatus}>
                                    <ActivityIndicator color={colors.accent} size="small" />
                                    <Text style={styles.offeringsStatusText}>Loading subscription options...</Text>
                                </View>
                            )}

                            {/* Error loading offerings */}
                            {!isWeb && offeringsError && !offeringsLoading && (
                                <View style={styles.offeringsStatus}>
                                    <Text style={styles.offeringsErrorText}>Unable to load subscription options.</Text>
                                    <TouchableOpacity style={styles.retryBtn} onPress={retryLoadOfferings} activeOpacity={0.8}>
                                        <Text style={styles.retryBtnText}>Tap to Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Annual — Best Value */}
                            {(isWeb || (!offeringsLoading && !offeringsError)) && (
                            <TouchableOpacity
                                style={[styles.purchaseBtn, styles.purchaseBtnAnnual]}
                                onPress={handlePurchaseAnnual}
                                disabled={purchaseLoading || (!isWeb && !offerings.annual)}
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
                            )}

                            {/* Monthly */}
                            {(isWeb || (!offeringsLoading && !offeringsError)) && (
                            <TouchableOpacity
                                style={[styles.purchaseBtn, styles.purchaseBtnMonthly]}
                                onPress={handlePurchaseMonthly}
                                disabled={purchaseLoading || (!isWeb && !offerings.monthly)}
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
                            )}

                            {/* Promo Code — web only (Apple guideline 3.1.1) */}
                            {isWeb && (
                                !showPromoInput ? (
                                    <TouchableOpacity style={styles.restoreBtn} onPress={() => setShowPromoInput(true)}>
                                        <Text style={styles.restoreBtnText}>Have a promo code?</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.promoRow}>
                                        <TextInput
                                            style={styles.promoInput}
                                            placeholder="Enter code"
                                            placeholderTextColor={colors.textMuted}
                                            value={promoCode}
                                            onChangeText={setPromoCode}
                                            autoCapitalize="characters"
                                            onSubmitEditing={handleRedeemPromo}
                                        />
                                        <TouchableOpacity style={styles.promoBtn} onPress={handleRedeemPromo} disabled={purchaseLoading}>
                                            <Text style={styles.promoBtnText}>REDEEM</Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            )}
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

                    {/* Restore Purchases (native only) */}
                    {!isPro && !isWeb && (
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
                    {/* Auto-Renewable Subscription Terms */}
                    {!isPro && (
                        <View style={styles.legalSection}>
                            <Text style={styles.legalText}>
                                {isWeb
                                    ? 'Payment is processed securely via Stripe. Subscription automatically renews unless canceled. You can manage your subscription from your account settings.'
                                    : 'Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your App Store account settings after purchase.'}
                            </Text>
                            {isTrial && trialDaysRemaining > 0 && (
                                <Text style={styles.legalText}>
                                    Any unused portion of a free trial period will be forfeited when you purchase a subscription.
                                </Text>
                            )}
                            <View style={styles.legalLinks}>
                                <TouchableOpacity onPress={() => Linking.openURL('https://peoplestar.com/PlayPBNow/api/privacy.html')}>
                                    <Text style={styles.legalLink}>Privacy Policy</Text>
                                </TouchableOpacity>
                                <Text style={styles.legalDivider}>|</Text>
                                <TouchableOpacity onPress={() => Linking.openURL('https://peoplestar.com/PlayPBNow/api/terms.html')}>
                                    <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    </ScrollView>
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
    containerWrapper: {
        backgroundColor: c.modalBg,
        borderRadius: 24,
        maxHeight: '90%',
        overflow: 'hidden',
    },
    containerContent: {
        padding: 25,
        paddingTop: 45,
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
    legalSection: {
        marginTop: 10,
        paddingHorizontal: 4,
    },
    legalText: {
        fontSize: 10,
        color: c.textMuted,
        textAlign: 'center',
        lineHeight: 14,
        marginBottom: 6,
        fontFamily: FONT_BODY_REGULAR,
    },
    legalLinks: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 2,
    },
    legalLink: {
        fontSize: 11,
        color: c.textMuted,
        textDecorationLine: 'underline' as const,
        fontFamily: FONT_BODY_REGULAR,
    },
    legalDivider: {
        fontSize: 11,
        color: c.textMuted,
    },
    offeringsStatus: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 10,
    },
    offeringsStatusText: {
        fontFamily: FONT_BODY_MEDIUM,
        fontSize: 13,
        color: c.textMuted,
    },
    offeringsErrorText: {
        fontFamily: FONT_BODY_MEDIUM,
        fontSize: 14,
        color: c.textMuted,
        textAlign: 'center',
    },
    retryBtn: {
        backgroundColor: c.accent,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
    },
    retryBtnText: {
        fontFamily: FONT_DISPLAY_BOLD,
        fontSize: 14,
        color: '#ffffff',
    },
    promoRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    promoInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: c.text,
        fontFamily: FONT_BODY_MEDIUM,
        fontSize: 14,
        backgroundColor: c.surfaceLight,
    },
    promoBtn: {
        backgroundColor: c.accent,
        borderRadius: 10,
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    promoBtnText: {
        fontFamily: FONT_DISPLAY_BOLD,
        fontSize: 13,
        color: '#ffffff',
        letterSpacing: 0.5,
    },
});
