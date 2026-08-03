/**
 * LoadingBoundary Component Tests
 * Tests skeleton rendering, error states, and content display
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import {
  LoadingBoundary,
  SkeletonPlaceholder,
  SkeletonList,
  SkeletonCard,
  SkeletonTable,
} from '../components/LoadingBoundary';
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

      expect(screen.getByTestId('skeleton')).toBeTruthy();
      expect(screen.queryByTestId('content')).toBeFalsy();
    });

    it('renders however many skeleton rows the caller composes', () => {
      // There is no `count` prop by design — repetition is the skeleton's job
      // (see SkeletonList/SkeletonTable), which is what makes the boundary
      // reusable for lists, cards and tables alike.
      const ThreeRows = () => (
        <>
          {[0, 1, 2].map(i => (
            <View key={i} testID="skeleton" />
          ))}
        </>
      );

      render(
        <LoadingBoundary isLoading={true} skeleton={<ThreeRows />}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
    });

    it('renders default skeleton when none provided', () => {
      render(
        <LoadingBoundary isLoading={true}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestId('default-skeleton')).toBeTruthy();
    });
  });

  describe('Children rendering on success', () => {
    it('renders children when loading is false', () => {
      render(
        <LoadingBoundary isLoading={false} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestId('content')).toBeTruthy();
      expect(screen.queryByTestId('skeleton')).toBeFalsy();
    });

    it('renders children immediately when isLoading not provided', () => {
      render(
        <LoadingBoundary skeleton={<TestSkeleton />}>
          <TestContent testID="default-content" />
        </LoadingBoundary>
      );

      expect(screen.getByTestId('default-content')).toBeTruthy();
    });

    it('transitions from skeleton to children', async () => {
      const { rerender } = render(
        <LoadingBoundary isLoading={true} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestId('skeleton')).toBeTruthy();
      expect(screen.queryByTestId('content')).toBeFalsy();

      rerender(
        <LoadingBoundary isLoading={false} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton')).toBeFalsy();
        expect(screen.getByTestId('content')).toBeTruthy();
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

      expect(screen.getByTestId('error-fallback')).toBeTruthy();
      expect(screen.queryByTestId('content')).toBeFalsy();
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

      expect(screen.getByText(/unable to load/i)).toBeTruthy();
      expect(screen.getByText('Network failed')).toBeTruthy();
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

      fireEvent.press(screen.getByTestId('loading-boundary-retry'));

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

      expect(screen.getByText(/unable to load/i)).toBeTruthy();

      rerender(
        <LoadingBoundary isLoading={false} error={null}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.queryByText(/unable to load/i)).toBeFalsy();
      expect(screen.getByTestId('content')).toBeTruthy();
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

      fireEvent.press(screen.getByTestId('loading-boundary-retry'));

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

      fireEvent.press(screen.getByTestId('loading-boundary-retry'));

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

      expect(screen.getByTestId('skeleton')).toBeTruthy();
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

      expect(screen.getByTestId('skeleton')).toBeTruthy();
      expect(screen.queryByText(/unable to load/i)).toBeFalsy();
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

      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.queryByTestId('content')).toBeFalsy();
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

      expect(screen.getByTestId('content')).toBeTruthy();
    });
  });

  describe('Transitions', () => {
    it('handles loading -> error -> success flow', async () => {
      const { rerender } = render(
        <LoadingBoundary isLoading={true} skeleton={<TestSkeleton />}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.getByTestId('skeleton')).toBeTruthy();

      rerender(
        <LoadingBoundary isLoading={false} error={new Error('Failed')}>
          <TestContent />
        </LoadingBoundary>
      );

      expect(screen.queryByTestId('skeleton')).toBeFalsy();
      expect(screen.getByText(/unable to load/i)).toBeTruthy();

      rerender(
        <LoadingBoundary isLoading={false} error={null}>
          <TestContent />
        </LoadingBoundary>
      );

      await waitFor(() => {
        expect(screen.queryByText(/unable to load/i)).toBeFalsy();
        expect(screen.getByTestId('content')).toBeTruthy();
      });
    });
  });

  describe('Skeleton building blocks', () => {
    it('SkeletonPlaceholder renders with the given dimensions', () => {
      render(<SkeletonPlaceholder width={200} height={24} borderRadius={12} />);

      const box = screen.getByTestId('skeleton-placeholder');
      expect(box).toBeTruthy();
      expect(box.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 200, height: 24, borderRadius: 12 }),
        ])
      );
    });

    it('SkeletonList renders one placeholder per row', () => {
      render(<SkeletonList count={4} />);

      expect(screen.getAllByTestId('skeleton-placeholder')).toHaveLength(4);
    });

    it('SkeletonList defaults to five rows', () => {
      render(<SkeletonList />);

      expect(screen.getAllByTestId('skeleton-placeholder')).toHaveLength(5);
    });

    it('SkeletonCard renders a title bar and a content block', () => {
      render(<SkeletonCard />);

      expect(screen.getAllByTestId('skeleton-placeholder')).toHaveLength(2);
    });

    it('SkeletonTable renders rows x columns cells', () => {
      render(<SkeletonTable rows={3} columns={4} />);

      expect(screen.getAllByTestId('skeleton-placeholder')).toHaveLength(12);
    });

    it('SkeletonTable defaults to a 5x3 grid', () => {
      render(<SkeletonTable />);

      expect(screen.getAllByTestId('skeleton-placeholder')).toHaveLength(15);
    });
  });
});
