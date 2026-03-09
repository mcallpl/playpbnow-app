import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking, Platform } from 'react-native';
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

const isWeb = Platform.OS === 'web';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';
const STORAGE_KEY = 'subscription_data';

export interface SubscriptionFeatures {
    canGenerateCleanReports: boolean;
    canEditMatches: boolean;
    canDeleteMatches: boolean;
    maxGroups: number;
    maxCollabSessions: number;
    maxPlayersPerGroup: number;
}

export interface SubscriptionData {
    tier: 'free' | 'pro' | 'trial';
    subscriptionStatus: string;
    expiryDate: string | null;
    trialStartDate: string | null;
    trialDaysRemaining: number;
    trialExpired: boolean;
    isPro: boolean;
    features: SubscriptionFeatures;
}

interface SubscriptionContextType {
    subscription: SubscriptionData | null;
    isPro: boolean;
    isTrial: boolean;
    isFree: boolean;
    trialDaysRemaining: number;
    features: SubscriptionFeatures;
    paywallVisible: boolean;
    paywallMessage: string;
    showPaywall: (message?: string) => void;
    hidePaywall: () => void;
    refreshSubscription: () => Promise<void>;
    // RevenueCat methods (native)
    offerings: { monthly: PurchasesPackage | null; annual: PurchasesPackage | null };
    purchaseSubscription: (pkg: PurchasesPackage) => Promise<boolean>;
    restorePurchases: () => Promise<boolean>;
    purchaseLoading: boolean;
    // Stripe methods (web)
    purchaseViaStripe: (plan: 'monthly' | 'annual') => Promise<void>;
    redeemPromoCode: (code: string) => Promise<boolean>;
}

const DEFAULT_FEATURES: SubscriptionFeatures = {
    canGenerateCleanReports: false,
    canEditMatches: false,
    canDeleteMatches: false,
    maxGroups: 2,
    maxCollabSessions: 1,
    maxPlayersPerGroup: 100,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
    subscription: null,
    isPro: false,
    isTrial: false,
    isFree: true,
    trialDaysRemaining: 0,
    features: DEFAULT_FEATURES,
    paywallVisible: false,
    paywallMessage: '',
    showPaywall: () => {},
    hidePaywall: () => {},
    refreshSubscription: async () => {},
    offerings: { monthly: null, annual: null },
    purchaseSubscription: async () => false,
    restorePurchases: async () => false,
    purchaseLoading: false,
    purchaseViaStripe: async () => {},
    redeemPromoCode: async () => false,
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [paywallMessage, setPaywallMessage] = useState('');
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [offerings, setOfferings] = useState<{ monthly: PurchasesPackage | null; annual: PurchasesPackage | null }>({
        monthly: null,
        annual: null,
    });
    const rcInitialized = useRef(false);

    // Initialize RevenueCat and fetch offerings (skip on web)
    const initRC = useCallback(async () => {
        if (isWeb || rcInitialized.current) return;
        try {
            const userId = await AsyncStorage.getItem('user_id');
            await initializePurchases(userId || undefined);
            rcInitialized.current = true;

            // Identify user if we have an ID
            if (userId) {
                await identifyUser(userId);
            }

            // Fetch offerings
            const offers = await getOfferings();
            const current = offers.current;
            if (current) {
                setOfferings({
                    monthly: current.monthly,
                    annual: current.annual,
                });
            }
        } catch (e) {
            console.error('RevenueCat init error:', e);
        }
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
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subData));
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
            // Initialize RevenueCat
            await initRC();
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

    const isPro = subscription?.isPro ?? false;
    const isTrial = subscription?.subscriptionStatus === 'trial';
    const isFree = !isPro;
    const trialDaysRemaining = subscription?.trialDaysRemaining ?? 0;
    const features = subscription?.features ?? DEFAULT_FEATURES;

    const showPaywall = useCallback((message?: string) => {
        setPaywallMessage(message || 'Upgrade to Pro to unlock this feature!');
        setPaywallVisible(true);
    }, []);

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
            const data = await response.json();
            if (data.checkout_url) {
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

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            isPro,
            isTrial,
            isFree,
            trialDaysRemaining,
            features,
            paywallVisible,
            paywallMessage,
            showPaywall,
            hidePaywall,
            refreshSubscription,
            offerings,
            purchaseSubscription,
            restorePurchases: handleRestorePurchases,
            purchaseLoading,
            purchaseViaStripe,
            redeemPromoCode,
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};
