import React, { createContext, useContext } from 'react';

interface ActiveMatchStateContextType {
    activeMatch: any | null;
    isLoading: boolean;
    error: string | null;
}

export const ActiveMatchStateContext = createContext<ActiveMatchStateContextType>({
    activeMatch: null,
    isLoading: false,
    error: null,
});

export const useActiveMatchState = () => useContext(ActiveMatchStateContext);
