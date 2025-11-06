import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authService } from '@/services/api';
import { ApiError } from '@/services/api/client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  deviceId: string | null;
  isInitialized: boolean;
  login: (user: User, accessToken: string, deviceId?: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  updateTokens: (accessToken: string) => void;
  refreshUser: () => Promise<void>;
  setDeviceId: (deviceId: string) => void;
  getDeviceId: () => string | null;
  initializeAuth: () => Promise<void>;
  setInitialized: (initialized: boolean) => void;
  clearInvalidAuth: () => void;
}

// Track in-flight refresh requests and timing outside of zustand state
// (to avoid persistence issues)
let refreshPromise: Promise<void> | null = null;
let lastRefreshAttempt: number = 0;
const MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refresh attempts

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      deviceId: null,
      isInitialized: false,
      
      setInitialized: (initialized) => {
        set({ isInitialized: initialized });
      },
      
      login: (user, accessToken, deviceId) => {
        set({ 
          user, 
          accessToken, 
          isAuthenticated: true, 
          deviceId,
          isInitialized: true
        });
      },
      
      logout: () => {
        set({ 
          user: null, 
          accessToken: null, 
          isAuthenticated: false,
          deviceId: null,
          isInitialized: true
        });
      },
      
      clearInvalidAuth: () => {
        set({ 
          user: null, 
          accessToken: null, 
          isAuthenticated: false,
          deviceId: null,
          isInitialized: true
        });
      },
      
      updateUser: (updatedUser) => {
        set((state) => {
          // If updatedUser is a complete user object (from API response), use it directly
          // Otherwise, merge with existing user data
          const newUser = updatedUser._id || updatedUser.id 
            ? updatedUser // Complete user object from API
            : state.user ? { ...state.user, ...updatedUser } : null; // Partial update
            
          return { user: newUser as User };
        });
      },
      
      updateTokens: (accessToken) => {
        set({ accessToken });
      },
      
      refreshUser: async () => {
        const state = get();
        if (!state.accessToken) {
          return;
        }
        
        // Check if refresh is already in progress - return existing promise
        if (refreshPromise) {
          return refreshPromise;
        }
        
        // Debounce: prevent rapid successive calls
        const now = Date.now();
        const timeSinceLastAttempt = now - lastRefreshAttempt;
        if (timeSinceLastAttempt < MIN_REFRESH_INTERVAL && lastRefreshAttempt > 0) {
          // Too soon since last attempt, wait and return existing promise if available
          if (refreshPromise) {
            return refreshPromise;
          }
          // Otherwise, wait for the minimum interval
          await new Promise(resolve => setTimeout(resolve, MIN_REFRESH_INTERVAL - timeSinceLastAttempt));
        }
        
        lastRefreshAttempt = Date.now();
        
        // Create new refresh promise
        refreshPromise = (async () => {
        try {
          const response = await authService.getProfile();
          
                      if (response.user) {
              // Merge with existing user data to preserve assigned processes
              set((state) => {
                const updatedUser = state.user ? {
                  ...state.user,
                  ...response.user,
                  // Preserve assigned processes if they exist in current state
                  assignedProcesses: state.user.assignedProcesses || response.user.assignedProcesses
                } : response.user;
                
                return { user: updatedUser as User };
              });
            }
        } catch (error) {
            // Handle authentication errors (404, 401) - clear auth state
            const isAuthError = error instanceof ApiError && 
              (error.status === 404 || error.status === 401);
            
            if (isAuthError) {
              console.error('❌ Auth error during refresh - clearing auth state:', error);
              // Clear auth state on authentication failure
              set({ 
                user: null, 
                accessToken: null, 
                isAuthenticated: false,
                deviceId: null,
                isInitialized: true
              });
              // Re-throw to prevent retries
              throw error;
            }
            
            // For network errors (5xx, timeout), log but don't clear auth
            const isNetworkError = error instanceof ApiError && 
              (error.status === undefined || error.status >= 500);
            
            if (isNetworkError) {
              console.error('⚠️ Network error during refresh (will retry):', error);
              // Don't clear auth on network errors - allow retry
            } else {
          console.error('Failed to refresh user:', error);
            }
            
            // Re-throw to allow caller to handle
            throw error;
          } finally {
            // Clear the promise cache after completion
            refreshPromise = null;
          }
        })();
        
        return refreshPromise;
      },
      
      setDeviceId: (deviceId) => {
        set({ deviceId });
      },
      
      getDeviceId: () => {
        return get().deviceId;
      },
      
      initializeAuth: async () => {
        const state = get();
        
        // If already initialized, don't reinitialize
        if (state.isInitialized) {
          return;
        }
        
        // If we have access token but no user, try to refresh user data
        // Refresh token is in httpOnly cookie, so we can always try to refresh
        if (!state.accessToken) {
          // No access token - try to refresh using cookie
          try {
            const response = await authService.refreshToken();
            set({ 
              accessToken: response.accessToken, 
              isAuthenticated: true,
              isInitialized: true
            });
            
            // Try to fetch user data only if we don't have it
            if (!state.user) {
            await get().refreshUser();
            }
          } catch (error) {
            console.error('❌ AuthStore - Token refresh failed:', error);
            // Clear invalid tokens
            set({ 
              user: null, 
              accessToken: null, 
              isAuthenticated: false,
              deviceId: null,
              isInitialized: true
            });
          }
        } else if (state.accessToken && !state.user) {
          // Have token but no user - fetch user data
          set({ isAuthenticated: true });
          
          try {
            await get().refreshUser();
          } catch (error) {
            console.error('❌ AuthStore - Failed to fetch user data:', error);
            // If we can't fetch user data, clear the tokens
            const isAuthError = error instanceof ApiError && 
              (error.status === 404 || error.status === 401);
            if (isAuthError) {
            set({ 
              user: null, 
              accessToken: null, 
              isAuthenticated: false,
              deviceId: null,
              isInitialized: true
            });
            }
          }
        } else if (state.accessToken && state.user && !state.isAuthenticated) {
          // Have token and user but not marked as authenticated - just set flag
          set({ isAuthenticated: true });
          // Don't refresh - user already exists
        } else if (state.accessToken && state.user && state.isAuthenticated) {
          // User is already authenticated with valid data - don't refresh unnecessarily
          // Only refresh if it's been a while since last refresh (handled by debouncing)
          // Skip refresh on initialization to prevent unnecessary calls
        }
        
        // Mark as initialized
        set({ isInitialized: true });
      },
    }),
    {
      name: 'auth-storage',
      // Only persist these fields
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        // refreshToken excluded - now stored in httpOnly cookie
        isAuthenticated: state.isAuthenticated,
        deviceId: state.deviceId,
        isInitialized: state.isInitialized,
      }),

    }
  )
);