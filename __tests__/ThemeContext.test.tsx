/**
 * ThemeContext Tests
 *
 * Rewritten against the real provider. The previous version asserted a light
 * default and a primary/error/warning/success palette; the app deliberately
 * defaults to DARK, and its palette is accent/danger/textMuted. It also drove
 * theme changes by re-rendering the provider with a different prop, which never
 * switches anything — useState ignores a changed initial value. Switching now
 * goes through setTheme/toggleTheme, the same path the Settings screen uses.
 */

import React, { useContext } from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, ThemeContext, useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';

const ThemeConsumer = () => {
  const theme = useContext(ThemeContext);
  return (
    <>
      <Text testID="mode">{theme.theme}</Text>
      <Text testID="accent-color">{theme.colors.accent}</Text>
      <Text testID="background-color">{theme.colors.background}</Text>
      <Text testID="text-color">{theme.colors.text}</Text>
      <Text testID="is-dark">{String(theme.isDark)}</Text>
    </>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('Theme Provider', () => {
    it('provides theme context to children', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('accent-color')).toBeTruthy();
    });

    it('defaults to dark', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('mode').props.children).toBe('dark');
      expect(screen.getByTestId('is-dark').props.children).toBe('true');
      expect(screen.getByTestId('background-color').props.children).toBe(
        Colors.dark.background
      );
    });

    it('honours a stored preference over the dark default', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('light');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // the stored value is read in an effect, so let it settle
      await act(async () => {});

      expect(screen.getByTestId('mode').props.children).toBe('light');
    });

    it('ignores a corrupt stored preference', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('chartreuse');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      await act(async () => {});

      expect(screen.getByTestId('mode').props.children).toBe('dark');
    });
  });

  describe('Color object memoization', () => {
    it('keeps the colors reference stable while the theme is unchanged', () => {
      const seen: any[] = [];

      const Probe = () => {
        const { colors } = useTheme();
        seen.push(colors);
        return <Text testID="probe">{colors.accent}</Text>;
      };

      const { rerender } = render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      );

      rerender(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      );

      expect(seen.length).toBeGreaterThan(1);
      // identity, not deep equality — a new object each render would re-render
      // every consumer in the app
      seen.forEach(c => expect(c).toBe(seen[0]));
    });
  });

  describe('Theme switching', () => {
    it('switches from dark to light via setTheme', () => {
      let setTheme: (m: 'dark' | 'light') => void = () => {};

      const Switcher = () => {
        const theme = useTheme();
        setTheme = theme.setTheme;
        return <ThemeConsumer />;
      };

      render(
        <ThemeProvider>
          <Switcher />
        </ThemeProvider>
      );

      expect(screen.getByTestId('background-color').props.children).toBe(
        Colors.dark.background
      );

      act(() => setTheme('light'));

      expect(screen.getByTestId('mode').props.children).toBe('light');
      expect(screen.getByTestId('background-color').props.children).toBe(
        Colors.light.background
      );
      expect(screen.getByTestId('is-dark').props.children).toBe('false');
    });

    it('toggleTheme flips the mode and flips back', () => {
      let toggle: () => void = () => {};

      const Toggler = () => {
        const theme = useTheme();
        toggle = theme.toggleTheme;
        return <ThemeConsumer />;
      };

      render(
        <ThemeProvider>
          <Toggler />
        </ThemeProvider>
      );

      act(() => toggle());
      expect(screen.getByTestId('mode').props.children).toBe('light');

      act(() => toggle());
      expect(screen.getByTestId('mode').props.children).toBe('dark');
    });

    it('persists the chosen theme', () => {
      let setTheme: (m: 'dark' | 'light') => void = () => {};

      const Switcher = () => {
        setTheme = useTheme().setTheme;
        return null;
      };

      render(
        <ThemeProvider>
          <Switcher />
        </ThemeProvider>
      );

      act(() => setTheme('light'));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme_preference', 'light');
    });

    it('applies the same theme to every child', () => {
      const One = () => <Text testID="one">{useTheme().colors.accent}</Text>;
      const Two = () => <Text testID="two">{useTheme().colors.accent}</Text>;

      render(
        <ThemeProvider>
          <One />
          <Two />
        </ThemeProvider>
      );

      expect(screen.getByTestId('one').props.children).toEqual(
        screen.getByTestId('two').props.children
      );
    });
  });

  describe('Color palette', () => {
    // the names the app actually uses — accent (not primary), danger (not
    // error), textMuted/textSoft (not textSecondary)
    const required = [
      'bg', 'background', 'surface', 'card', 'accent', 'accentText',
      'secondary', 'text', 'textMuted', 'textSoft', 'danger', 'border',
      'inputBg', 'inputText', 'tint',
    ];

    it.each(['dark', 'light'] as const)('%s exposes the full palette', mode => {
      const palette = Colors[mode] as Record<string, unknown>;
      required.forEach(key => expect(palette[key]).toBeDefined());
    });

    it('dark and light actually differ', () => {
      expect(Colors.dark.background).not.toEqual(Colors.light.background);
      expect(Colors.dark.text).not.toEqual(Colors.light.text);
    });
  });
});
