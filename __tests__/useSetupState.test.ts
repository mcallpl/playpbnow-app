/**
 * useSetupState Hook Tests
 * Tests reducer state transitions and action handling
 */

import { useReducer } from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useSetupState } from '../hooks/useSetupState';

describe('useSetupState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('has initial state with all steps', () => {
      const { result } = renderHook(() => useSetupState());

      expect(result.current.state).toEqual({
        currentStep: 0,
        photo: null,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: null,
        playLevel: '',
        gender: '',
        daysToPlay: [],
        isComplete: false,
        errors: {}
      });
    });

    it('starts at step 0 (photo)', () => {
      const { result } = renderHook(() => useSetupState());

      expect(result.current.state.currentStep).toBe(0);
    });

    it('has no errors initially', () => {
      const { result } = renderHook(() => useSetupState());

      expect(result.current.state.errors).toEqual({});
    });
  });

  describe('Navigation', () => {
    it('moves to next step', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(1);
    });

    it('moves to previous step', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.nextStep();
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(2);

      act(() => {
        result.current.previousStep();
      });

      expect(result.current.state.currentStep).toBe(1);
    });

    it('prevents navigation before first step', () => {
      const { result } = renderHook(() => useSetupState());

      expect(result.current.state.currentStep).toBe(0);

      act(() => {
        result.current.previousStep();
      });

      expect(result.current.state.currentStep).toBe(0);
    });

    it('prevents navigation after last step', () => {
      const { result } = renderHook(() => useSetupState());

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.nextStep();
        });
      }

      const lastStep = result.current.state.currentStep;

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(lastStep);
    });

    it('jumps to specific step', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.state.currentStep).toBe(3);
    });
  });

  describe('Photo step', () => {
    it('updates photo from image picker', () => {
      const { result } = renderHook(() => useSetupState());

      const photoUri = 'file:///path/to/photo.jpg';

      act(() => {
        result.current.setPhoto(photoUri);
      });

      expect(result.current.state.photo).toBe(photoUri);
    });

    it('clears photo', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setPhoto('file:///photo.jpg');
      });

      expect(result.current.state.photo).not.toBeNull();

      act(() => {
        result.current.setPhoto(null);
      });

      expect(result.current.state.photo).toBeNull();
    });
  });

  describe('Profile step', () => {
    it('updates first name', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setFirstName('John');
      });

      expect(result.current.state.firstName).toBe('John');
    });

    it('updates last name', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setLastName('Doe');
      });

      expect(result.current.state.lastName).toBe('Doe');
    });

    it('updates email', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setEmail('john@example.com');
      });

      expect(result.current.state.email).toBe('john@example.com');
    });

    it('updates phone', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setPhone('5551234567');
      });

      expect(result.current.state.phone).toBe('5551234567');
    });
  });

  describe('Location step', () => {
    it('updates location from geolocation', () => {
      const { result } = renderHook(() => useSetupState());

      const location = {
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        state: 'NY'
      };

      act(() => {
        result.current.setLocation(location);
      });

      expect(result.current.state.location).toEqual(location);
    });

    it('handles location error gracefully', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setLocation(null);
      });

      expect(result.current.state.location).toBeNull();
    });
  });

  describe('Preferences step', () => {
    it('updates play level', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setPlayLevel('Advanced');
      });

      expect(result.current.state.playLevel).toBe('Advanced');
    });

    it('updates gender', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setGender('M');
      });

      expect(result.current.state.gender).toBe('M');
    });

    it('updates days to play (adds)', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.addDayToPlay('Monday');
      });

      expect(result.current.state.daysToPlay).toContain('Monday');
    });

    it('updates days to play (removes)', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.addDayToPlay('Monday');
        result.current.addDayToPlay('Wednesday');
      });

      expect(result.current.state.daysToPlay).toEqual(['Monday', 'Wednesday']);

      act(() => {
        result.current.removeDayFromPlay('Monday');
      });

      expect(result.current.state.daysToPlay).toEqual(['Wednesday']);
    });

    it('prevents duplicate days', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.addDayToPlay('Monday');
        result.current.addDayToPlay('Monday');
      });

      expect(result.current.state.daysToPlay).toEqual(['Monday']);
    });
  });

  describe('Validation', () => {
    it('validates required fields', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.validateStep(1);  // Profile step
      });

      // Should have errors for empty fields
      expect(Object.keys(result.current.state.errors).length).toBeGreaterThan(0);
    });

    it('clears errors when valid', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setFirstName('John');
        result.current.setLastName('Doe');
        result.current.setEmail('john@example.com');
        result.current.validateStep(1);
      });

      expect(Object.keys(result.current.state.errors).length).toBe(0);
    });

    it('validates email format', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setEmail('invalid-email');
        result.current.validateStep(1);
      });

      expect(result.current.state.errors['email']).toBeDefined();
    });

    it('validates phone format', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setPhone('123');
        result.current.validateStep(1);
      });

      expect(result.current.state.errors['phone']).toBeDefined();
    });
  });

  describe('Summary review', () => {
    it('provides summary of all data', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setFirstName('John');
        result.current.setLastName('Doe');
        result.current.setEmail('john@example.com');
        result.current.setPhone('5551234567');
        result.current.setPlayLevel('Advanced');
        result.current.setGender('M');
      });

      const summary = result.current.getSummary();

      expect(summary.firstName).toBe('John');
      expect(summary.lastName).toBe('Doe');
      expect(summary.email).toBe('john@example.com');
      expect(summary.phone).toBe('5551234567');
      expect(summary.playLevel).toBe('Advanced');
      expect(summary.gender).toBe('M');
    });
  });

  describe('Final submission', () => {
    it('validates all steps before submission', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setFirstName('John');
        result.current.setLastName('Doe');
        result.current.setEmail('john@example.com');
        result.current.setPhone('5551234567');
        result.current.setPlayLevel('Advanced');
        result.current.setGender('M');
        result.current.addDayToPlay('Monday');
      });

      const isValid = result.current.validateAllSteps();

      expect(isValid).toBe(true);
    });

    it('marks setup as complete', () => {
      const { result } = renderHook(() => useSetupState());

      expect(result.current.state.isComplete).toBe(false);

      act(() => {
        result.current.completeSetup();
      });

      expect(result.current.state.isComplete).toBe(true);
    });

    it('returns complete state data', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setFirstName('John');
        result.current.setLastName('Doe');
        result.current.setEmail('john@example.com');
        result.current.setPhone('5551234567');
        result.current.setPlayLevel('Advanced');
        result.current.setGender('M');
        result.current.setLocation({
          latitude: 40.7128,
          longitude: -74.0060,
          city: 'New York',
          state: 'NY'
        });
      });

      const data = result.current.getSubmissionData();

      expect(data).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '5551234567',
        playLevel: 'Advanced',
        gender: 'M',
        location: expect.any(Object),
        daysToPlay: expect.any(Array)
      });
    });
  });

  describe('State persistence', () => {
    it('resets state', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => {
        result.current.setFirstName('John');
        result.current.nextStep();
      });

      expect(result.current.state.firstName).toBe('John');
      expect(result.current.state.currentStep).toBe(1);

      act(() => {
        result.current.resetSetup();
      });

      expect(result.current.state.firstName).toBe('');
      expect(result.current.state.currentStep).toBe(0);
    });
  });
});
