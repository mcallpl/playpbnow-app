/**
 * API Types and Interfaces
 * Standardized error handling and response formats
 */

/**
 * Standard API response format from backend
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T | null;
  error: {
    message: string;
    code: string;
    fields?: Record<string, string[]>;
  } | null;
  timestamp: string;
}

/**
 * Base API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'API_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Validation Error - thrown when 422 response with field errors
 */
export class ValidationError extends ApiError {
  constructor(
    message: string,
    public fields: Record<string, string[]> = {}
  ) {
    super(422, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication Error - thrown on 401 or when token refresh fails
 */
export class AuthError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'AUTH_ERROR');
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Not Found Error - thrown on 404 response
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Rate Limit Error - thrown on 429 response
 */
export class RateLimitError extends ApiError {
  constructor(
    message: string = 'Too many requests',
    public retryAfter?: number
  ) {
    super(429, message, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Network Error - thrown when request fails (no response)
 */
export class NetworkError extends ApiError {
  constructor(message: string = 'Network request failed') {
    super(0, message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Timeout Error - thrown when request exceeds timeout
 */
export class TimeoutError extends ApiError {
  constructor(timeout: number = 30000) {
    super(0, `Request timeout after ${timeout}ms`, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Options for API request
 */
export interface RequestOptions {
  timeout?: number;
  retryCount?: number;
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

/**
 * Result type for useApi hook
 */
export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (payload?: any) => Promise<T>;
  refetch: () => Promise<T>;
}

/**
 * Options for useApi hook
 */
export interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  timeout?: number;
}
