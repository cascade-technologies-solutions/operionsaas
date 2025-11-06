// API Client with interceptors and error handling
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// Use environment variable or fallback to default
// In development with Vite proxy, use relative URL to avoid cross-origin issues
// The proxy in vite.config.ts will forward /api requests to the backend
let API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api');
let WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'ws://localhost:3000' : 'ws://localhost:3000');

// Helper function to upgrade HTTP to HTTPS if page is loaded over HTTPS
function upgradeToHTTPS(url: string): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }
    if (url.startsWith('ws://')) {
      url = url.replace('ws://', 'wss://');
    }
  }
  return url;
}

// Auto-upgrade HTTP to HTTPS if page is loaded over HTTPS (to prevent mixed content errors)
if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  // If page is HTTPS, upgrade HTTP API URLs to HTTPS
  if (API_URL.startsWith('http://')) {
    API_URL = API_URL.replace('http://', 'https://');
    console.warn('⚠️ Upgraded API URL to HTTPS to prevent mixed content errors:', API_URL);
  }
  if (WS_URL.startsWith('ws://')) {
    WS_URL = WS_URL.replace('ws://', 'wss://');
    console.warn('⚠️ Upgraded WebSocket URL to WSS to prevent mixed content errors:', WS_URL);
  }
}

// Export function to get upgraded API URL for use in other services
export function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api');
  return upgradeToHTTPS(envUrl);
}

// Export function to get base URL (without /api) for health checks
export function getBaseUrl(): string {
  const apiUrl = getApiUrl();
  // If relative URL, return empty string (browser will use current origin)
  if (apiUrl.startsWith('/')) {
    return '';
  }
  // Remove /api suffix if present
  return apiUrl.replace(/\/api\/?$/, '');
}


export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

// Custom error class to preserve API response details
export class ApiError extends Error {
  status?: number;
  responseData?: any;
  originalError?: any;

  constructor(message: string, status?: number, responseData?: any, originalError?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.responseData = responseData;
    this.originalError = originalError;
  }
}

export interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
  params?: Record<string, any>;
  retries?: number;
  retryDelay?: number;
  responseType?: 'json' | 'blob';
}

class ApiClient {
  private baseURL: string;
  private wsURL: string;
  private refreshPromise: Promise<void> | null = null;
  private isOnline: boolean = navigator.onLine;
  private connectionTestInterval: NodeJS.Timeout | null = null;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseURL = API_URL;
    this.wsURL = WS_URL;
    this.setupConnectionMonitoring();
    this.startConnectionTesting();
  }

  private setupConnectionMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      toast.success('Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      toast.error('Network connection lost. Please check your internet connection.');
    });
  }

  private startConnectionTesting() {
    // Test server connection every 30 seconds
    this.connectionTestInterval = setInterval(async () => {
      try {
        // Use getBaseUrl() helper to properly construct health check URL
        const baseUrl = getBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          // Server health check failed
        }
      } catch (error) {
        // Server connection test failed
      }
    }, 30000);
  }

  private async refreshToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        // Refresh token is now in httpOnly cookie, no need to get from store
        
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies for refresh token
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Token refresh failed:', errorData);
          throw new Error(`Token refresh failed: ${response.status}`);
        }

        const { data } = await response.json();
        const { accessToken } = data; // refreshToken is now in httpOnly cookie, not in response
        
        useAuthStore.getState().updateTokens(accessToken);
      } catch (error) {
        // Only log token refresh errors if it's a critical auth error (not network issues)
        // This prevents repeated logging during retries
        if (error instanceof Error && 
            (error.message.includes('401') || error.message.includes('403'))) {
          console.error('❌ Token refresh failed:', error.message);
          useAuthStore.getState().logout();
        }
        
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    // Handle relative URLs (e.g., '/api' in development with proxy)
    const isRelative = this.baseURL.startsWith('/');
    
    if (isRelative) {
      // For relative URLs, just concatenate and add query params manually
      let url = `${this.baseURL}${endpoint}`;
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
      return url;
    } else {
      // For absolute URLs, use URL constructor
      const url = new URL(`${this.baseURL}${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }
      return url.toString();
    }
  }

  private async ensureCsrfToken(): Promise<void> {
    // If CSRF token is missing, try to fetch it
    if (!this.getCsrfToken()) {
      try {
        const baseUrl = getBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
        const csrfUrl = `${baseUrl}/api/csrf-token`;
        
        const response = await fetch(csrfUrl, {
          method: 'GET',
          credentials: 'include', // Include cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          // Store token in sessionStorage as fallback if cookie isn't accessible
          if (data?.data?.csrfToken && typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem('csrf-token', data.data.csrfToken);
            console.debug('CSRF token stored in sessionStorage');
          }
        } else {
          console.warn('CSRF token endpoint returned error:', response.status, response.statusText);
        }
        
        // Small delay to ensure cookie is set (if accessible)
        await this.delay(100);
        
        // Verify token is now available
        const token = this.getCsrfToken();
        if (token) {
          console.debug('CSRF token successfully fetched and available');
        } else {
          console.warn('CSRF token fetched but not found in cookies or sessionStorage');
        }
      } catch (error) {
        // Log error for debugging
        console.warn('Failed to fetch CSRF token:', error);
        // Will be handled by CSRF error retry logic
      }
    }
  }

  private getHeaders(config?: RequestConfig): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config?.headers,
    };

    if (!config?.skipAuth) {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    // Add CSRF token for state-changing requests
    if (config?.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
        console.debug('CSRF token added to request headers:', csrfToken.substring(0, 10) + '...');
      } else {
        console.warn('CSRF token missing for state-changing request:', config.method);
        console.warn('Available cookies:', document.cookie);
        // Try to fetch token synchronously (this won't work but helps with debugging)
        console.warn('Attempting to fetch CSRF token...');
      }
    }

    return headers;
  }

  private getCsrfToken(): string | null {
    // Try to read CSRF token from cookie first
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') {
          const token = decodeURIComponent(value);
          console.debug('CSRF token found in cookie');
          return token;
        }
      }
    }
    
    // Fallback: try to read from sessionStorage (for cross-origin scenarios)
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const token = sessionStorage.getItem('csrf-token');
      if (token) {
        console.debug('CSRF token found in sessionStorage (fallback)');
        return token;
      }
    }
    
    console.debug('CSRF token not found in cookies or sessionStorage');
    return null;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramString}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async request<T = unknown>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<T> {
    // Check cache for GET requests (but not for blob responses)
    if ((!config?.method || config.method === 'GET') && config?.responseType !== 'blob') {
      const cacheKey = this.getCacheKey(endpoint, config?.params);
      const cachedData = this.getFromCache<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Ensure CSRF token is available for state-changing requests
    if (config?.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method) && !config?.skipAuth) {
      await this.ensureCsrfToken();
    }

    const url = this.buildURL(endpoint, config?.params);
    const requestConfig: RequestInit = {
      ...config,
      headers: this.getHeaders(config),
    };

    const maxRetries = config?.retries ?? 3;
    const retryDelay = config?.retryDelay ?? 2000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (!navigator.onLine) {
          throw new Error('No internet connection');
        }


        let response: Response | null = null;
        try {
          response = await fetch(url, {
            ...requestConfig,
            credentials: 'include', // Include cookies for refresh token
            signal: AbortSignal.timeout(20000) // Increased timeout to 20 seconds
          });
        } catch (fetchError) {
          // Check if this is a CORS error
          // CORS errors typically appear as "Failed to fetch" or "NetworkError"
          // and occur when the browser blocks the request before it reaches the server
          const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
          const isLikelyCorsError = 
            errorMessage === 'Failed to fetch' ||
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('CORS') ||
            errorMessage.includes('Access-Control-Allow-Origin') ||
            (typeof window !== 'undefined' && 
             errorMessage.includes('origin') && 
             errorMessage.includes('blocked'));
          
          if (isLikelyCorsError) {
            // Log CORS error only once on first attempt (CORS errors are non-retryable)
            if (attempt === 0) {
              console.error('❌ CORS Error detected:', {
                error: errorMessage,
                frontendOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
                apiUrl: url,
                hint: 'Backend must have CORS_ORIGINS configured to include: ' + 
                      (typeof window !== 'undefined' ? window.location.origin : 'frontend origin')
              });
              toast.error('CORS configuration error: Backend must allow requests from this domain.');
            }
            
            // Don't retry on CORS errors - they are configuration issues that won't resolve
            throw new ApiError(
              `CORS error: Backend must allow requests from ${typeof window !== 'undefined' ? window.location.origin : 'frontend origin'}. ` +
              `Please ensure CORS_ORIGINS includes your frontend domain.`,
              0,
              { 
                corsError: true, 
                frontendOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown', 
                apiUrl: url,
                originalError: errorMessage
              }
            );
          }
          
          // Re-throw other fetch errors
          throw fetchError;
        }

        // Handle token expiration
        if (response && response.status === 401 && !config?.skipAuth) {
          try {
            await this.refreshToken();
            requestConfig.headers = this.getHeaders(config);
            // Re-fetch with new token
            const refreshedResponse = await fetch(url, {
              ...requestConfig,
              credentials: 'include', // Include cookies
              signal: AbortSignal.timeout(20000)
            });
            response = refreshedResponse;
          } catch (refreshError) {
            // Only log and logout if it's a critical auth error
            // Don't log on every retry attempt - only on final attempt or critical errors
            if (refreshError instanceof Error && 
                (refreshError.message.includes('401') || refreshError.message.includes('403'))) {
              if (attempt === maxRetries) {
                console.error('❌ Token refresh failed during request:', refreshError.message);
              }
              useAuthStore.getState().logout();
            }
            throw refreshError;
          }
        }

        // Ensure response exists before proceeding (safety check)
        // This handles edge cases where response might not be set
        if (!response) {
          throw new Error('No response received from server');
        }

        // Handle rate limiting - immediately throw without retrying to prevent request multiplication
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
          const rateLimitReset = response.headers.get('X-RateLimit-Reset');
          
          // Show user-friendly message on rate limit hit
          const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset)).toLocaleTimeString() : 'soon';
          if (attempt === 0) {
            toast.error(`Too many requests. Please wait before trying again. (Resets at ${resetTime})`);
          }
          
          // Immediately throw - do not retry 429 errors to avoid making the problem worse
          const apiError = new ApiError(
            'Rate limit exceeded. Please wait before making more requests.',
            429,
            { 
              rateLimitError: true,
              retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
              rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
              rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : undefined
            },
            response
          );
          throw apiError;
        }


        // Handle response errors
        if (!response.ok) {
          let errorData: any;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            errorData = {
              error: response.statusText || 'Unknown error',
              status: response.status
            };
          }
          
          // Only log errors on final attempt or non-retryable errors to prevent repeated logging
          const isLastAttempt = attempt === maxRetries;
          const isNonRetryableError = response.status === 401 || response.status === 403 || 
                                      (response.status >= 400 && response.status < 500 && response.status !== 429);
          
          if (isLastAttempt || (isNonRetryableError && attempt === 0)) {
            console.error('❌ API Error Response:', errorData);
          }
          
          // Create ApiError with full details for all error statuses
          let errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          
          // Provide more specific messages for common errors
          if (response.status === 503) {
            errorMessage = 'Backend server is unavailable. Please check if the API server is running.';
            if (isLastAttempt) {
              console.error('⚠️ Backend returned 503 - Server may be down or overloaded');
            }
          } else if (response.status === 502) {
            errorMessage = 'Bad gateway - Backend server may be restarting or misconfigured.';
          } else if (response.status === 504) {
            errorMessage = 'Gateway timeout - Backend server took too long to respond.';
          }
          
          const apiError = new ApiError(
            errorMessage,
            response.status,
            errorData,
            response
          );
          
          // Handle CSRF token errors (403) - try to refresh token and retry once
          if (response.status === 403 && errorData.error && errorData.error.includes('CSRF')) {
            // Only retry once for CSRF errors
            if (attempt === 0) {
              try {
                // Fetch new CSRF token
                const baseUrl = getBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
                await fetch(`${baseUrl}/api/csrf-token`, {
                  method: 'GET',
                  credentials: 'include',
                });
                
                // Regenerate headers with new CSRF token
                requestConfig.headers = this.getHeaders(config);
                
                // Retry the request with new CSRF token
                await this.delay(200); // Small delay to ensure cookie is set
                continue; // Retry the request
              } catch (csrfError) {
                // If CSRF token refresh fails, throw the original error
                console.warn('Failed to refresh CSRF token:', csrfError);
                throw apiError;
              }
            }
            // If retry failed or already retried, throw the error
            throw apiError;
          }
          
          // Don't retry on authentication errors (401) or other 403 errors
          if (response.status === 401 || (response.status === 403 && !errorData.error?.includes('CSRF'))) {
            throw apiError;
          }
          
          // Don't retry on client errors (4xx) except for rate limiting
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw apiError;
          }
          
          // For server errors (5xx), save as lastError and retry
          lastError = apiError;
          
          if (attempt < maxRetries) {
            await this.delay(retryDelay);
            continue;
          }
          
          // After all retries, show user-friendly message and throw
          if (response.status === 503) {
            toast.error('Backend server is unavailable. Please contact support or try again later.');
          }
          
          throw apiError;
        }

        // Handle empty responses
        if (response.status === 204) {
          return {} as T;
        }

        // Handle blob responses
        if (config?.responseType === 'blob') {
          const blob = await response.blob();
          return blob as T;
        }

        // Handle JSON responses
        const data = await response.json();
        
        // Cache successful GET requests (but not blobs)
        if (!config?.method || config.method === 'GET') {
          const cacheKey = this.getCacheKey(endpoint, config?.params);
          this.setCache(cacheKey, data);
        }
        
        return data;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timeout - server may be overloaded or down');
          }
          
          if (error.message.includes('401') || error.message.includes('403')) {
            throw error; // Don't retry auth errors
          }
          
          if (error.message === 'No internet connection') {
            toast.error('No internet connection. Please check your network.');
            throw error;
          }

          // Check for CORS errors (these are non-retryable configuration issues)
          // CORS errors are now caught earlier in the fetch try-catch block
          // But we still check here as a fallback
          if (error instanceof ApiError && error.responseData?.corsError) {
            // Already handled as CORS error, don't retry
            throw error;
          }
          
          if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
            // Only log CORS error once on first attempt (already handled in fetch catch block, but log here as fallback)
            if (attempt === 0) {
              console.error('❌ CORS Error detected: Backend is not configured to allow requests from this origin.');
              console.error('   Frontend origin:', typeof window !== 'undefined' ? window.location.origin : 'unknown');
              console.error('   API URL:', this.baseURL);
              toast.error('CORS error: Backend server needs to allow requests from this domain.');
            }
            // Don't retry CORS errors - they won't resolve by retrying
            throw new ApiError(
              'CORS configuration error: Backend must allow requests from ' + (typeof window !== 'undefined' ? window.location.origin : 'frontend'),
              0,
              { corsError: true, frontendOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown', apiUrl: this.baseURL }
            );
          }

          // Check for network errors (but distinguish from CORS errors)
          // If it's "Failed to fetch" and we're on HTTPS with HTTP API, it might be CORS or mixed content
          const isNetworkError = 
            error.message === 'Failed to fetch' || 
            error.message.includes('NetworkError');
          
          const mightBeCors = 
            typeof window !== 'undefined' &&
            window.location.protocol === 'https:' &&
            this.baseURL.startsWith('http://');
          
          if (isNetworkError && mightBeCors && attempt === 0) {
            // Only log warning on first attempt
            console.warn('⚠️ Network error might be CORS related. Check if API URL uses HTTPS.');
            toast.error('Connection error. This might be a CORS configuration issue.');
          }
          
          if (isNetworkError && !mightBeCors) {
            if (attempt === maxRetries) {
              toast.error('Unable to connect to server. The backend may be down or unreachable.');
              throw new Error('Server connection failed - please ensure backend server is running and accessible');
            }
            // Continue to retry for network errors (but not if it might be CORS)
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          if (lastError instanceof Error) {
            if (lastError.message === 'Failed to fetch') {
              toast.error('Network error. The server may be down or unreachable. Please try again later.');
            } else {
              toast.error(lastError.message || 'Request failed');
            }
            throw lastError;
          } else {
            throw lastError || new Error('Request failed');
          }
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await this.delay(delay);
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  // Convenience methods
  async get<T = any>(endpoint: string, params?: Record<string, any>, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET', params });
  }

  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    // Log request body for debugging (especially for attendance check-in)
    if (endpoint.includes('/attendance/check-in')) {
      console.log('📤 POST Request to:', endpoint);
      console.log('📤 Request body (raw):', data);
      console.log('📤 Request body (stringified):', data ? JSON.stringify(data) : undefined);
    }
    
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // File upload
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    config?: RequestConfig
  ): Promise<T> {
    const headers = { ...config?.headers };
    delete headers['Content-Type']; // Let browser set multipart boundary

    if (!config?.skipAuth) {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    // Add CSRF token for file uploads
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }

    const response = await fetch(this.buildURL(endpoint, config?.params), {
      ...config,
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies
      body: formData,
      signal: AbortSignal.timeout(30000) // 30 second timeout for uploads
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  private getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  // WebSocket connection
  createWebSocket(userId: string): WebSocket {
    const token = this.getAccessToken();
    // VITE_WS_URL already includes /ws path (e.g., wss://api.cascade-erp.in/ws)
    // So we just append the query string, not another /ws
    const separator = this.wsURL.includes('?') ? '&' : '?';
    return new WebSocket(`${this.wsURL}${separator}token=${token}`);
  }

  // Cleanup method
  destroy() {
    if (this.connectionTestInterval) {
      clearInterval(this.connectionTestInterval);
      this.connectionTestInterval = null;
    }
  }
}

export { ApiClient };
export const apiClient = new ApiClient();