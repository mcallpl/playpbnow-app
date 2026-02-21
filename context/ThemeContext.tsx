import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const colors = Colors[theme];
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
