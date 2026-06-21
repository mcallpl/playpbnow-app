import React, { createContext, useContext } from 'react';
import type { ActiveMatchData } from './ActiveMatchContext';

interface ActiveMatchDispatchContextType {
    setActiveMatch: (match: ActiveMatchData) => void;
    clearActiveMatch: () => void;
}

export const ActiveMatchDispatchContext = createContext<ActiveMatchDispatchContextType>({
    setActiveMatch: () => {},
    clearActiveMatch: () => {},
});

export const useActiveMatchDispatch = () => useContext(ActiveMatchDispatchContext);
