import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const API_URL = 'https://peoplestar.com/Chipleball/api';
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
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [paywallMessage, setPaywallMessage] = useState('');

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

    // Load cached data on mount, then refresh from server
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
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};
