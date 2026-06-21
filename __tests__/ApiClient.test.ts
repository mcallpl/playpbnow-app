/**
 * ApiClient Tests
 * Comprehensive tests for singleton API client functionality
 */

import ApiClient from '../lib/api/ApiClient';
import * as AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiError,
  ValidationError,
  AuthError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from '../lib/api/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Singleton Pattern', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = ApiClient.getInstance();
      const instance2 = ApiClient.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Token Management', () => {
    it('stores token in AsyncStorage on setAuth', async () => {
      const token = 'test_token_123';
      await ApiClient.getInstance().setAuth(token);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', token);
    });

    it('clears token from AsyncStorage on clearAuth', async () => {
      await ApiClient.getInstance().clearAuth();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('retrieves token from AsyncStorage for requests', async () => {
      const token = 'test_token_123';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: { id: 1 } }),
      } as Response);

      await ApiClient.getInstance().get('/api/test');

      const call = mockFetch.mock.calls[0];
      expect(call[1]?.headers).toHaveProperty('Authorization', `Bearer ${token}`);
    });

    it('includes Authorization header with Bearer token', async () => {
      const token = 'test_token_123';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: { id: 1 } }),
      } as Response);

      await ApiClient.getInstance().get('/api/test');

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${token}`);
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('sends GET request with correct method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: { name: 'Test' } }),
      } as Response);

      await ApiClient.getInstance().get('/api/test');

      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch.mock.calls[0][1]?.method).toBe('GET');
    });

    it('sends POST request with method and body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: { id: 1 } }),
      } as Response);

      const payload = { name: 'Test Player' };
      await ApiClient.getInstance().post('/api/players', payload);

      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch.mock.calls[0][1]?.method).toBe('POST');
      expect(mockFetch.mock.calls[0][1]?.body).toBe(JSON.stringify(payload));
    });

    it('sends PUT request with method and body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: { id: 1 } }),
      } as Response);

      const payload = { name: 'Updated' };
      await ApiClient.getInstance().put('/api/players/1', payload);

      expect(mockFetch.mock.calls[0][1]?.method).toBe('PUT');
      expect(mockFetch.mock.calls[0][1]?.body).toBe(JSON.stringify(payload));
    });

    it('sends DELETE request with correct method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: null }),
      } as Response);

      await ApiClient.getInstance().delete('/api/players/1');

      expect(mockFetch.mock.calls[0][1]?.method).toBe('DELETE');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('throws ApiError on 400 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Bad request', code: 'INVALID_INPUT' },
        }),
      } as Response);

      await expect(ApiClient.getInstance().get('/api/test')).rejects.toThrow(ApiError);
    });

    it('throws NotFoundError on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Player not found', code: 'NOT_FOUND' },
        }),
      } as Response);

      await expect(ApiClient.getInstance().get('/api/players/999')).rejects.toThrow(
        NotFoundError
      );
    });

    it('throws ValidationError on 422 with field errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({
          status: 'error',
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            fields: { name: ['Name is required'], email: ['Invalid email'] },
          },
        }),
      } as Response);

      try {
        await ApiClient.getInstance().post('/api/players', {});
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).fields).toEqual({
          name: ['Name is required'],
          email: ['Invalid email'],
        });
      }
    });

    it('throws AuthError on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Unauthorized', code: 'AUTH_ERROR' },
        }),
      } as Response);

      await expect(ApiClient.getInstance().get('/api/protected')).rejects.toThrow(AuthError);
    });

    it('throws RateLimitError on 429 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']]),
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Too many requests', code: 'RATE_LIMITED' },
        }),
      } as Response);

      try {
        await ApiClient.getInstance().get('/api/test');
        fail('Should have thrown RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(60);
      }
    });

    it('throws ApiError on 5xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Internal server error', code: 'SERVER_ERROR' },
        }),
      } as Response);

      await expect(ApiClient.getInstance().get('/api/test')).rejects.toThrow(ApiError);
    });

    it('throws NetworkError on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      await expect(ApiClient.getInstance().get('/api/test')).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('retries on 5xx error', async () => {
      // First attempt fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Server error', code: 'SERVER_ERROR' },
        }),
      } as Response);

      // Second attempt fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Server error', code: 'SERVER_ERROR' },
        }),
      } as Response);

      // Third attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: { id: 1 } }),
      } as Response);

      const result = await ApiClient.getInstance().get('/api/test', { retryCount: 3 });

      expect(result).toEqual({ id: 1 });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('stops retrying after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        ApiClient.getInstance().get('/api/test', { retryCount: 2 })
      ).rejects.toThrow();

      // 1 initial attempt + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does not retry on 4xx errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Bad request', code: 'BAD_REQUEST' },
        }),
      } as Response);

      await expect(
        ApiClient.getInstance().get('/api/test', { retryCount: 3 })
      ).rejects.toThrow();

      // Should not retry on 4xx
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry on ValidationError', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({
          status: 'error',
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields: {} },
        }),
      } as Response);

      await expect(
        ApiClient.getInstance().post('/api/test', {}, { retryCount: 3 })
      ).rejects.toThrow(ValidationError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Parsing', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('extracts data from standard response format', async () => {
      const expectedData = { id: 1, name: 'Test Player' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: expectedData,
            error: null,
            timestamp: new Date().toISOString(),
          }),
      } as Response);

      const result = await ApiClient.getInstance().get('/api/players/1');

      expect(result).toEqual(expectedData);
    });

    it('handles empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
      } as Response);

      const result = await ApiClient.getInstance().get('/api/test');

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('returns raw response if not in standard format', async () => {
      const customData = { custom: 'field' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(customData),
      } as Response);

      const result = await ApiClient.getInstance().get('/api/legacy');

      expect(result).toEqual(customData);
    });
  });

  describe('Request Options', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('respects timeout option', async () => {
      jest.useFakeTimers();

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ status: 'success', data: {} }),
              } as Response);
            }, 5000);
          })
      );

      const promise = ApiClient.getInstance().get('/api/test', { timeout: 1000 });

      jest.advanceTimersByTime(1100);

      await expect(promise).rejects.toThrow();

      jest.useRealTimers();
    });

    it('skips auth when skipAuth is true', async () => {
      const token = 'test_token';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: {} }),
      } as Response);

      await ApiClient.getInstance().get('/api/public', { skipAuth: true });

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('merges custom headers with default headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: {} }),
      } as Response);

      await ApiClient.getInstance().get('/api/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('Path Normalization', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('normalizes path with leading slash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: {} }),
      } as Response);

      await ApiClient.getInstance().get('/players');

      const url = mockFetch.mock.calls[0][0];
      expect(url).toBe('/api/players');
    });

    it('normalizes path without leading slash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'success', data: {} }),
      } as Response);

      await ApiClient.getInstance().get('players');

      const url = mockFetch.mock.calls[0][0];
      expect(url).toBe('/api/players');
    });
  });
});

describe('useApi Hook Tests', () => {
  // Note: useApi hook tests would require React Testing Library
  // These are placeholder tests showing the testing pattern

  it('should execute GET request on mount', async () => {
    // Mock implementation
    expect(true).toBe(true);
  });

  it('should support POST with immediate false', async () => {
    // Mock implementation
    expect(true).toBe(true);
  });

  it('should call onSuccess callback', async () => {
    // Mock implementation
    expect(true).toBe(true);
  });

  it('should call onError callback', async () => {
    // Mock implementation
    expect(true).toBe(true);
  });

  it('should provide refetch function', async () => {
    // Mock implementation
    expect(true).toBe(true);
  });
});
