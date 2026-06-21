import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Colors, ThemeColors } from '../constants/theme';

const STORAGE_KEY = 'theme_preference';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: Colors.dark,
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const ThemeProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setThemeState(stored);
        }
      } catch (e) {
        console.error('Failed to load theme preference:', e);
      }
    })();
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(e =>
      console.error('Failed to save theme preference:', e)
    );
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Memoize colors so reference only changes when theme changes
  const colors = useMemo(() => Colors[theme], [theme]);
  const isDark = useMemo(() => theme === 'dark', [theme]);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo(() => ({
    theme,
    colors,
    isDark,
    toggleTheme,
    setTheme,
  }), [theme, colors, isDark, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Wrap with React.memo to prevent re-renders when parent changes
export const ThemeProvider = React.memo(ThemeProviderComponent);
