/**
 * LoadingBoundary - Manages loading states, skeletons, and error fallbacks
 * Composition-based pattern for flexible loading UIs
 */

import React, { useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BrandedIcon } from './BrandedIcon';
import { ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

// Theme-aware styles (Audit E M7). The palette used to be a hard-coded light
// grey set, which drew a white loading panel on the dark theme's navy screen.
function useBoundaryStyles() {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors]);
}

interface LoadingBoundaryProps {
  isLoading?: boolean;
  error?: Error | null;
  /** Renders the empty state instead of children — e.g. a group with no players. */
  isEmpty?: boolean;
  skeleton?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  children: React.ReactNode;
  onRetry?: () => void;
}

/**
 * LoadingBoundary - Conditionally render loading/error/success states
 * Usage:
 * <LoadingBoundary
 *   isLoading={loading}
 *   error={error}
 *   skeleton={<SkeletonList />}
 *   onRetry={refetch}
 * >
 *   <PlayerList players={players} />
 * </LoadingBoundary>
 */
export function LoadingBoundary({
  isLoading = false,
  error,
  isEmpty = false,
  skeleton,
  errorFallback,
  emptyFallback,
  children,
  onRetry,
}: LoadingBoundaryProps) {
  // Show loading skeleton.
  // The guard used to be `isLoading && !children`, which meant the skeleton only
  // appeared when there was nothing to replace it with — every real caller
  // passes children, so the skeleton never rendered at all. Loading also has to
  // win over error, or a retry that fails once leaves the error on screen while
  // the next attempt is already in flight.
  if (isLoading) {
    return <>{skeleton || <DefaultLoadingSpinner />}</>;
  }

  // Show error state
  if (error) {
    return <>{errorFallback || <DefaultErrorFallback error={error} onRetry={onRetry} />}</>;
  }

  // Show empty state
  if (isEmpty) {
    return <>{emptyFallback || <DefaultEmptyState />}</>;
  }

  // Show children
  return <>{children}</>;
}

/**
 * DefaultLoadingSpinner - Default loading indicator
 */
function DefaultLoadingSpinner() {
  const { colors } = useTheme();
  const styles = useBoundaryStyles();
  return (
    <View testID="default-skeleton" style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

/**
 * DefaultEmptyState - shown when isEmpty is set and no emptyFallback is given
 */
function DefaultEmptyState() {
  const styles = useBoundaryStyles();
  return (
    <View testID="default-empty" style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Nothing to show yet.</Text>
    </View>
  );
}

/**
 * DefaultErrorFallback - Default error UI
 */
function DefaultErrorFallback({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { colors } = useTheme();
  const styles = useBoundaryStyles();
  const errorMessage = error.message || 'Something went wrong. Please try again.';

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <BrandedIcon name="warning" size={48} color={colors.danger} strokeWidth={1.5} />
      </View>

      <Text style={styles.errorTitle}>Unable to load</Text>

      <Text style={styles.errorMessage}>{errorMessage}</Text>

      {/* This was a plain View, so onRetry was accepted but never reachable —
          "Try Again" looked like a button and did nothing when tapped. */}
      {onRetry && (
        <View style={styles.retryButtonContainer}>
          <TouchableOpacity
            testID="loading-boundary-retry"
            accessibilityRole="button"
            style={styles.retryButton}
            onPress={onRetry}
          >
            <BrandedIcon name="refresh" size={18} color={colors.accentStrong} strokeWidth={2} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Skeleton - Base component for loading placeholders
 */
export function SkeletonPlaceholder({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
  testID = 'skeleton-placeholder',
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
  testID?: string;
}) {
  const styles = useBoundaryStyles();
  return (
    <View
      testID={testID}
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
}

/**
 * LoadingList - Skeleton loader for lists
 */
export function SkeletonList({
  count = 5,
  itemHeight = 80,
  spacing = 8,
}: {
  count?: number;
  itemHeight?: number;
  spacing?: number;
}) {
  const styles = useBoundaryStyles();
  return (
    <View style={[styles.listContainer, { gap: spacing }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ height: itemHeight }}>
          <SkeletonPlaceholder width="100%" height="100%" borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

/**
 * SkeletonCard - Skeleton for card-like layouts
 */
export function SkeletonCard({
  titleHeight = 20,
  titleWidth = '70%',
  contentHeight = 60,
  contentWidth = '100%',
}: {
  titleHeight?: number;
  titleWidth?: string | number;
  contentHeight?: number;
  contentWidth?: string | number;
}) {
  const styles = useBoundaryStyles();
  return (
    <View style={styles.cardContainer}>
      <SkeletonPlaceholder width={titleWidth} height={titleHeight} borderRadius={4} />
      <View style={styles.cardSpacing} />
      <SkeletonPlaceholder width={contentWidth} height={contentHeight} borderRadius={4} />
    </View>
  );
}

/**
 * SkeletonTable - Skeleton for table-like layouts
 */
export function SkeletonTable({
  rows = 5,
  columns = 3,
  cellHeight = 40,
}: {
  rows?: number;
  columns?: number;
  cellHeight?: number;
}) {
  const styles = useBoundaryStyles();
  return (
    <View>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <View key={rowIdx} style={[styles.tableRow, { height: cellHeight }]}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <View key={colIdx} style={styles.tableCell}>
              <SkeletonPlaceholder width="100%" height="80%" borderRadius={4} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.bg,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: c.textMuted,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.bg,
    minHeight: 200,
    paddingHorizontal: 20,
  },
  errorIconContainer: {
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.text,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButtonContainer: {
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.accentStrong,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accentStrong,
  },

  // Skeleton styles
  skeleton: {
    backgroundColor: c.surfaceLight,
    overflow: 'hidden',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardContainer: {
    padding: 16,
    backgroundColor: c.card,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardSpacing: {
    height: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
  },
});
