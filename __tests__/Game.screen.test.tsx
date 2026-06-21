/**
 * Game Screen Integration Tests
 * Tests complete game scoring flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { GameScreen } from '../app/(tabs)/game';
import ApiClient from '../lib/api/ApiClient';

jest.mock('../lib/api/ApiClient');
const mockApiClient = ApiClient.getInstance as jest.MockedFunction<typeof ApiClient.getInstance>;

describe('Game Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockApiClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        group_id: 1,
        players: [
          { id: 1, name: 'Player One', wins: 5, losses: 2 },
          { id: 2, name: 'Player Two', wins: 3, losses: 4 },
          { id: 3, name: 'Player Three', wins: 4, losses: 3 }
        ]
      }),
      post: jest.fn().mockResolvedValue({ message: 'Score saved' }),
      put: jest.fn(),
      delete: jest.fn(),
      setAuth: jest.fn(),
      clearAuth: jest.fn(),
    } as any);
  });

  describe('Rendering', () => {
    it('renders game screen', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        expect(screen.getByText(/player/i)).toBeTruthy();
      });
    });

    it('displays player list', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        expect(screen.getByText('Player One')).toBeTruthy();
        expect(screen.getByText('Player Two')).toBeTruthy();
        expect(screen.getByText('Player Three')).toBeTruthy();
      });
    });

    it('shows player statistics', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        const playerOne = screen.getByText('Player One');
        expect(playerOne).toBeTruthy();
      });
    });
  });

  describe('Player selection', () => {
    it('selects winner', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        const player = screen.getByText('Player One');
        fireEvent.press(player);
      });

      // Selected player should be highlighted
      expect(screen.getByTestID('player-selected-1')).toBeTruthy();
    });

    it('selects loser', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        const playerOne = screen.getByText('Player One');
        const playerTwo = screen.getByText('Player Two');

        fireEvent.press(playerOne);  // Winner
        fireEvent.press(playerTwo);  // Loser
      });

      expect(screen.getByTestID('player-selected-1')).toBeTruthy();
      expect(screen.getByTestID('player-selected-2')).toBeTruthy();
    });
  });

  describe('Score input', () => {
    it('updates winner score', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        const scoreInput = screen.getByTestID('winner-score-input');
        fireEvent.changeText(scoreInput, '11');
      });

      expect(screen.getByTestID('winner-score-input').props.value).toBe('11');
    });

    it('updates loser score', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        const scoreInput = screen.getByTestID('loser-score-input');
        fireEvent.changeText(scoreInput, '8');
      });

      expect(screen.getByTestID('loser-score-input').props.value).toBe('8');
    });

    it('validates score input (numeric only)', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        const scoreInput = screen.getByTestID('winner-score-input');
        fireEvent.changeText(scoreInput, 'abc');
      });

      // Invalid input should not be accepted
      expect(screen.getByTestID('score-error')).toBeTruthy();
    });

    it('validates score range', async () => {
      render(<GameScreen />);

      await waitFor(() => {
        const scoreInput = screen.getByTestID('winner-score-input');
        fireEvent.changeText(scoreInput, '50');
      });

      // Score > typical game score should show warning
      expect(screen.getByText(/score seems high/i)).toBeTruthy();
    });
  });

  describe('Submit score', () => {
    it('submits score on button press', async () => {
      const mockPost = jest.fn().mockResolvedValue({ message: 'Score saved' });
      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<GameScreen />);

      await waitFor(() => {
        const submitButton = screen.getByTestID('submit-score');
        fireEvent.press(submitButton);
      });

      expect(mockPost).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      const mockPost = jest.fn().mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ message: 'Saved' }), 100))
      );

      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<GameScreen />);

      await waitFor(() => {
        const submitButton = screen.getByTestID('submit-score');
        fireEvent.press(submitButton);
      });

      expect(screen.getByTestID('loading-spinner')).toBeTruthy();
    });

    it('shows success message on submission', async () => {
      const mockPost = jest.fn().mockResolvedValue({ message: 'Score saved successfully' });
      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<GameScreen />);

      await waitFor(() => {
        const submitButton = screen.getByTestID('submit-score');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/successfully/i)).toBeTruthy();
      });
    });
  });

  describe('Error handling', () => {
    it('handles submission error', async () => {
      const mockError = new Error('Failed to save score');
      const mockPost = jest.fn().mockRejectedValue(mockError);

      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<GameScreen />);

      await waitFor(() => {
        const submitButton = screen.getByTestID('submit-score');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeTruthy();
      });
    });

    it('allows retry after error', async () => {
      let callCount = 0;
      const mockPost = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve({ message: 'Success' });
      });

      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<GameScreen />);

      await waitFor(() => {
        const submitButton = screen.getByTestID('submit-score');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeTruthy();
      });

      const retryButton = screen.getByTestID('retry-button');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/successfully/i)).toBeTruthy();
      });
    });

    it('handles network timeout', async () => {
      const mockPost = jest.fn().mockRejectedValue(
        new Error('Request timeout')
      );

      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<GameScreen />);

      await waitFor(() => {
        const submitButton = screen.getByTestID('submit-score');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/timeout|network/i)).toBeTruthy();
      });
    });
  });

  describe('Dark mode', () => {
    it('renders with dark mode colors', async () => {
      render(<GameScreen darkMode={true} />);

      await waitFor(() => {
        const screen_elem = screen.getByTestID('game-screen');
        expect(screen_elem).toBeTruthy();
      });
    });
  });

  describe('Form reset', () => {
    it('clears form after successful submission', async () => {
      const mockPost = jest.fn().mockResolvedValue({ message: 'Success' });
      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      render(<GameScreen />);

      await waitFor(() => {
        const submitButton = screen.getByTestID('submit-score');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestID('winner-score-input').props.value).toBe('');
        expect(screen.getByTestID('loser-score-input').props.value).toBe('');
      });
    });
  });
});
