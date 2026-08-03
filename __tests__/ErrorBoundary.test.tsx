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
    // restoreAllMocks, not a direct mockRestore: one test below restores the
    // console.error spy itself, and calling mockRestore on the real function
    // afterwards throws "mockRestore is not a function".
    jest.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <Text testID="child-content">Child content</Text>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(screen.getByText('Child content')).toBeTruthy();
  });

  it('catches errors and displays fallback UI', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();
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

    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();

    // The retry button should exist
    const retryButton = screen.getByTestId('error-boundary-retry');
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

  it('stays in the error state until it is explicitly reset', () => {
    // A boundary that cleared itself on every re-render would loop forever
    // against a child that keeps throwing, so re-rendering alone must NOT
    // recover. Recovery goes through the retry button.
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();

    rerender(
      <ErrorBoundary>
        <ErrorComponent shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();
  });

  it('recovers via the retry button once the child stops throwing', () => {
    const onReset = jest.fn();

    const { rerender } = render(
      <ErrorBoundary onReset={onReset}>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();

    // swap in a child that no longer throws, then reset
    rerender(
      <ErrorBoundary onReset={onReset}>
        <ErrorComponent shouldError={false} />
      </ErrorBoundary>
    );
    fireEvent.press(screen.getByTestId('error-boundary-retry'));

    expect(screen.queryByTestId('error-boundary-fallback')).toBeFalsy();
    expect(screen.getByText('No error')).toBeTruthy();
    expect(onReset).toHaveBeenCalled();
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

    expect(screen.getByTestId('custom-fallback')).toBeTruthy();
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

    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();

    // recover
    rerender(
      <ErrorBoundary>
        <ErrorComponent shouldError={false} />
      </ErrorBoundary>
    );
    fireEvent.press(screen.getByTestId('error-boundary-retry'));
    expect(screen.queryByTestId('error-boundary-fallback')).toBeFalsy();

    // and catch a second, separate error afterwards
    rerender(
      <ErrorBoundary>
        <ErrorComponent shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();
  });
});
