/**
 * useApi Hook Tests
 *
 * Rewritten against the real hook. The previous version called
 * useApi('/path') and mocked ApiClient.getInstance().get/.post — neither
 * exists. The signature is useApi(method, path, options), it returns
 * { data, loading, error, execute, refetch }, and it goes through the
 * singleton's request() for every verb.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useApi, useApiMultiple } from '../hooks/useApi';
import apiClient from '../lib/api/ApiClient';

jest.mock('../lib/api/ApiClient', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

const mockRequest = apiClient.request as jest.Mock;

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({});
  });

  describe('GET requests on mount', () => {
    it('fetches on mount and exposes the data', async () => {
      const player = { id: 1, name: 'Test Player' };
      mockRequest.mockResolvedValueOnce(player);

      const { result } = renderHook(() => useApi('GET', '/players/1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toEqual(player);
      expect(result.current.error).toBeNull();
      expect(mockRequest).toHaveBeenCalledWith(
        'GET',
        '/players/1',
        undefined,
        expect.objectContaining({ retryCount: 3, timeout: 30000 })
      );
    });

    it('surfaces the error and leaves data null when the request fails', async () => {
      const boom = new Error('Network error');
      mockRequest.mockRejectedValueOnce(boom);

      const { result } = renderHook(() => useApi('GET', '/players/1'));

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(result.current.error).toBe(boom);
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('does not auto-fetch for non-GET verbs', async () => {
      renderHook(() => useApi('POST', '/players'));

      // give any stray effect a chance to fire
      await act(async () => {});

      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('refetches when the path changes', async () => {
      // Regression: the old effect guarded on a fire-once boolean that was
      // never cleared, so a component whose path changed kept the first
      // response forever.
      mockRequest
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });

      const { result, rerender } = renderHook(
        ({ id }: { id: number }) => useApi('GET', `/players/${id}`),
        { initialProps: { id: 1 } }
      );

      await waitFor(() => expect(result.current.data).toEqual({ id: 1 }));

      rerender({ id: 2 });

      await waitFor(() => expect(result.current.data).toEqual({ id: 2 }));
      expect(mockRequest).toHaveBeenCalledWith('GET', '/players/2', undefined, expect.anything());
    });

    it('does not refetch when re-rendered with the same target', async () => {
      const { rerender, result } = renderHook(() => useApi('GET', '/players/1'));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockRequest).toHaveBeenCalledTimes(1);

      rerender({});
      await act(async () => {});

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual execution', () => {
    it('sends the payload for a POST and returns the response', async () => {
      mockRequest.mockResolvedValueOnce({ id: 123 });

      const { result } = renderHook(() => useApi('POST', '/players'));

      let returned: any;
      await act(async () => {
        returned = await result.current.execute({ name: 'New Player' });
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'POST',
        '/players',
        { name: 'New Player' },
        expect.anything()
      );
      expect(returned).toEqual({ id: 123 });
      expect(result.current.data).toEqual({ id: 123 });
    });

    it('rethrows so the caller can handle failures too', async () => {
      mockRequest.mockRejectedValueOnce(new Error('nope'));

      const { result } = renderHook(() => useApi('POST', '/players'));

      await act(async () => {
        await expect(result.current.execute({})).rejects.toThrow('nope');
      });

      expect(result.current.error).toBeTruthy();
    });

    it('refetch re-issues the request', async () => {
      mockRequest
        .mockResolvedValueOnce({ name: 'Original' })
        .mockResolvedValueOnce({ name: 'Updated' });

      const { result } = renderHook(() => useApi('GET', '/players/1'));

      await waitFor(() => expect(result.current.data).toEqual({ name: 'Original' }));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toEqual({ name: 'Updated' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('clears a previous error once a retry succeeds', async () => {
      mockRequest
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ id: 1 });

      const { result } = renderHook(() => useApi('GET', '/players/1'));

      await waitFor(() => expect(result.current.error).toBeTruthy());

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual({ id: 1 });
    });
  });

  describe('Callbacks', () => {
    it('calls onSuccess with the result', async () => {
      const onSuccess = jest.fn();
      mockRequest.mockResolvedValueOnce({ id: 7 });

      const { result } = renderHook(() => useApi('GET', '/players/7', { onSuccess }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(onSuccess).toHaveBeenCalledWith({ id: 7 });
    });

    it('calls onError with the failure', async () => {
      const onError = jest.fn();
      const boom = new Error('down');
      mockRequest.mockRejectedValueOnce(boom);

      const { result } = renderHook(() => useApi('GET', '/players/7', { onError }));

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(onError).toHaveBeenCalledWith(boom);
    });

    it('keeps working when the caller passes inline callbacks', async () => {
      // Regression: unmount tracking used to live in the auto-fetch effect's
      // cleanup, which React runs on every dependency change. An inline
      // onSuccess re-creates `execute` each render, so the very first re-render
      // marked the hook unmounted and it silently stopped updating state.
      mockRequest.mockResolvedValue({ ok: true });

      const { result, rerender } = renderHook(() =>
        useApi('GET', '/players/1', { onSuccess: () => {}, onError: () => {} })
      );

      await waitFor(() => expect(result.current.data).toEqual({ ok: true }));

      rerender({});

      mockRequest.mockResolvedValueOnce({ ok: 'still alive' });
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ ok: 'still alive' });
    });
  });

  describe('Unmount safety', () => {
    it('does not apply a response that lands after unmount', async () => {
      let resolve!: (v: any) => void;
      mockRequest.mockReturnValueOnce(new Promise(r => { resolve = r; }));

      const { result, unmount } = renderHook(() => useApi('GET', '/players/1'));

      unmount();
      await act(async () => {
        resolve({ id: 1 });
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useApiMultiple', () => {
    it('fetches every source and keys the results', async () => {
      mockRequest.mockImplementation((_m: string, path: string) =>
        Promise.resolve({ from: path })
      );

      const { result } = renderHook(() =>
        useApiMultiple({
          players: { method: 'GET', path: '/players' },
          courts: { method: 'GET', path: '/courts' },
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data.players).toEqual({ from: '/players' });
      expect(result.current.data.courts).toEqual({ from: '/courts' });
      expect(result.current.error).toEqual({});
    });

    it('keeps the sources that worked when one fails', async () => {
      // Promise.allSettled, so one bad endpoint must not blank the others.
      mockRequest.mockImplementation((_m: string, path: string) =>
        path === '/courts'
          ? Promise.reject(new Error('courts down'))
          : Promise.resolve({ from: path })
      );

      const { result } = renderHook(() =>
        useApiMultiple({
          players: { method: 'GET', path: '/players' },
          courts: { method: 'GET', path: '/courts' },
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data.players).toEqual({ from: '/players' });
      expect(result.current.data.courts).toBeUndefined();
      expect(result.current.error.courts).toBeInstanceOf(Error);
      expect(result.current.error.players).toBeUndefined();
    });

    it('refetch can target a single source', async () => {
      mockRequest.mockImplementation((_m: string, path: string) =>
        Promise.resolve({ from: path })
      );

      const { result } = renderHook(() =>
        useApiMultiple({
          players: { method: 'GET', path: '/players' },
          courts: { method: 'GET', path: '/courts' },
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      mockRequest.mockClear();

      await act(async () => {
        await result.current.refetch(['courts']);
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith('GET', '/courts', undefined, expect.anything());
    });
  });
});
