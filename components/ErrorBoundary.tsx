/**
 * ErrorBoundary - Catches React component errors
 * Displays error UI with retry button when errors occur
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { BrandedIcon } from './BrandedIcon';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
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

    // You could also log to an error reporting service here
    // e.g., Sentry.captureException(error, { contexts: { react: errorInfo } });
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
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentContainer}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <BrandedIcon name="warning" size={64} color="#DC2626" strokeWidth={1.5} />
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
        <TouchableOpacity style={styles.retryButton} onPress={onReset}>
          <BrandedIcon name="refresh" size={20} color="#ffffff" strokeWidth={2} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        {/* Support Text */}
        <Text style={styles.supportText}>If the problem persists, please contact support.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
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
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  stackTrace: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    maxWidth: '100%',
  },
  stackTraceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  stackTraceText: {
    fontSize: 11,
    color: '#7f1d1d',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier New',
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
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
    color: '#ffffff',
  },
  supportText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
