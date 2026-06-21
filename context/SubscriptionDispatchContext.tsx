import React, { createContext, useContext } from 'react';
import { PurchasesPackage } from 'react-native-purchases';

interface SubscriptionDispatchContextType {
    paywallVisible: boolean;
    paywallMessage: string;
    showPaywall: (message?: string) => void;
    hidePaywall: () => void;
    refreshSubscription: () => Promise<void>;
    // RevenueCat methods (native)
    offerings: { monthly: PurchasesPackage | null; annual: PurchasesPackage | null };
    offeringsLoading: boolean;
    offeringsError: boolean;
    retryLoadOfferings: () => Promise<void>;
    purchaseSubscription: (pkg: PurchasesPackage) => Promise<boolean>;
    restorePurchases: () => Promise<boolean>;
    purchaseLoading: boolean;
    // Stripe methods (web)
    purchaseViaStripe: (plan: 'monthly' | 'annual') => Promise<void>;
    redeemPromoCode: (code: string) => Promise<boolean>;
}

export const SubscriptionDispatchContext = createContext<SubscriptionDispatchContextType>({
    paywallVisible: false,
    paywallMessage: '',
    showPaywall: () => {},
    hidePaywall: () => {},
    refreshSubscription: async () => {},
    offerings: { monthly: null, annual: null },
    offeringsLoading: false,
    offeringsError: false,
    retryLoadOfferings: async () => {},
    purchaseSubscription: async () => false,
    restorePurchases: async () => false,
    purchaseLoading: false,
    purchaseViaStripe: async () => {},
    redeemPromoCode: async () => false,
});

export const useSubscriptionDispatch = () => useContext(SubscriptionDispatchContext);
