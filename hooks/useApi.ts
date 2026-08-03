/**
 * useApi - Custom hook for data fetching with ApiClient
 * Provides loading, error, data states and refetch/execute methods
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '../lib/api/ApiClient';
import { UseApiResult, UseApiOptions } from '../lib/api/types';

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export function useApi<T>(
  method: HTTPMethod,
  path: string,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const {
    immediate = method === 'GET', // Auto-execute GET requests on mount
    onSuccess,
    onError,
    retryCount = 3,
    timeout = 30000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Identifies the request the auto-fetch effect last fired, so a changed
  // method/path fetches again while a re-render with the same target does not.
  const lastAutoFetchedRef = useRef<string | null>(null);

  /**
   * Main execute function - performs the API request
   */
  const execute = useCallback(
    async (payload?: any): Promise<T> => {
      // Don't execute if unmounted
      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }

      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.request<T>(method, path, payload, {
          retryCount,
          timeout,
        });

        if (isMountedRef.current) {
          setData(result);
          setLoading(false);

          if (onSuccess) {
            onSuccess(result);
          }
        }

        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));

        if (isMountedRef.current) {
          setError(errorObj);
          setLoading(false);

          if (onError) {
            onError(errorObj);
          }
        }

        throw errorObj;
      }
    },
    [method, path, onSuccess, onError, retryCount, timeout]
  );

  /**
   * Refetch - re-execute the same request (for GET)
   */
  const refetch = useCallback(async (): Promise<T> => {
    return execute();
  }, [execute]);

  /**
   * Unmount tracking.
   *
   * This has to be its own effect with an empty dep array. It used to be the
   * cleanup of the auto-fetch effect below, which runs on every dependency
   * change, not just unmount — so the first time `execute` changed identity
   * (any caller passing an inline onSuccess/onError re-creates it every render)
   * the ref flipped to false and never came back. From that point the hook was
   * permanently "unmounted": every state update was skipped, so data, loading
   * and error froze and execute() threw 'Component unmounted'.
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Auto-execute on mount, and again whenever the target changes.
   *
   * Keyed on method+path rather than a fire-once boolean: the old flag was set
   * on the first run and never cleared, so a component that changed its path
   * (e.g. /players/1 -> /players/2) kept showing the first response forever.
   */
  useEffect(() => {
    if (!immediate) return;

    const target = `${method} ${path}`;
    if (lastAutoFetchedRef.current === target) return;
    lastAutoFetchedRef.current = target;

    execute().catch((err) => {
      // Error is already handled in execute()
      if (__DEV__) {
        console.error(`[useApi] Initial request failed: ${path}`, err);
      }
    });
  }, [immediate, method, path, execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch,
  };
}

/**
 * Advanced hook variant that supports multiple concurrent requests
 * Useful for loading multiple data sources in parallel
 */
export function useApiMultiple<T extends Record<string, any>>(
  requests: {
    [K in keyof T]: {
      method: HTTPMethod;
      path: string;
      options?: UseApiOptions<T[K]>;
    };
  }
): {
  data: Partial<T>;
  loading: boolean;
  error: Partial<Record<keyof T, Error>>;
  refetch: (keys?: (keyof T)[]) => Promise<void>;
} {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Partial<Record<keyof T, Error>>>({});
  const isMountedRef = useRef(true);

  const executeAll = useCallback(async (keys?: (keyof T)[]) => {
    const keysToFetch = keys || (Object.keys(requests) as (keyof T)[]);

    setLoading(true);

    const results = await Promise.allSettled(
      keysToFetch.map(async (key) => {
        const req = requests[key];
        try {
          const result = await apiClient.request(req.method, req.path, undefined, {
            timeout: req.options?.timeout || 30000,
            retryCount: req.options?.retryCount || 3,
          });

          return { key, result, error: null };
        } catch (err) {
          return { key, result: null, error: err instanceof Error ? err : new Error(String(err)) };
        }
      })
    );

    if (isMountedRef.current) {
      const newData: Partial<T> = { ...data };
      const newErrors: Partial<Record<keyof T, Error>> = { ...error };

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { key, result: value, error: err } = result.value;
          if (value) {
            // apiClient.request returns untyped JSON, so TS cannot prove this
            // matches T[keyof T]. The caller declares the shape via the hook's
            // generic; this cast is where that assertion is made explicit.
            newData[key] = value as T[keyof T];
            delete newErrors[key];
          }
          if (err) {
            newErrors[key] = err;
          }
        }
      });

      setData(newData);
      setError(newErrors);
      setLoading(false);
    }
  }, [requests, data, error]);

  useEffect(() => {
    executeAll();

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return {
    data,
    loading,
    error,
    refetch: executeAll,
  };
}
