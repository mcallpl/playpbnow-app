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

  // Track if we've executed already (for immediate requests)
  const hasExecutedRef = useRef(!immediate);

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
   * Auto-execute on mount if immediate is true
   */
  useEffect(() => {
    if (immediate && !hasExecutedRef.current) {
      hasExecutedRef.current = true;
      execute().catch((err) => {
        // Error is already handled in execute()
        if (__DEV__) {
          console.error(`[useApi] Initial request failed: ${path}`, err);
        }
      });
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [immediate, execute, path]);

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
            newData[key] = value;
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
