import { apiClient } from './client';
import { Factory } from '@/types';

export const factoryService = {
  // Get all factories
  async getFactories(): Promise<{ data: Factory[] }> {
    const response = await apiClient.get('/factories');
    return response.data || response;
  },

  // Get factory by ID
  async getFactory(factoryId: string): Promise<{ data: Factory }> {
    const response = await apiClient.get(`/factories/${factoryId}`);
    return response.data || response;
  },

  // Create factory
  async createFactory(factoryData: any): Promise<{ data: Factory }> {
    const response = await apiClient.post('/factories', factoryData);
    return response.data || response;
  },

  // Update factory
  async updateFactory(factoryId: string, updateData: any): Promise<{ data: Factory }> {
    const response = await apiClient.put(`/factories/${factoryId}`, updateData);
    return response.data || response;
  },

  // Register factory (public endpoint)
  async registerFactory(factoryData: any): Promise<{ data: any }> {
    const response = await apiClient.post('/factories/register', factoryData);
    return response.data || response;
  },

  // Get factory requests (super admin only)
  async getFactoryRequests(): Promise<{ data: any }> {
    const response = await apiClient.get('/factories/requests');
    return response.data || response;
  },

  // Approve factory request (super admin only)
  async approveFactoryRequest(requestId: string): Promise<{ data: any }> {
    const response = await apiClient.post(`/factories/requests/${requestId}/approve`);
    return response.data || response;
  },

  // Reject factory request (super admin only)
  async rejectFactoryRequest(requestId: string, reason: string): Promise<{ data: any }> {
    const response = await apiClient.post(`/factories/requests/${requestId}/reject`, { reason });
    return response.data || response;
  },

  // Shift Management
  async getShifts(): Promise<{ data: { shifts: any[] } }> {
    const response = await apiClient.get('/factories/shifts');
    return response.data || response;
  },

  async createShift(shiftData: { name: string; startTime: string; endTime: string; isActive?: boolean }): Promise<{ data: any }> {
    const response = await apiClient.post('/factories/shifts', shiftData);
    return response.data || response;
  },

  async updateShift(shiftName: string, shiftData: { name?: string; startTime?: string; endTime?: string; isActive?: boolean }): Promise<{ data: any }> {
    const response = await apiClient.put(`/factories/shifts/${shiftName}`, shiftData);
    return response.data || response;
  },

  async deleteShift(shiftName: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/factories/shifts/${shiftName}`);
    return response.data || response;
  }
};
