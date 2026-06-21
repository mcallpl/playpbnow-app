/**
 * useApi Hook Tests
 * Tests for the custom hook that manages API calls with loading, error states
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useApi } from '../hooks/useApi';
import ApiClient from '../lib/api/ApiClient';

// Mock ApiClient
jest.mock('../lib/api/ApiClient');

const mockApiClient = ApiClient.getInstance as jest.MockedFunction<typeof ApiClient.getInstance>;

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET requests on mount', () => {
    it('fetches data on component mount', async () => {
      const mockData = { id: 1, name: 'Test Player' };
      const mockGet = jest.fn().mockResolvedValueOnce(mockData);

      mockApiClient.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi('/api/players/1'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockGet).toHaveBeenCalledWith('/api/players/1');
    });

    it('handles loading state transitions', async () => {
      const mockGet = jest.fn().mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 1 }), 100))
      );

      mockApiClient.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi('/api/test'));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ id: 1 });
    });

    it('handles errors during fetch', async () => {
      const mockError = new Error('Network error');
      const mockGet = jest.fn().mockRejectedValueOnce(mockError);

      mockApiClient.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi('/api/test'));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBe(mockError);
      expect(result.current.data).toBeNull();
    });
  });

  describe('Manual refetch', () => {
    it('refetches data on demand', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ id: 1, name: 'Original' })
        .mockResolvedValueOnce({ id: 1, name: 'Updated' });

      mockApiClient.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi('/api/test'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ id: 1, name: 'Original' });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ id: 1, name: 'Updated' });
      });
    });

    it('updates loading state during refetch', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ id: 1 })
        .mockImplementationOnce(
          () => new Promise(resolve => setTimeout(() => resolve({ id: 2 }), 50))
        );

      mockApiClient.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi('/api/test'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refetch();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('POST requests', () => {
    it('executes POST request with data', async () => {
      const mockPost = jest.fn().mockResolvedValueOnce({ success: true });

      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi(null, { method: 'POST' }));

      act(() => {
        result.current.execute('/api/players', { name: 'New Player' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockPost).toHaveBeenCalledWith('/api/players', { name: 'New Player' });
    });

    it('returns response data from POST', async () => {
      const responseData = { id: 123, name: 'New Player' };
      const mockPost = jest.fn().mockResolvedValueOnce(responseData);

      mockApiClient.mockReturnValue({
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi(null, { method: 'POST' }));

      act(() => {
        result.current.execute('/api/players', { name: 'New Player' });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(responseData);
      });
    });
  });

  describe('Error state management', () => {
    it('clears error when refetch succeeds', async () => {
      const mockGet = jest.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ id: 1 });

      mockApiClient.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi('/api/test'));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data).toEqual({ id: 1 });
      });
    });

    it('allows retrying failed requests', async () => {
      const mockGet = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 1 });

      mockApiClient.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result } = renderHook(() => useApi('/api/test'));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockGet).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Dependency array', () => {
    it('refetches when dependencies change', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });

      mockApiClient.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        setAuth: jest.fn(),
        clearAuth: jest.fn(),
      } as any);

      const { result, rerender } = renderHook(
        ({ id }) => useApi(`/api/players/${id}`),
        { initialProps: { id: 1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ id: 2 });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/api/players/2');
      });
    });
  });
});
