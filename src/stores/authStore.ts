import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authService } from '@/services/api';

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
          console.error('Failed to refresh user:', error);
          // Don't clear user on refresh failure, just log the error
        }
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
            
            // Try to fetch user data
            await get().refreshUser();
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
          set({ isAuthenticated: true });
          
          try {
            await get().refreshUser();
          } catch (error) {
            console.error('❌ AuthStore - Failed to fetch user data:', error);
            // If we can't fetch user data, clear the tokens
            set({ 
              user: null, 
              accessToken: null, 
              isAuthenticated: false,
              deviceId: null,
              isInitialized: true
            });
          }
        } else if (state.accessToken && state.user && !state.isAuthenticated) {
          set({ isAuthenticated: true });
          
          // Try to refresh user data
          try {
            await get().refreshUser();
          } catch (error) {
            console.error('❌ AuthStore - Failed to refresh user on init:', error);
            // Don't logout, just keep the stored user data
          }
        } else if (state.accessToken && state.user && state.isAuthenticated) {
          // User is already authenticated, just refresh data
          try {
            await get().refreshUser();
          } catch (error) {
            console.error('❌ AuthStore - Failed to refresh user data:', error);
            // Don't logout on refresh failure
          }
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