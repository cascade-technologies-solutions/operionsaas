// Authentication Service
import { User } from '@/types';
import { apiClient } from './client';

interface LoginRequest {
  email?: string;
  userId?: string;
  password: string;
  deviceId?: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  // refreshToken is now in httpOnly cookie, not in response
}

interface RefreshTokenResponse {
  accessToken: string;
  // refreshToken is now in httpOnly cookie, not in response
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', data, { skipAuth: true });
    return response.data || response;
  },

  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },

  async refreshToken(): Promise<RefreshTokenResponse> {
    // Refresh token is now in httpOnly cookie, no need to pass it
    const response = await apiClient.post<RefreshTokenResponse>(
      '/auth/refresh',
      {},
      { skipAuth: true }
    );
    return response.data || response;
  },

  async validateToken(): Promise<{ valid: boolean; user?: User }> {
    const response = await apiClient.get('/auth/validate');
    return response.data || response;
  },

  async getProfile(): Promise<{ user: User }> {
    const response = await apiClient.get('/auth/profile');
    // Backend returns { success: true, data: user, status: 200 }
    // We need to extract the user from response.data
    const userData = response.data || response;
    return { user: userData };
  },

  async updateProfile(profile: Partial<User['profile']>): Promise<{ user: User }> {
    const response = await apiClient.put('/auth/profile', { profile });
    return response.data || response;
  },

  async resetPasswordRequest(email: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password-request', { email }, { skipAuth: true });
    return response.data || response;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.post(
      '/auth/reset-password',
      { token, newPassword },
      { skipAuth: true }
    );
    return response.data || response;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.put('/auth/password', { currentPassword, newPassword });
    return response.data || response;
  },
};