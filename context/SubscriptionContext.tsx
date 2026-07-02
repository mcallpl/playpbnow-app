import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import { Alert } from '@/utils/crossAlert';
import { PurchasesPackage } from 'react-native-purchases';
import {
    initializePurchases,
    identifyUser,
    getOfferings,
    purchasePackage,
    restorePurchases as restorePurchasesRC,
    getCustomerInfo,
    hasProEntitlement,
} from '../utils/purchases';
import {
    SubscriptionStateContext,
    SubscriptionData,
    SubscriptionFeatures,
    DEFAULT_FEATURES,
} from './SubscriptionStateContext';
import { SubscriptionDispatchContext } from './SubscriptionDispatchContext';

const isWeb = Platform.OS === 'web';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';
const STORAGE_KEY = 'subscription_data';

// Convenience hook that combines both contexts (for backwards compatibility)
export const useSubscription = () => {
    const state = useContext(SubscriptionStateContext);
    const dispatch = useContext(SubscriptionDispatchContext);
    return { ...state, ...dispatch };
};

const SubscriptionProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [paywallMessage, setPaywallMessage] = useState('');
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [offerings, setOfferings] = useState<{ monthly: PurchasesPackage | null; annual: PurchasesPackage | null }>({
        monthly: null,
        annual: null,
    });
    const [offeringsLoading, setOfferingsLoading] = useState(!isWeb);
    const [offeringsError, setOfferingsError] = useState(false);
    const rcInitialized = useRef(false);

    // Initialize RevenueCat and fetch offerings (skip on web).
    // Also serves as the retry function — re-attempts init if it previously failed.
    const initAndLoadOfferings = useCallback(async () => {
        if (isWeb) return;
        setOfferingsLoading(true);
        setOfferingsError(false);
        try {
            // Initialize RevenueCat if not already done
            if (!rcInitialized.current) {
                const userId = await AsyncStorage.getItem('user_id');
                await initializePurchases(userId || undefined);
                rcInitialized.current = true;

                if (userId) {
                    await identifyUser(userId);
                }
            }

            // Fetch offerings
            const offers = await getOfferings();
            const current = offers.current;
            if (current && (current.monthly || current.annual)) {
                setOfferings({
                    monthly: current.monthly,
                    annual: current.annual,
                });
            } else {
                // No current offering or no packages available
                setOfferingsError(true);
            }
        } catch (e) {
            console.error('RevenueCat init/offerings error:', e);
            setOfferingsError(true);
        }
        setOfferingsLoading(false);
    }, []);

    // Fetch subscription from your backend
    const fetchSubscription = useCallback(async () => {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) return;

            const response = await fetch(`${API_URL}/check_subscription.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
            });
            const data = await response.json();

            if (data.status === 'success') {
                const subData: SubscriptionData = {
                    tier: data.subscription.tier,
                    subscriptionStatus: data.subscription.subscriptionStatus,
                    expiryDate: data.subscription.expiryDate,
                    trialStartDate: data.subscription.trialStartDate,
                    trialDaysRemaining: data.subscription.trialDaysRemaining,
                    trialExpired: data.subscription.trialExpired,
                    isPro: data.subscription.isPro,
                    isAdmin: data.subscription.isAdmin ?? false,
                    features: {
                        canGenerateCleanReports: data.features.canGenerateCleanReports,
                        canEditMatches: data.features.canEditMatches,
                        canDeleteMatches: data.features.canDeleteMatches,
                        maxGroups: data.features.maxGroups,
                        maxCollabSessions: data.features.maxCollabSessions,
                        maxPlayersPerGroup: data.features.maxPlayersPerGroup,
                    },
                };
                setSubscription(subData);
                try {
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subData));
                } catch (storageError) {
                    console.error('Failed to cache subscription:', storageError);
                }
            }
        } catch (e) {
            console.error('Failed to fetch subscription:', e);
            // Fall back to cached data
            try {
                const cached = await AsyncStorage.getItem(STORAGE_KEY);
                if (cached && !subscription) {
                    setSubscription(JSON.parse(cached));
                }
            } catch (ce) {
                console.error('Failed to load cached subscription:', ce);
            }
        }
    }, []);

    // Load cached data on mount, then init RC and refresh from server
    useEffect(() => {
        (async () => {
            try {
                const cached = await AsyncStorage.getItem(STORAGE_KEY);
                if (cached) {
                    setSubscription(JSON.parse(cached));
                }
            } catch (e) {
                console.error('Failed to load cached subscription:', e);
            }
            // Initialize RevenueCat and load offerings
            await initAndLoadOfferings();
            // Refresh from server
            fetchSubscription();
        })();
    }, []);

    // Refresh subscription when app comes to foreground
    useEffect(() => {
        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                fetchSubscription();
            }
        };
        const sub = AppState.addEventListener('change', handleAppStateChange);
        return () => sub.remove();
    }, [fetchSubscription]);

    const isPro = useMemo(() => subscription?.isPro ?? false, [subscription?.isPro]);
    const isAdmin = useMemo(() => subscription?.isAdmin ?? false, [subscription?.isAdmin]);
    const isTrial = useMemo(() => subscription?.subscriptionStatus === 'trial', [subscription?.subscriptionStatus]);
    const isFree = useMemo(() => !isPro, [isPro]);
    const trialDaysRemaining = useMemo(() => subscription?.trialDaysRemaining ?? 0, [subscription?.trialDaysRemaining]);
    const features = useMemo(() => subscription?.features ?? DEFAULT_FEATURES, [subscription?.features]);

    const showPaywall = useCallback((message?: string) => {
        setPaywallMessage(message || 'Upgrade to Pro to unlock this feature!');
        setPaywallVisible(true);
        // Retry loading offerings if they previously failed
        if (!isWeb && offeringsError && !offeringsLoading) {
            initAndLoadOfferings();
        }
    }, [offeringsError, offeringsLoading, initAndLoadOfferings]);

    const hidePaywall = useCallback(() => {
        setPaywallVisible(false);
        setPaywallMessage('');
    }, []);

    const refreshSubscription = useCallback(async () => {
        await fetchSubscription();
    }, [fetchSubscription]);

    /**
     * Purchase a subscription package via RevenueCat/StoreKit.
     * Returns true on success, false on cancellation or failure.
     */
    const purchaseSubscription = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
        setPurchaseLoading(true);
        try {
            const customerInfo = await purchasePackage(pkg);
            if (!customerInfo) {
                // User cancelled
                setPurchaseLoading(false);
                return false;
            }

            if (hasProEntitlement(customerInfo)) {
                // Purchase succeeded — refresh from backend (webhook will have updated it)
                // Give webhook a moment to process
                await new Promise(resolve => setTimeout(resolve, 1500));
                await fetchSubscription();
                setPurchaseLoading(false);
                return true;
            }

            // Purchase completed but entitlement not active yet — refresh anyway
            await fetchSubscription();
            setPurchaseLoading(false);
            return true;
        } catch (e: any) {
            setPurchaseLoading(false);
            Alert.alert('Purchase Failed', e.message || 'Something went wrong. Please try again.');
            return false;
        }
    }, [fetchSubscription]);

    /**
     * Restore previous purchases via RevenueCat/StoreKit.
     * Returns true if pro entitlement was found.
     */
    const handleRestorePurchases = useCallback(async (): Promise<boolean> => {
        setPurchaseLoading(true);
        try {
            const customerInfo = await restorePurchasesRC();
            if (hasProEntitlement(customerInfo)) {
                await fetchSubscription();
                setPurchaseLoading(false);
                Alert.alert('Purchases Restored', 'Your Pro subscription has been restored!');
                return true;
            }
            setPurchaseLoading(false);
            Alert.alert('No Purchases Found', 'No active subscriptions were found for this account.');
            return false;
        } catch (e: any) {
            setPurchaseLoading(false);
            Alert.alert('Restore Failed', e.message || 'Could not restore purchases. Please try again.');
            return false;
        }
    }, [fetchSubscription]);

    // Stripe checkout for web
    const purchaseViaStripe = useCallback(async (plan: 'monthly' | 'annual') => {
        setPurchaseLoading(true);
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) {
                Alert.alert('Error', 'Please log in first.');
                setPurchaseLoading(false);
                return;
            }
            const response = await fetch(`${API_URL}/stripe_create_checkout.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, plan }),
            });
            if (!response.ok) {
                throw new Error(`Checkout API error: ${response.status}`);
            }
            const data = await response.json();
            if (data.checkout_url && typeof data.checkout_url === 'string' && data.checkout_url.startsWith('http')) {
                if (isWeb) {
                    window.location.href = data.checkout_url;
                } else {
                    Linking.openURL(data.checkout_url);
                }
            } else {
                Alert.alert('Error', data.message || 'Could not start checkout.');
            }
        } catch (e) {
            Alert.alert('Error', 'Network error. Please try again.');
        }
        setPurchaseLoading(false);
    }, []);

    // Redeem promo/bypass code (works on all platforms)
    const redeemPromoCode = useCallback(async (code: string): Promise<boolean> => {
        setPurchaseLoading(true);
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) {
                Alert.alert('Error', 'Please log in first.');
                setPurchaseLoading(false);
                return false;
            }
            const response = await fetch(`${API_URL}/stripe_create_checkout.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, plan: 'monthly', promo_code: code }),
            });
            const data = await response.json();
            if (data.bypass) {
                await fetchSubscription();
                setPurchaseLoading(false);
                Alert.alert('Welcome!', data.message || 'Pro activated!');
                return true;
            } else if (data.checkout_url) {
                if (isWeb) {
                    window.location.href = data.checkout_url;
                } else {
                    Linking.openURL(data.checkout_url);
                }
                setPurchaseLoading(false);
                return false;
            } else {
                Alert.alert('Invalid Code', data.message || 'Code not recognized.');
                setPurchaseLoading(false);
                return false;
            }
        } catch (e) {
            Alert.alert('Error', 'Network error. Please try again.');
            setPurchaseLoading(false);
            return false;
        }
    }, [fetchSubscription]);

    // Check for Stripe success redirect on web
    useEffect(() => {
        if (!isWeb) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('subscription') === 'success') {
            // Clear the URL param
            window.history.replaceState({}, '', window.location.pathname);
            // Refresh subscription after a short delay for webhook processing
            setTimeout(() => {
                fetchSubscription();
                Alert.alert('Success!', 'Your Pro subscription is now active!');
            }, 2000);
        }
    }, [fetchSubscription]);

    // Memoize state context value
    const stateValue = useMemo(() => ({
        subscription,
        isPro,
        isAdmin,
        isTrial,
        isFree,
        trialDaysRemaining,
        features,
    }), [subscription, isPro, isAdmin, isTrial, isFree, trialDaysRemaining, features]);

    // Memoize dispatch context value
    const dispatchValue = useMemo(() => ({
        paywallVisible,
        paywallMessage,
        showPaywall,
        hidePaywall,
        refreshSubscription,
        offerings,
        offeringsLoading,
        offeringsError,
        retryLoadOfferings: initAndLoadOfferings,
        purchaseSubscription,
        restorePurchases: handleRestorePurchases,
        purchaseLoading,
        purchaseViaStripe,
        redeemPromoCode,
    }), [
        paywallVisible,
        paywallMessage,
        showPaywall,
        hidePaywall,
        refreshSubscription,
        offerings,
        offeringsLoading,
        offeringsError,
        initAndLoadOfferings,
        purchaseSubscription,
        handleRestorePurchases,
        purchaseLoading,
        purchaseViaStripe,
        redeemPromoCode,
    ]);

    return (
        <SubscriptionStateContext.Provider value={stateValue}>
            <SubscriptionDispatchContext.Provider value={dispatchValue}>
                {children}
            </SubscriptionDispatchContext.Provider>
        </SubscriptionStateContext.Provider>
    );
};

export const SubscriptionProvider = React.memo(SubscriptionProviderComponent);
