import React, { createContext, useContext, useMemo } from 'react';

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
    isAdmin: boolean;
    features: SubscriptionFeatures;
}

interface SubscriptionStateContextType {
    subscription: SubscriptionData | null;
    isPro: boolean;
    isAdmin: boolean;
    isTrial: boolean;
    isFree: boolean;
    trialDaysRemaining: number;
    features: SubscriptionFeatures;
}

export const DEFAULT_FEATURES: SubscriptionFeatures = {
    canGenerateCleanReports: false,
    canEditMatches: false,
    canDeleteMatches: false,
    maxGroups: 2,
    maxCollabSessions: 1,
    maxPlayersPerGroup: 100,
};

export const SubscriptionStateContext = createContext<SubscriptionStateContextType>({
    subscription: null,
    isPro: false,
    isAdmin: false,
    isTrial: false,
    isFree: true,
    trialDaysRemaining: 0,
    features: DEFAULT_FEATURES,
});

export const useSubscriptionState = () => useContext(SubscriptionStateContext);
