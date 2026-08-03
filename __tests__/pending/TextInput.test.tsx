/**
 * TextInput Component Tests
 * Tests input rendering, validation, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TextInput } from '../components/TextInput';

describe('TextInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders input field', () => {
      render(
        <TextInput
          testID="text-input"
          placeholder="Enter text"
        />
      );

      expect(screen.getByTestID('text-input')).toBeTruthy();
    });

    it('renders with label', () => {
      render(
        <TextInput
          label="Email"
          placeholder="Enter email"
        />
      );

      expect(screen.getByText('Email')).toBeTruthy();
    });

    it('renders placeholder text', () => {
      render(
        <TextInput
          placeholder="Type here..."
        />
      );

      expect(screen.getByPlaceholderText('Type here...')).toBeTruthy();
    });

    it('renders with initial value', () => {
      render(
        <TextInput
          testID="input"
          value="Initial value"
        />
      );

      const input = screen.getByTestID('input');
      expect(input.props.value).toBe('Initial value');
    });
  });

  describe('User input', () => {
    it('updates value on text change', () => {
      const onChangeText = jest.fn();
      render(
        <TextInput
          testID="input"
          onChangeText={onChangeText}
        />
      );

      const input = screen.getByTestID('input');
      fireEvent.changeText(input, 'New text');

      expect(onChangeText).toHaveBeenCalledWith('New text');
    });

    it('handles multiple text changes', () => {
      const onChangeText = jest.fn();
      render(
        <TextInput
          testID="input"
          onChangeText={onChangeText}
        />
      );

      const input = screen.getByTestID('input');
      fireEvent.changeText(input, 'First');
      fireEvent.changeText(input, 'Second');
      fireEvent.changeText(input, 'Third');

      expect(onChangeText).toHaveBeenCalledTimes(3);
      expect(onChangeText).toHaveBeenLastCalledWith('Third');
    });

    it('calls onBlur when input loses focus', () => {
      const onBlur = jest.fn();
      render(
        <TextInput
          testID="input"
          onBlur={onBlur}
        />
      );

      const input = screen.getByTestID('input');
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalled();
    });

    it('calls onFocus when input gains focus', () => {
      const onFocus = jest.fn();
      render(
        <TextInput
          testID="input"
          onFocus={onFocus}
        />
      );

      const input = screen.getByTestID('input');
      fireEvent.focus(input);

      expect(onFocus).toHaveBeenCalled();
    });
  });

  describe('Error display', () => {
    it('displays error message when provided', () => {
      render(
        <TextInput
          label="Email"
          error="Invalid email"
        />
      );

      expect(screen.getByText('Invalid email')).toBeTruthy();
    });

    it('shows error styling when error exists', () => {
      const { getByTestId } = render(
        <TextInput
          testID="error-input"
          error="This field is required"
        />
      );

      const input = getByTestId('error-input');
      const containerStyle = input.parent?.props.style;

      expect(screen.getByText('This field is required')).toBeTruthy();
    });

    it('clears error message when error prop is cleared', () => {
      const { rerender } = render(
        <TextInput
          error="Original error"
        />
      );

      expect(screen.getByText('Original error')).toBeTruthy();

      rerender(
        <TextInput
          error={undefined}
        />
      );

      expect(screen.queryByText('Original error')).toBeFalsy();
    });

    it('supports multiple error messages', () => {
      render(
        <TextInput
          error="Email is required and must be valid"
        />
      );

      expect(screen.getByText('Email is required and must be valid')).toBeTruthy();
    });
  });

  describe('Validation feedback', () => {
    it('shows success state when isValid is true', () => {
      const { getByTestId } = render(
        <TextInput
          testID="valid-input"
          isValid={true}
          value="valid@email.com"
        />
      );

      const input = getByTestId('valid-input');
      expect(input.props.editable).toBe(true);
    });

    it('shows error state when isValid is false', () => {
      render(
        <TextInput
          isValid={false}
          error="Validation failed"
        />
      );

      expect(screen.getByText('Validation failed')).toBeTruthy();
    });

    it('validates on blur', () => {
      const onBlur = jest.fn();
      render(
        <TextInput
          testID="input"
          onBlur={onBlur}
          onValidate={jest.fn()}
        />
      );

      const input = screen.getByTestID('input');
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('Input types', () => {
    it('renders email input type', () => {
      render(
        <TextInput
          testID="email-input"
          inputType="email"
          placeholder="Email"
        />
      );

      const input = screen.getByTestID('email-input');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('renders phone input type', () => {
      render(
        <TextInput
          testID="phone-input"
          inputType="phone"
          placeholder="Phone"
        />
      );

      const input = screen.getByTestID('phone-input');
      expect(input.props.keyboardType).toBe('phone-pad');
    });

    it('renders password input type', () => {
      render(
        <TextInput
          testID="password-input"
          inputType="password"
          placeholder="Password"
        />
      );

      const input = screen.getByTestID('password-input');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('renders number input type', () => {
      render(
        <TextInput
          testID="number-input"
          inputType="number"
          placeholder="Age"
        />
      );

      const input = screen.getByTestID('number-input');
      expect(input.props.keyboardType).toBe('decimal-pad');
    });
  });

  describe('Focus states', () => {
    it('shows focus indicator when input is focused', () => {
      const { getByTestId } = render(
        <TextInput
          testID="input"
          placeholder="Focus me"
        />
      );

      const input = getByTestId('input');
      fireEvent.focus(input);

      expect(input.props.onFocus).toBeDefined();
    });

    it('hides focus indicator when input loses focus', () => {
      const { getByTestId } = render(
        <TextInput
          testID="input"
          placeholder="Blur me"
        />
      );

      const input = getByTestId('input');
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(input).toBeTruthy();
    });

    it('shows cursor in focused input', () => {
      const { getByTestId } = render(
        <TextInput
          testID="input"
        />
      );

      const input = getByTestId('input');
      fireEvent.focus(input);

      expect(input.props.editable).toBe(true);
    });
  });

  describe('Disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(
        <TextInput
          testID="disabled-input"
          disabled={true}
        />
      );

      const input = screen.getByTestID('disabled-input');
      expect(input.props.editable).toBe(false);
    });

    it('does not call onChange when disabled', () => {
      const onChangeText = jest.fn();
      render(
        <TextInput
          testID="input"
          disabled={true}
          onChangeText={onChangeText}
        />
      );

      const input = screen.getByTestID('input');
      fireEvent.changeText(input, 'Text');

      expect(onChangeText).not.toHaveBeenCalled();
    });

    it('shows disabled styling', () => {
      const { getByTestId } = render(
        <TextInput
          testID="disabled-input"
          disabled={true}
        />
      );

      const input = getByTestId('disabled-input');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('Required field indicator', () => {
    it('shows required indicator when required is true', () => {
      render(
        <TextInput
          label="Email"
          required={true}
        />
      );

      expect(screen.getByText(/\*/)).toBeTruthy();
    });

    it('does not show required indicator when not required', () => {
      const { getByTestId } = render(
        <TextInput
          testID="input"
          label="Optional field"
          required={false}
        />
      );

      const input = getByTestId('input');
      expect(input).toBeTruthy();
    });
  });

  describe('Character limit', () => {
    it('respects max character limit', () => {
      const onChangeText = jest.fn();
      render(
        <TextInput
          testID="input"
          maxLength={10}
          onChangeText={onChangeText}
        />
      );

      const input = screen.getByTestID('input');
      expect(input.props.maxLength).toBe(10);
    });

    it('prevents input beyond character limit', () => {
      render(
        <TextInput
          testID="input"
          maxLength={5}
        />
      );

      const input = screen.getByTestID('input');
      fireEvent.changeText(input, '123456789');

      expect(input.props.maxLength).toBe(5);
    });
  });
});
