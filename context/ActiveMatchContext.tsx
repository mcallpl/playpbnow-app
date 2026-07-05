import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActiveMatchStateContext } from './ActiveMatchStateContext';
import { ActiveMatchDispatchContext } from './ActiveMatchDispatchContext';

const STORAGE_KEY = 'active_match';

export interface ActiveMatchData {
    shareCode?: string;
    sessionId?: string;
    groupName: string;
    groupKey?: string;
    matchTitle: string;
    courtName?: string;
    isOwner: boolean;
    creatorUserId?: string; // live sessions: who the saved match belongs to
    schedule: any[];
    players: any[];
}

// Convenience hook for backwards compatibility (returns combined context)
export const useActiveMatch = () => {
    const state = useContext(ActiveMatchStateContext);
    const dispatch = useContext(ActiveMatchDispatchContext);
    return { activeMatch: state.activeMatch, ...dispatch };
};

const ActiveMatchProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeMatch, setActiveMatchState] = useState<ActiveMatchData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load from AsyncStorage on mount
    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    setActiveMatchState(JSON.parse(stored));
                }
            } catch (e) {
                console.error('Failed to load active match:', e);
                setError('Failed to load active match');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const setActiveMatch = useCallback((match: ActiveMatchData) => {
        setActiveMatchState(match);
        setError(null);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(match)).catch(e => {
            console.error('Failed to save active match:', e);
            setError('Failed to save active match');
        });
    }, []);

    const clearActiveMatch = useCallback(() => {
        setActiveMatchState(null);
        setError(null);
        AsyncStorage.removeItem(STORAGE_KEY).catch(e => {
            console.error('Failed to clear active match:', e);
            setError('Failed to clear active match');
        });
    }, []);

    // Memoize state value
    const stateValue = useMemo(() => ({
        activeMatch,
        isLoading,
        error,
    }), [activeMatch, isLoading, error]);

    // Memoize dispatch value
    const dispatchValue = useMemo(() => ({
        setActiveMatch,
        clearActiveMatch,
    }), [setActiveMatch, clearActiveMatch]);

    return (
        <ActiveMatchStateContext.Provider value={stateValue}>
            <ActiveMatchDispatchContext.Provider value={dispatchValue}>
                {children}
            </ActiveMatchDispatchContext.Provider>
        </ActiveMatchStateContext.Provider>
    );
};

export const ActiveMatchProvider = React.memo(ActiveMatchProviderComponent);
