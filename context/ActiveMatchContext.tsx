import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'active_match';

export interface ActiveMatchData {
    shareCode?: string;
    sessionId?: string;
    groupName: string;
    groupKey?: string;
    matchTitle: string;
    courtName?: string;
    isOwner: boolean;
    schedule: any[];
    players: any[];
}

interface ActiveMatchContextType {
    activeMatch: ActiveMatchData | null;
    setActiveMatch: (match: ActiveMatchData) => void;
    clearActiveMatch: () => void;
}

const ActiveMatchContext = createContext<ActiveMatchContextType>({
    activeMatch: null,
    setActiveMatch: () => {},
    clearActiveMatch: () => {},
});

export const useActiveMatch = () => useContext(ActiveMatchContext);

export const ActiveMatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeMatch, setActiveMatchState] = useState<ActiveMatchData | null>(null);

    // Load from AsyncStorage on mount
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    setActiveMatchState(JSON.parse(stored));
                }
            } catch (e) {
                console.error('Failed to load active match:', e);
            }
        })();
    }, []);

    const setActiveMatch = useCallback((match: ActiveMatchData) => {
        setActiveMatchState(match);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(match)).catch(e =>
            console.error('Failed to save active match:', e)
        );
    }, []);

    const clearActiveMatch = useCallback(() => {
        setActiveMatchState(null);
        AsyncStorage.removeItem(STORAGE_KEY).catch(e =>
            console.error('Failed to clear active match:', e)
        );
    }, []);

    return (
        <ActiveMatchContext.Provider value={{ activeMatch, setActiveMatch, clearActiveMatch }}>
            {children}
        </ActiveMatchContext.Provider>
    );
};
