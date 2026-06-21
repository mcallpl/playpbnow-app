/**
 * Setup Screen Integration Tests
 * Tests complete onboarding flow through all setup steps
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SetupScreen } from '../app/(tabs)/setup';
import ApiClient from '../lib/api/ApiClient';

jest.mock('../lib/api/ApiClient');
jest.mock('expo-image-picker');
jest.mock('expo-location');

const mockApiClient = ApiClient.getInstance as jest.MockedFunction<typeof ApiClient.getInstance>;

describe('Setup Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockApiClient.mockReturnValue({
      get: jest.fn(),
      post: jest.fn().mockResolvedValue({ user_id: 1, message: 'Setup complete' }),
      put: jest.fn(),
      delete: jest.fn(),
      setAuth: jest.fn(),
      clearAuth: jest.fn(),
    } as any);
  });

  describe('Photo step', () => {
    it('renders photo upload step', () => {
      render(<SetupScreen initialStep={0} />);

      expect(screen.getByText(/photo|profile picture/i)).toBeTruthy();
    });

    it('allows photo selection', async () => {
      render(<SetupScreen initialStep={0} />);

      const uploadButton = screen.getByTestID('upload-photo');
      fireEvent.press(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestID('photo-preview')).toBeTruthy();
      });
    });

    it('navigates to next step after photo selection', async () => {
      render(<SetupScreen initialStep={0} />);

      const uploadButton = screen.getByTestID('upload-photo');
      fireEvent.press(uploadButton);

      await waitFor(() => {
        const nextButton = screen.getByTestID('next-step');
        fireEvent.press(nextButton);
      });

      expect(screen.getByText(/profile|name/i)).toBeTruthy();
    });

    it('handles photo upload error', async () => {
      // Simulate permission denied
      render(<SetupScreen initialStep={0} />);

      const uploadButton = screen.getByTestID('upload-photo');
      fireEvent.press(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/permission|failed/i)).toBeTruthy();
      });
    });
  });

  describe('Profile step', () => {
    it('renders profile form', () => {
      render(<SetupScreen initialStep={1} />);

      expect(screen.getByTestID('first-name-input')).toBeTruthy();
      expect(screen.getByTestID('last-name-input')).toBeTruthy();
      expect(screen.getByTestID('email-input')).toBeTruthy();
      expect(screen.getByTestID('phone-input')).toBeTruthy();
    });

    it('validates required profile fields', async () => {
      render(<SetupScreen initialStep={1} />);

      const nextButton = screen.getByTestID('next-step');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeTruthy();
      });
    });

    it('validates email format', async () => {
      render(<SetupScreen initialStep={1} />);

      const emailInput = screen.getByTestID('email-input');
      fireEvent.changeText(emailInput, 'invalid-email');

      const nextButton = screen.getByTestID('next-step');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeTruthy();
      });
    });

    it('validates phone format', async () => {
      render(<SetupScreen initialStep={1} />);

      const phoneInput = screen.getByTestID('phone-input');
      fireEvent.changeText(phoneInput, '123');

      const nextButton = screen.getByTestID('next-step');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/valid phone/i)).toBeTruthy();
      });
    });

    it('allows navigation with valid profile data', async () => {
      render(<SetupScreen initialStep={1} />);

      fireEvent.changeText(screen.getByTestID('first-name-input'), 'John');
      fireEvent.changeText(screen.getByTestID('last-name-input'), 'Doe');
      fireEvent.changeText(screen.getByTestID('email-input'), 'john@example.com');
      fireEvent.changeText(screen.getByTestID('phone-input'), '5551234567');

      const nextButton = screen.getByTestID('next-step');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/location|city/i)).toBeTruthy();
      });
    });
  });

  describe('Location step', () => {
    it('renders location selection', () => {
      render(<SetupScreen initialStep={2} />);

      expect(screen.getByText(/location|city|state/i)).toBeTruthy();
    });

    it('requests geolocation permission', async () => {
      render(<SetupScreen initialStep={2} />);

      const useCurrentButton = screen.getByTestID('use-current-location');
      fireEvent.press(useCurrentButton);

      await waitFor(() => {
        expect(screen.getByTestID('location-status')).toBeTruthy();
      });
    });

    it('allows manual location entry', async () => {
      render(<SetupScreen initialStep={2} />);

      const cityInput = screen.getByTestID('city-input');
      const stateInput = screen.getByTestID('state-input');

      fireEvent.changeText(cityInput, 'New York');
      fireEvent.changeText(stateInput, 'NY');

      const nextButton = screen.getByTestID('next-step');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/preferences|play level/i)).toBeTruthy();
      });
    });
  });

  describe('Preferences step', () => {
    it('renders preference options', () => {
      render(<SetupScreen initialStep={3} />);

      expect(screen.getByText(/play level|beginner|intermediate|advanced/i)).toBeTruthy();
      expect(screen.getByText(/days.*play|monday|wednesday/i)).toBeTruthy();
    });

    it('selects play level', async () => {
      render(<SetupScreen initialStep={3} />);

      const advancedButton = screen.getByTestID('play-level-advanced');
      fireEvent.press(advancedButton);

      await waitFor(() => {
        expect(advancedButton).toHaveStyle({ opacity: 1 });
      });
    });

    it('selects multiple days', async () => {
      render(<SetupScreen initialStep={3} />);

      const mondayButton = screen.getByTestID('day-monday');
      const wednesdayButton = screen.getByTestID('day-wednesday');
      const fridayButton = screen.getByTestID('day-friday');

      fireEvent.press(mondayButton);
      fireEvent.press(wednesdayButton);
      fireEvent.press(fridayButton);

      await waitFor(() => {
        expect(mondayButton).toHaveStyle({ backgroundColor: expect.any(String) });
        expect(wednesdayButton).toHaveStyle({ backgroundColor: expect.any(String) });
        expect(fridayButton).toHaveStyle({ backgroundColor: expect.any(String) });
      });
    });

    it('allows deselection of days', async () => {
      render(<SetupScreen initialStep={3} />);

      const mondayButton = screen.getByTestID('day-monday');

      fireEvent.press(mondayButton);
      fireEvent.press(mondayButton);

      await waitFor(() => {
        expect(mondayButton).not.toHaveStyle({ backgroundColor: expect.any(String) });
      });
    });
  });

  describe('Summary step', () => {
    it('displays review of all entered data', () => {
      render(<SetupScreen initialStep={4} />);

      expect(screen.getByText(/review|summary|confirm/i)).toBeTruthy();
    });

    it('shows all profile information', () => {
      const testData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '5551234567'
      };

      render(
        <SetupScreen initialStep={4} prefilledData={testData} />
      );

      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Doe')).toBeTruthy();
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });

    it('allows editing previous steps', async () => {
      render(<SetupScreen initialStep={4} />);

      const editButton = screen.getByTestID('edit-profile');
      fireEvent.press(editButton);

      await waitFor(() => {
        expect(screen.getByTestID('first-name-input')).toBeTruthy();
      });
    });

    it('submits complete setup data', async () => {
      const mockPost = jest.fn().mockResolvedValue({ success: true });
      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<SetupScreen initialStep={4} />);

      const submitButton = screen.getByTestID('complete-setup');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('allows back navigation', async () => {
      render(<SetupScreen initialStep={2} />);

      const backButton = screen.getByTestID('previous-step');
      fireEvent.press(backButton);

      await waitFor(() => {
        expect(screen.getByText(/profile|name/i)).toBeTruthy();
      });
    });

    it('prevents going before first step', async () => {
      render(<SetupScreen initialStep={0} />);

      const backButton = screen.queryByTestID('previous-step');

      expect(backButton).toBeFalsy();
    });

    it('shows step progress', () => {
      render(<SetupScreen initialStep={2} />);

      expect(screen.getByText(/3 of 5|step 3/i)).toBeTruthy();
    });

    it('skips optional steps', async () => {
      render(<SetupScreen initialStep={2} />);

      const skipButton = screen.getByTestID('skip-step');
      fireEvent.press(skipButton);

      await waitFor(() => {
        expect(screen.getByText(/preferences|play level/i)).toBeTruthy();
      });
    });
  });

  describe('Error handling', () => {
    it('handles submission error', async () => {
      const mockPost = jest.fn().mockRejectedValue(new Error('Network error'));
      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<SetupScreen initialStep={4} />);

      const submitButton = screen.getByTestID('complete-setup');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeTruthy();
      });
    });

    it('allows retry after error', async () => {
      let callCount = 0;
      const mockPost = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve({ success: true });
      });

      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<SetupScreen initialStep={4} />);

      const submitButton = screen.getByTestID('complete-setup');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeTruthy();
      });

      const retryButton = screen.getByTestID('retry-button');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('State persistence', () => {
    it('preserves data when navigating back', async () => {
      render(<SetupScreen initialStep={1} />);

      fireEvent.changeText(screen.getByTestID('first-name-input'), 'John');

      const nextButton = screen.getByTestID('next-step');
      fireEvent.press(nextButton);

      await waitFor(() => {
        const backButton = screen.getByTestID('previous-step');
        fireEvent.press(backButton);
      });

      expect(screen.getByTestID('first-name-input').props.value).toBe('John');
    });
  });
});
