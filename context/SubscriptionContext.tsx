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

// Canonical host (same-origin on web, so the Bearer header never trips CORS).
// The legacy peoplestar.com/PlayPBNow/api path still serves the same PHP tree
// and utils/apiClient recognises both, so nothing else has to move.
const API_URL = 'https://playpbnow.com/api';
const STORAGE_KEY = 'subscription_data';

// The web build has NO checkout endpoint (stripe_create_checkout.php is a
// 404 live — Audit A C3). Until one exists, the web paywall explains where
// Pro is bought instead of promising a Stripe page that "Network error"s.
// Flip this on when a checkout endpoint ships; the code path below is kept.
const WEB_CHECKOUT_AVAILABLE = false;
export const WEB_PURCHASE_MESSAGE =
    "Pro is purchased in the PlayPBNow app on iPhone or Android. Your plan works everywhere once it's active.";

// After a StoreKit/Play purchase the RevenueCat webhook has to reach our
// server before check_subscription reports isPro. One 1.5s wait was a coin
// flip; poll a few times instead (Audit A M9).
const POST_PURCHASE_POLLS = 5;
const POST_PURCHASE_POLL_MS = 1500;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

    // Explicit RevenueCat identify for the login screen (Audit A C2). The mount
    // path above configures with whatever user_id is in storage — before a
    // login that is nobody, so RC minted an anonymous customer and the
    // webhook's app_user_id ("$RCAnonymousID:...") matched no users.id row.
    const identifyPurchasesUser = useCallback(async (userId: string) => {
        if (isWeb || !userId) return;
        try {
            if (!rcInitialized.current) {
                await initializePurchases(userId);
                rcInitialized.current = true;
            }
            await identifyUser(userId);
        } catch (e) {
            console.error('RevenueCat identify error (ignored):', e);
        }
    }, []);

    // Fetch subscription from your backend.
    // Returns the parsed data (or null) so callers such as the post-purchase
    // poll can inspect it without waiting for a React state round-trip.
    const fetchSubscription = useCallback(async (): Promise<SubscriptionData | null> => {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) return null;

            // The cache must NEVER cross accounts: if it was written for a
            // different user, drop it and reset state BEFORE fetching. (Bug:
            // an admin's cached subscription survived logging into another
            // account on the same device, exposing the ADMIN tab.)
            const cacheOwner = await AsyncStorage.getItem(`${STORAGE_KEY}_owner`);
            if (cacheOwner !== userId) {
                await AsyncStorage.removeItem(STORAGE_KEY);
                setSubscription(null);
            }

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
                    // Older API builds omit this; absent means "already started",
                    // which keeps the previous behaviour rather than showing every
                    // existing trial as unstarted.
                    trialStarted: data.subscription.trialStarted ?? true,
                    trialDaysRemaining: data.subscription.trialDaysRemaining,
                    trialExpired: data.subscription.trialExpired,
                    // The WIRE field `isPro` still means "paid or trialling" —
                    // the build in the App Store gates its features on it, so
                    // the server could not change its meaning. `isPaid` is the
                    // explicit paid-only flag; in THIS client `isPro` means
                    // paid, which is what lets the paywall offer a purchase to
                    // someone who is still in their trial.
                    isPro: data.subscription.isPaid ?? false,
                    // Older servers omit hasAccess; there isPro already meant
                    // "paid or trialling", so falling back to it keeps every
                    // existing gate exactly as it was.
                    hasAccess: data.subscription.hasAccess ?? data.subscription.isPro,
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
                    await AsyncStorage.setItem(`${STORAGE_KEY}_owner`, userId);
                } catch (storageError) {
                    console.error('Failed to cache subscription:', storageError);
                }
                return subData;
            }
        } catch (e) {
            console.error('Failed to fetch subscription:', e);
            // Fall back to cached data — only if it belongs to THIS user.
            try {
                const userId = await AsyncStorage.getItem('user_id');
                const cacheOwner = await AsyncStorage.getItem(`${STORAGE_KEY}_owner`);
                const cached = await AsyncStorage.getItem(STORAGE_KEY);
                if (cached && !subscription && userId && cacheOwner === userId) {
                    const parsed = JSON.parse(cached);
                    setSubscription(parsed);
                    return parsed;
                }
            } catch (ce) {
                console.error('Failed to load cached subscription:', ce);
            }
        }
        return null;
    }, []);

    // Load cached data on mount, then init RC and refresh from server
    useEffect(() => {
        (async () => {
            try {
                // Hydrate from cache ONLY when it belongs to the logged-in user
                // (a previous user's cached subscription must never leak in).
                const userId = await AsyncStorage.getItem('user_id');
                const cacheOwner = await AsyncStorage.getItem(`${STORAGE_KEY}_owner`);
                const cached = await AsyncStorage.getItem(STORAGE_KEY);
                if (cached && userId && cacheOwner === userId) {
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
    // Feature access = paid OR active trial OR admin. isFree derives from THIS,
    // not from isPro, so a trial user is neither "free" (no paywall on Pro
    // features) nor "pro" (still shown the purchase buttons) — Audit A H1.
    const hasAccess = useMemo(
        () => (subscription?.hasAccess ?? subscription?.isPro ?? false) || isAdmin,
        [subscription?.hasAccess, subscription?.isPro, isAdmin]
    );
    const isFree = useMemo(() => !hasAccess, [hasAccess]);
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
                // Purchase succeeded — refresh from backend (webhook will have updated it).
                // Poll rather than a single fixed wait: the webhook round-trip
                // is usually 1-3s but occasionally longer (Audit A M9).
                for (let attempt = 0; attempt < POST_PURCHASE_POLLS; attempt++) {
                    await sleep(POST_PURCHASE_POLL_MS);
                    const latest = await fetchSubscription();
                    if (latest?.isPro) break;
                }
                setPurchaseLoading(false);
                return true;
            }

            // Purchase completed but entitlement not active yet — refresh anyway
            await fetchSubscription();
            setPurchaseLoading(false);
            return true;
        } catch (e: any) {
            setPurchaseLoading(false);
            console.error('Purchase error:', e);
            Alert.alert(
                'Purchase Not Completed',
                "We couldn't complete that purchase. You have not been charged. Please try again in a moment."
            );
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
            console.error('Restore error:', e);
            Alert.alert(
                'Restore Not Completed',
                "We couldn't check your purchases right now. Please make sure you're signed in to the App Store or Google Play and try again."
            );
            return false;
        }
    }, [fetchSubscription]);

    // Stripe checkout for web ONLY. Native subscriptions go through StoreKit
    // (purchaseSubscription above); opening external checkout from the app is
    // an App Store 3.1.1 violation, so this hard-guards against any call path.
    const purchaseViaStripe = useCallback(async (plan: 'monthly' | 'annual') => {
        if (!isWeb) return;
        if (!WEB_CHECKOUT_AVAILABLE) {
            // No checkout endpoint exists on the web build yet — say so
            // instead of posting to a 404 (Audit A C3).
            Alert.alert('Get Pro in the App', WEB_PURCHASE_MESSAGE);
            return;
        }
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
                Alert.alert('Checkout Unavailable', data.message || "We couldn't start checkout right now. Please try again in a moment.");
            }
        } catch (e) {
            Alert.alert('Connection Problem', "We couldn't reach PlayPBNow. Please check your connection and try again.");
        }
        setPurchaseLoading(false);
    }, []);

    // Redeem promo/bypass code (works on all platforms)
    const redeemPromoCode = useCallback(async (code: string): Promise<boolean> => {
        if (isWeb && !WEB_CHECKOUT_AVAILABLE) {
            // The redeem endpoint is the same missing checkout script.
            Alert.alert('Get Pro in the App', WEB_PURCHASE_MESSAGE);
            return false;
        }
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
                // Stripe promo checkout is WEB ONLY (App Store 3.1.1): on
                // native, an unrecognized code is simply invalid — never open
                // an external payment page from the app.
                if (isWeb) {
                    window.location.href = data.checkout_url;
                } else {
                    Alert.alert('Invalid Code', 'Code not recognized.');
                }
                setPurchaseLoading(false);
                return false;
            } else {
                Alert.alert('Invalid Code', data.message || 'Code not recognized.');
                setPurchaseLoading(false);
                return false;
            }
        } catch (e) {
            Alert.alert('Connection Problem', "We couldn't reach PlayPBNow. Please check your connection and try again.");
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
        hasAccess,
        isAdmin,
        isTrial,
        isFree,
        trialDaysRemaining,
        features,
    }), [subscription, isPro, hasAccess, isAdmin, isTrial, isFree, trialDaysRemaining, features]);

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
        identifyPurchasesUser,
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
        identifyPurchasesUser,
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
