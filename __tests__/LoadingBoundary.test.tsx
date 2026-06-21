/**
 * LoadingBoundary Component Tests
 * Tests skeleton rendering, error states, and content display
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { LoadingBoundary } from '../components/LoadingBoundary';
import { Text, View } from 'react-native';

const TestContent = ({ testID = 'content' }: { testID?: string }) => (
  <View testID={testID}>
    <Text>Test Content</Text>
  </View>
);

const TestSkeleton = () => (
  <View testID="skeleton">
    <Text>Loading...</Text>
  </View>
);

describe('LoadingBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Skeleton rendering while loading', () => {
    it('renders skeleton when loading prop is true', () => {
      render(
        <LoadingBoundary isLoading={true} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('skeleton')).toBeTruthy();
      expect(screen.queryByTestID('content')).toBeFalsy();
    });

    it('renders multiple skeleton items for arrays', () => {
      render(
        <LoadingBoundary isLoading={true} count={3} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      const skeletons = screen.getAllByTestID('skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('renders default skeleton when none provided', () => {
      render(
        <LoadingBoundary isLoading={true}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('default-skeleton')).toBeTruthy();
    });
  });

  describe('Children rendering on success', () => {
    it('renders children when loading is false', () => {
      render(
        <LoadingBoundary isLoading={false} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('content')).toBeTruthy();
      expect(screen.queryByTestID('skeleton')).toBeFalsy();
    });

    it('renders children immediately when isLoading not provided', () => {
      render(
        <LoadingBoundary skeleton={<TestSkeleton />}>
          <TestContent testID="default-content" />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('default-content')).toBeTruthy();
    });

    it('transitions from skeleton to children', async () => {
      const { rerender } = render(
        <LoadingBoundary isLoading={true} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('skeleton')).toBeTruthy();
      expect(screen.queryByTestID('content')).toBeFalsy();

      rerender(
        <LoadingBoundary isLoading={false} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      await waitFor(() => {
        expect(screen.queryByTestID('skeleton')).toBeFalsy();
        expect(screen.getByTestID('content')).toBeTruthy();
      });
    });
  });

  describe('Error fallback display', () => {
    it('renders error fallback when error prop is provided', () => {
      const ErrorComponent = () => (
        <View testID="error-fallback">
          <Text>Error occurred</Text>
        </View>
      );

      render(
        <LoadingBoundary
          isLoading={false}
          error={new Error('Test error')}
          errorFallback={<ErrorComponent />}
        >
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('error-fallback')).toBeTruthy();
      expect(screen.queryByTestID('content')).toBeFalsy();
    });

    it('displays error message in default error UI', () => {
      render(
        <LoadingBoundary
          isLoading={false}
          error={new Error('Network failed')}
        >
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByText(/error/i)).toBeTruthy();
    });

    it('calls onRetry when retry button clicked', () => {
      const onRetry = jest.fn();

      const { getByTestId } = render(
        <LoadingBoundary
          isLoading={false}
          error={new Error('Test error')}
          onRetry={onRetry}
        >
          <TestContent />
        </LoadingBoundary>
      );

      const retryButton = screen.getByTestID('loading-boundary-retry');
      retryButton.props.onPress();

      expect(onRetry).toHaveBeenCalled();
    });

    it('hides error fallback when error is cleared', () => {
      const { rerender } = render(
        <LoadingBoundary
          isLoading={false}
          error={new Error('Test error')}
        >
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByText(/error/i)).toBeTruthy();

      rerender(
        <LoadingBoundary isLoading={false} error={null}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.queryByText(/error/i)).toBeFalsy();
      expect(screen.getByTestID('content')).toBeTruthy();
    });
  });

  describe('Retry callback', () => {
    it('executes retry callback when provided', () => {
      const onRetry = jest.fn();

      render(
        <LoadingBoundary
          isLoading={false}
          error={new Error('Failed')}
          onRetry={onRetry}
        >
          <TestContent />
        </LoadingBoundary>
      );

      const retryButton = screen.getByTestID('loading-boundary-retry');
      retryButton.props.onPress();

      expect(onRetry).toHaveBeenCalled();
    });

    it('shows loading skeleton after retry', async () => {
      const onRetry = jest.fn();

      const { rerender } = render(
        <LoadingBoundary
          isLoading={false}
          error={new Error('Failed')}
          onRetry={onRetry}
          skeleton={<TestSkeleton />}
        >
          <TestContent />
        </LoadingBoundary>
      );

      const retryButton = screen.getByTestID('loading-boundary-retry');
      retryButton.props.onPress();

      rerender(
        <LoadingBoundary
          isLoading={true}
          error={null}
          onRetry={onRetry}
          skeleton={<TestSkeleton />}
        >
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('skeleton')).toBeTruthy();
    });
  });

  describe('Loading state priority', () => {
    it('shows skeleton even if error exists when loading is true', () => {
      render(
        <LoadingBoundary
          isLoading={true}
          error={new Error('Test error')}
          skeleton={<TestSkeleton />}
        >
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('skeleton')).toBeTruthy();
      expect(screen.queryByText(/error/i)).toBeFalsy();
    });
  });

  describe('Custom content', () => {
    it('renders custom empty state when provided', () => {
      const EmptyState = () => (
        <View testID="empty-state">
          <Text>No data available</Text>
        </View>
      );

      render(
        <LoadingBoundary
          isLoading={false}
          isEmpty={true}
          emptyFallback={<EmptyState />}
        >
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('empty-state')).toBeTruthy();
      expect(screen.queryByTestID('content')).toBeFalsy();
    });

    it('renders children when isEmpty is false', () => {
      render(
        <LoadingBoundary
          isLoading={false}
          isEmpty={false}
        >
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('content')).toBeTruthy();
    });
  });

  describe('Transitions', () => {
    it('handles loading -> error -> success flow', async () => {
      const { rerender } = render(
        <LoadingBoundary isLoading={true} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestID('skeleton')).toBeTruthy();

      rerender(
        <LoadingBoundary isLoading={false} error={new Error('Failed')}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.queryByTestID('skeleton')).toBeFalsy();
      expect(screen.getByText(/error/i)).toBeTruthy();

      rerender(
        <LoadingBoundary isLoading={false} error={null}>
          <TestContent />
        </LoadingBoundary>
      );

      await waitFor(() => {
        expect(screen.queryByText(/error/i)).toBeFalsy();
        expect(screen.getByTestID('content')).toBeTruthy();
      });
    });
  });
});
