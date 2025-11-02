// User Service
import { User } from '@/types';
import { apiClient } from './client';

export const userService = {
  async getUsers(factoryId?: string, filters?: { role?: string }): Promise<{ data: User[] | { users: User[], pagination: any } }> {
    const params = new URLSearchParams();
    if (factoryId) params.append('factoryId', factoryId);
    if (filters?.role) params.append('role', filters.role);
    
    console.log('Fetching users with params:', params.toString());
    const response = await apiClient.get(`/users?${params.toString()}`);
    console.log('Raw API response:', response);
    
    // The API client returns the raw JSON, so response is already the data
    // Backend returns: { success: true, data: { users: [...], pagination: {...} } }
    return response;
  },

  async getUser(id: string): Promise<{ data: User }> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data || response;
  },

  async createUser(data: Partial<User>): Promise<{ data: User }> {
    const response = await apiClient.post('/users', data);
    return response.data || response;
  },

  async updateUser(id: string, data: Partial<User>): Promise<{ data: User }> {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data || response;
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data || response;
  },

  async getEmployees(): Promise<{ data: User[] }> {
    try {
      const response = await apiClient.get('/users/employees/list');
      
      // Handle different response formats
      if (response && response.data && Array.isArray(response.data)) {
        // Direct array response
        return { data: response.data };
      } else if (response && Array.isArray(response)) {
        // Response is directly an array
        return { data: response };
      } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        // Nested data array
        return { data: response.data.data };
      } else {
        console.error('Unexpected response format:', response);
        return { data: [] };
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw new Error('Failed to retrieve employees');
    }
  },

  async getSupervisors(): Promise<{ data: User[] }> {
    const response = await apiClient.get('/users/supervisors/list');
    
    // Handle different response formats
    if (response.data?.data) {
      return { data: response.data.data };
    } else if (Array.isArray(response.data)) {
      return { data: response.data };
    } else if (Array.isArray(response)) {
      return { data: response };
    } else {
      return { data: [] };
    }
  },

  async resetDevice(userId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/users/${userId}/reset-device`);
    return response.data || response;
  },

};