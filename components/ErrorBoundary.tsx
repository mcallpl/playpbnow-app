/**
 * ErrorBoundary - Catches React component errors
 * Displays error UI with retry button when errors occur
 */

import { Component, ReactNode, ErrorInfo, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrandedIcon } from './BrandedIcon';
import { Colors, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

// The owner's real mailbox (UAT 2026-09-04). One address everywhere.
export const SUPPORT_EMAIL = 'mcallpl@gmail.com';

// The root boundary wraps ThemeProvider (it has to — a crash inside the
// provider must still be caught), so useTheme() there only ever sees the
// default dark palette. Read the stored preference directly so the crash
// screen matches the theme the user actually chose.
const THEME_PREF_KEY = 'theme_preference';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  /**
   * Notified whenever the boundary catches. This is the hook a crash reporter
   * would attach to — the boundary itself stays reporting-agnostic.
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error to console for debugging
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({
      errorInfo,
    });

    // Hand off to whatever the app wants to do with it (crash reporting, a
    // toast, a counter). Guarded: a throwing reporter must not take down the
    // boundary that is already handling a crash.
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (reporterError) {
        console.error('[ErrorBoundary] onError handler threw:', reporterError);
      }
    }
  }

  /**
   * Reset error state
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? (
        this.props.fallback
      ) : (
        <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 */
function ErrorFallback({
  error,
  errorInfo,
  onReset,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}) {
  const { colors: contextColors } = useTheme();
  const [storedTheme, setStoredTheme] = useState<'dark' | 'light' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_PREF_KEY);
        if (!cancelled && (stored === 'light' || stored === 'dark')) {
          setStoredTheme(stored);
        }
      } catch {
        // no stored preference — the context palette is fine
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const colors = storedTheme ? Colors[storedTheme] : contextColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const contactSupport = () => {
    const subject = encodeURIComponent('PlayPBNow — something went wrong');
    const body = encodeURIComponent(
      `What I was doing:\n\n\n---\nError: ${error?.message || 'unknown'}\nPlatform: ${Platform.OS}`
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {
      // No mail client — the address is printed on screen below.
    });
  };

  return (
    <ScrollView testID="error-boundary-fallback" contentContainerStyle={styles.container}>
      <View style={styles.contentContainer}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <BrandedIcon name="warning" size={64} color={colors.danger} strokeWidth={1.5} />
        </View>

        {/* Error Title */}
        <Text style={styles.title}>Something went wrong</Text>

        {/* Error Message */}
        {error && (
          <Text style={styles.message}>
            {error.message || 'An unexpected error occurred. Please try again.'}
          </Text>
        )}

        {/* Development: Show stack trace */}
        {__DEV__ && errorInfo && (
          <View style={styles.stackTrace}>
            <Text style={styles.stackTraceTitle}>Stack Trace (Development Only):</Text>
            <Text style={styles.stackTraceText}>{errorInfo.componentStack}</Text>
          </View>
        )}

        {/* Retry Button */}
        <TouchableOpacity
          testID="error-boundary-retry"
          style={styles.retryButton}
          onPress={onReset}
        >
          <BrandedIcon name="refresh" size={20} color={colors.accentText} strokeWidth={2} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        {/* Support Text — tappable mailto, with the address visible in case
            there is no mail client to hand it to. */}
        <Text style={styles.supportText}>If the problem persists, please contact support.</Text>
        <TouchableOpacity testID="error-boundary-support" onPress={contactSupport} accessibilityRole="link">
          <Text style={styles.supportLink}>{SUPPORT_EMAIL}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.bg,
    padding: 20,
    minHeight: '100%',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: c.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: c.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  stackTrace: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    maxWidth: '100%',
  },
  stackTraceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.danger,
    marginBottom: 8,
  },
  stackTraceText: {
    fontSize: 11,
    color: c.textSoft,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier New',
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: c.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accentText,
  },
  supportText: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
  },
  supportLink: {
    fontSize: 14,
    color: c.accentStrong,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 6,
    paddingVertical: 8,
  },
});
