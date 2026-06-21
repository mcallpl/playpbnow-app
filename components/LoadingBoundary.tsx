/**
 * LoadingBoundary - Manages loading states, skeletons, and error fallbacks
 * Composition-based pattern for flexible loading UIs
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { BrandedIcon } from './BrandedIcon';

interface LoadingBoundaryProps {
  isLoading: boolean;
  error?: Error | null;
  skeleton?: React.ReactNode;
  errorFallback?: React.ReactNode;
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
  isLoading,
  error,
  skeleton,
  errorFallback,
  children,
  onRetry,
}: LoadingBoundaryProps) {
  // Show loading skeleton
  if (isLoading && !children) {
    return skeleton || <DefaultLoadingSpinner />;
  }

  // Show error state
  if (error) {
    return errorFallback || <DefaultErrorFallback error={error} onRetry={onRetry} />;
  }

  // Show children
  return <>{children}</>;
}

/**
 * DefaultLoadingSpinner - Default loading indicator
 */
function DefaultLoadingSpinner() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

/**
 * DefaultErrorFallback - Default error UI
 */
function DefaultErrorFallback({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const errorMessage = error.message || 'Something went wrong. Please try again.';

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <BrandedIcon name="warning" size={48} color="#DC2626" strokeWidth={1.5} />
      </View>

      <Text style={styles.errorTitle}>Unable to load</Text>

      <Text style={styles.errorMessage}>{errorMessage}</Text>

      {onRetry && (
        <View style={styles.retryButtonContainer}>
          <View style={styles.retryButton}>
            <BrandedIcon name="refresh" size={18} color="#3b82f6" strokeWidth={2} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </View>
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
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}) {
  return (
    <View
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

const styles = StyleSheet.create({
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    minHeight: 200,
    paddingHorizontal: 20,
  },
  errorIconContainer: {
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
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
    borderColor: '#3b82f6',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Skeleton styles
  skeleton: {
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
  },
  cardSpacing: {
    height: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
  },
});
