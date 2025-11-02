// API Client with interceptors and error handling
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// Use environment variable or fallback to default
// In development with Vite proxy, use relative URL to avoid cross-origin issues
// The proxy in vite.config.ts will forward /api requests to the backend
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api');
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'ws://localhost:3000' : 'ws://localhost:3000');


export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
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
        const response = await fetch(`${this.baseURL.replace('/api', '')}/health`, {
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
        console.error('❌ Token refresh error:', error);
        // Only logout if it's a critical error (not network issues)
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('403')) {
            useAuthStore.getState().logout();
          }
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

    return headers;
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


        let response = await fetch(url, {
          ...requestConfig,
          credentials: 'include', // Include cookies for refresh token
          signal: AbortSignal.timeout(20000) // Increased timeout to 20 seconds
        });

        // Handle token expiration
        if (response.status === 401 && !config?.skipAuth) {
          try {
            await this.refreshToken();
            requestConfig.headers = this.getHeaders(config);
            response = await fetch(url, {
              ...requestConfig,
              credentials: 'include', // Include cookies
              signal: AbortSignal.timeout(20000)
            });
          } catch (refreshError) {
            console.error('Token refresh failed during retry:', refreshError);
            // Only logout if it's a critical auth error
            if (refreshError instanceof Error && 
                (refreshError.message.includes('401') || refreshError.message.includes('403'))) {
              useAuthStore.getState().logout();
            }
            throw refreshError;
          }
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          await this.delay(delay);
          continue;
        }


        // Handle response errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error Response:', errorData);
          
          // Don't retry on authentication errors
          if (response.status === 401 || response.status === 403) {
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          
          // Don't retry on client errors (4xx) except for rate limiting
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          
          lastError = new Error(errorData.error || `HTTP ${response.status}`);
          
          if (attempt < maxRetries) {
            await this.delay(retryDelay);
            continue;
          }
          
          throw lastError;
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

          // Check for network errors
          if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
            if (attempt === maxRetries) {
              toast.error('Unable to connect to server. Please check if the backend is running.');
              throw new Error('Server connection failed - please ensure backend is running on port 3000');
            }
            // Continue to retry for network errors
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          if (error instanceof Error) {
            if (error.message === 'Failed to fetch') {
              toast.error('Network error. The server may be down or overloaded. Please try again.');
            } else {
              toast.error(error.message || 'Request failed');
            }
          }
          throw error;
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
    return new WebSocket(`${this.wsURL}/ws?token=${token}`);
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