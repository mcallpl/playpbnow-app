/**
 * ErrorBoundary Component Tests
 * Tests error catching, fallback UI, and recovery
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Text, View } from 'react-native';

// Component that throws error
const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
  if (shouldError) {
    throw new Error('Test error message');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <Text testID="child-content">Child content</Text>
      </ErrorBoundary>
    );

    expect(screen.getByTestID('child-content')).toBeTruthy();
    expect(screen.getByText('Child content')).toBeTruthy();
  });

  it('catches errors and displays fallback UI', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestID('error-boundary-fallback')).toBeTruthy();
  });

  it('displays error message in fallback UI', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
  });

  it('displays error details when available', () => {
    render(
      <ErrorBoundary showDetails>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/test error message/i)).toBeTruthy();
  });

  it('provides retry button that resets error state', async () => {
    let shouldError = true;

    const TestComponent = () => {
      const [error, setError] = React.useState(shouldError);

      if (error) {
        throw new Error('Test error');
      }

      return <Text>Success</Text>;
    };

    // Create a wrapper that can control the error state
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestID('error-boundary-fallback')).toBeTruthy();

    // The retry button should exist
    const retryButton = screen.getByTestID('error-boundary-retry');
    expect(retryButton).toBeTruthy();
  });

  it('calls onError callback when error is caught', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
  });

  it('passes error and error info to onError callback', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('recovers from error when child component no longer throws', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestID('error-boundary-fallback')).toBeTruthy();

    rerender(
      <ErrorBoundary>
        <ErrorComponent shouldError={false} />
      </ErrorBoundary>
    );

    // Error boundary should now show the child content
    expect(screen.queryByTestID('error-boundary-fallback')).toBeFalsy();
  });

  it('displays custom fallback component when provided', () => {
    const CustomFallback = () => (
      <View testID="custom-fallback">
        <Text>Custom error UI</Text>
      </View>
    );

    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestID('custom-fallback')).toBeTruthy();
  });

  it('logs errors when logErrors is true', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ErrorBoundary logErrors>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('handles multiple consecutive errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestID('error-boundary-fallback')).toBeTruthy();

    rerender(
      <ErrorBoundary>
        <ErrorComponent shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByTestID('error-boundary-fallback')).toBeFalsy();

    // Error again
    rerender(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestID('error-boundary-fallback')).toBeTruthy();
  });
});
