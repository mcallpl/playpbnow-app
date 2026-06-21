/**
 * ApiClient - Centralized HTTP client singleton
 * Manages authentication, request/response handling, retries, and error normalization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiError,
  ValidationError,
  AuthError,
  NotFoundError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  RequestOptions,
} from './types';

const API_BASE_URL = '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

export class ApiClient {
  private static instance: ApiClient;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {}

  /**
   * Get or create singleton instance
   */
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Generic request method - base for all HTTP calls
   */
  public async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT, retryCount = MAX_RETRIES, skipAuth = false } = options;

    // Validate and normalize path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Attempt request with retries
    return this.retry(
      async () => {
        const url = `${API_BASE_URL}${normalizedPath}`;
        const headers = await this.buildHeaders(skipAuth, options.headers);

        // Log outgoing request
        this.logRequest(method, path, data);

        // Create abort controller for timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeout);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: method !== 'GET' ? JSON.stringify(data) : undefined,
            signal: abortController.signal,
          });

          clearTimeout(timeoutId);

          // Parse response
          const responseData = await this.parseResponse<T>(response);

          // Log successful response
          this.logSuccess(method, path, response.status);

          return responseData;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
      retryCount
    );
  }

  /**
   * GET request
   */
  public async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * POST request
   */
  public async post<T>(path: string, data: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * PUT request
   */
  public async put<T>(path: string, data: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * DELETE request
   */
  public async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Get and manage authentication token
   * Automatically refreshes on 401
   */
  private async ensureAuthenticated(skipAuth: boolean = false): Promise<string | null> {
    if (skipAuth) {
      return null;
    }

    let token = await AsyncStorage.getItem('auth_token');

    // If no token, return null (will result in 401 from API)
    if (!token) {
      return null;
    }

    return token;
  }

  /**
   * Attempt to refresh authentication token
   * Called when 401 response received
   */
  private async refreshToken(): Promise<string> {
    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new AuthError('Token refresh failed');
        }

        const data = await response.json();

        if (data.status === 'success' && data.data?.token) {
          const newToken = data.data.token;
          await AsyncStorage.setItem('auth_token', newToken);
          return newToken;
        }

        throw new AuthError('Invalid refresh response');
      } catch (error) {
        // Clear token and signal auth failure
        await AsyncStorage.removeItem('auth_token');
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Build request headers with auth token
   */
  private async buildHeaders(
    skipAuth: boolean = false,
    customHeaders: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (!skipAuth) {
      const token = await this.ensureAuthenticated(skipAuth);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Parse response and handle errors
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    // Handle timeout
    if (!response.ok && response.status === 0) {
      throw new TimeoutError();
    }

    let data: any;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    // Handle different status codes
    if (response.status === 401) {
      // Try to refresh token
      try {
        await this.refreshToken();
        throw new AuthError('Token expired, please login again');
      } catch {
        throw new AuthError('Authentication failed');
      }
    }

    if (response.status === 404) {
      throw new NotFoundError(data.error?.message || 'Resource');
    }

    if (response.status === 422) {
      // Validation error with field errors
      throw new ValidationError(
        data.error?.message || 'Validation failed',
        data.error?.fields || {}
      );
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      throw new RateLimitError('Too many requests', retryAfter);
    }

    // Handle 5xx errors
    if (response.status >= 500) {
      throw new ApiError(
        response.status,
        data.error?.message || 'Server error',
        data.error?.code || 'SERVER_ERROR'
      );
    }

    // Handle general 4xx errors
    if (response.status >= 400) {
      throw new ApiError(
        response.status,
        data.error?.message || 'Client error',
        data.error?.code || 'CLIENT_ERROR'
      );
    }

    // Success: verify response format and extract data
    if (data.status === 'success') {
      return data.data as T;
    }

    // If response is not in standard format, return as-is
    if (data && typeof data === 'object') {
      return data as T;
    }

    return data as T;
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retry<T>(fn: () => Promise<T>, maxRetries: number = MAX_RETRIES): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;

        // Don't retry on client errors (4xx) unless it's 429
        if (err instanceof ApiError && err.statusCode >= 400 && err.statusCode !== 429) {
          throw err;
        }

        // Don't retry on validation errors
        if (err instanceof ValidationError) {
          throw err;
        }

        // Don't retry on auth errors
        if (err instanceof AuthError) {
          throw err;
        }

        // On last attempt, throw the error
        if (attempt === maxRetries) {
          throw err;
        }

        // Calculate exponential backoff delay
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new NetworkError('Request failed');
  }

  /**
   * Simple sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Logging utilities
   */
  private logRequest(method: string, path: string, data?: any): void {
    if (__DEV__) {
      console.log(`[API] ${method} ${path}`, data ? JSON.stringify(data).substring(0, 100) : '');
    }
  }

  private logSuccess(method: string, path: string, status: number): void {
    if (__DEV__) {
      console.log(`[API] ${method} ${path} → ${status}`);
    }
  }

  private logError(method: string, path: string, error: Error): void {
    if (__DEV__) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN';
      console.error(`[API] ${method} ${path} → ${code}`, error.message);
    }
  }

  /**
   * Clear authentication (logout)
   */
  public async clearAuth(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
  }

  /**
   * Set authentication token (login)
   */
  public async setAuth(token: string): Promise<void> {
    await AsyncStorage.setItem('auth_token', token);
  }
}

// Export singleton instance as default
export default ApiClient.getInstance();
