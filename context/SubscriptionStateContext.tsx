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
    /** False until the user's first saved session — the trial clock is
     *  usage-triggered, not started at registration. See api/trial.php. */
    trialStarted: boolean;
    trialDaysRemaining: number;
    trialExpired: boolean;
    /** PAID (or admin). During the trial this is false — that is what lets a
     *  trial user see the purchase buttons (UAT 2026-09-04, Audit A H1). */
    isPro: boolean;
    /** Has Pro features right now: paid OR in an active trial OR admin.
     *  Feature gates use this; purchase UI uses !isPro. Optional because
     *  older API builds do not send it — consumers fall back to isPro. */
    hasAccess?: boolean;
    isAdmin: boolean;
    features: SubscriptionFeatures;
}

interface SubscriptionStateContextType {
    subscription: SubscriptionData | null;
    isPro: boolean;
    /** paid || trial || admin — gate features on this, never on isPro alone. */
    hasAccess: boolean;
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
    hasAccess: false,
    isAdmin: false,
    isTrial: false,
    isFree: true,
    trialDaysRemaining: 0,
    features: DEFAULT_FEATURES,
});

export const useSubscriptionState = () => useContext(SubscriptionStateContext);
