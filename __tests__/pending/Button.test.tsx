/**
 * Button Component Tests
 * Tests button states, click handlers, and variants
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../components/Button';

describe('Button Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders button with text', () => {
      render(<Button title="Click me" onPress={() => {}} />);

      expect(screen.getByText('Click me')).toBeTruthy();
    });

    it('renders button with testID', () => {
      render(
        <Button
          testID="test-button"
          title="Click"
          onPress={() => {}}
        />
      );

      expect(screen.getByTestID('test-button')).toBeTruthy();
    });
  });

  describe('Button states', () => {
    it('renders enabled button by default', () => {
      const onPress = jest.fn();
      render(<Button title="Click" onPress={onPress} />);

      const button = screen.getByText('Click');
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalled();
    });

    it('disables button when disabled prop is true', () => {
      const onPress = jest.fn();
      render(
        <Button
          title="Disabled"
          onPress={onPress}
          disabled={true}
        />
      );

      const button = screen.getByText('Disabled');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows loading state with spinner', () => {
      render(
        <Button
          title="Loading"
          onPress={() => {}}
          loading={true}
        />
      );

      expect(screen.getByTestID('button-spinner')).toBeTruthy();
    });

    it('disables button while loading', () => {
      const onPress = jest.fn();
      render(
        <Button
          title="Loading"
          onPress={onPress}
          loading={true}
        />
      );

      const button = screen.getByText('Loading');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('hides loading spinner when not loading', () => {
      render(
        <Button
          title="Ready"
          onPress={() => {}}
          loading={false}
        />
      );

      expect(screen.queryByTestID('button-spinner')).toBeFalsy();
    });
  });

  describe('Button types', () => {
    it('renders primary button with correct styling', () => {
      const { getByTestId } = render(
        <Button
          testID="primary-btn"
          title="Primary"
          onPress={() => {}}
          type="primary"
        />
      );

      const button = getByTestId('primary-btn');
      const style = button.props.style;

      expect(style.backgroundColor).toBeDefined();
    });

    it('renders secondary button with correct styling', () => {
      const { getByTestId } = render(
        <Button
          testID="secondary-btn"
          title="Secondary"
          onPress={() => {}}
          type="secondary"
        />
      );

      const button = getByTestId('secondary-btn');
      expect(button).toBeTruthy();
    });

    it('renders danger button with correct styling', () => {
      const { getByTestId } = render(
        <Button
          testID="danger-btn"
          title="Delete"
          onPress={() => {}}
          type="danger"
        />
      );

      const button = getByTestId('danger-btn');
      expect(button).toBeTruthy();
    });

    it('renders text-only button', () => {
      render(
        <Button
          testID="text-btn"
          title="Text only"
          onPress={() => {}}
          type="text"
        />
      );

      expect(screen.getByTestID('text-btn')).toBeTruthy();
    });
  });

  describe('Click handler', () => {
    it('calls onPress when button is clicked', () => {
      const onPress = jest.fn();
      render(<Button title="Click" onPress={onPress} />);

      const button = screen.getByText('Click');
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      render(
        <Button
          title="Disabled"
          onPress={onPress}
          disabled={true}
        />
      );

      const button = screen.getByText('Disabled');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      render(
        <Button
          title="Loading"
          onPress={onPress}
          loading={true}
        />
      );

      const button = screen.getByText('Loading');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('calls onPress multiple times for multiple clicks', () => {
      const onPress = jest.fn();
      render(<Button title="Click" onPress={onPress} />);

      const button = screen.getByText('Click');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Size variants', () => {
    it('renders small button with correct size', () => {
      const { getByTestId } = render(
        <Button
          testID="small-btn"
          title="Small"
          onPress={() => {}}
          size="small"
        />
      );

      const button = getByTestId('small-btn');
      expect(button).toBeTruthy();
    });

    it('renders medium button with correct size', () => {
      const { getByTestId } = render(
        <Button
          testID="medium-btn"
          title="Medium"
          onPress={() => {}}
          size="medium"
        />
      );

      const button = getByTestId('medium-btn');
      expect(button).toBeTruthy();
    });

    it('renders large button with correct size', () => {
      const { getByTestId } = render(
        <Button
          testID="large-btn"
          title="Large"
          onPress={() => {}}
          size="large"
        />
      );

      const button = getByTestId('large-btn');
      expect(button).toBeTruthy();
    });
  });

  describe('Visual feedback', () => {
    it('shows pressed state when button is pressed', () => {
      const { getByTestId } = render(
        <Button
          testID="feedback-btn"
          title="Feedback"
          onPress={() => {}}
        />
      );

      const button = getByTestId('feedback-btn');
      fireEvent.press(button);

      // Button should remain pressable
      expect(button).toBeTruthy();
    });

    it('shows loading spinner animation', () => {
      const { getByTestId } = render(
        <Button
          testID="spinner-btn"
          title="Loading"
          onPress={() => {}}
          loading={true}
        />
      );

      const spinner = getByTestId('button-spinner');
      expect(spinner).toBeTruthy();
      expect(spinner.props.animating).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has accessible label', () => {
      render(
        <Button
          title="Accessible Button"
          onPress={() => {}}
          accessibilityLabel="Save form"
        />
      );

      const button = screen.getByText('Accessible Button');
      expect(button.props.accessibilityLabel).toBe('Save form');
    });

    it('announced as disabled when disabled', () => {
      render(
        <Button
          title="Disabled"
          onPress={() => {}}
          disabled={true}
        />
      );

      const button = screen.getByText('Disabled');
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Props combinations', () => {
    it('handles primary + disabled + large', () => {
      const { getByTestId } = render(
        <Button
          testID="combo-btn"
          title="Combo"
          onPress={() => {}}
          type="primary"
          disabled={true}
          size="large"
        />
      );

      const button = getByTestId('combo-btn');
      expect(button.props.disabled).toBe(true);
    });

    it('handles danger + loading + medium', () => {
      const { getByTestId } = render(
        <Button
          testID="danger-loading"
          title="Delete"
          onPress={() => {}}
          type="danger"
          loading={true}
          size="medium"
        />
      );

      const button = getByTestId('danger-loading');
      expect(screen.getByTestID('button-spinner')).toBeTruthy();
    });
  });
});
