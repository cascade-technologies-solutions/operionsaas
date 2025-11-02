import { apiClient } from './client';
import { Machine } from '@/types';

export const machineService = {
  // Get all machines for factory
  getMachines: async (): Promise<{ data: Machine[] }> => {
    const response = await apiClient.get('/machines');
    const responseData = response.data || response;
    
    // The backend returns { data: { machines: [...] } }
    if (responseData.data && responseData.data.machines) {
      return { data: responseData.data.machines };
    } else if (responseData.machines) {
      return { data: responseData.machines };
    } else if (Array.isArray(responseData)) {
      return { data: responseData };
    } else {
      console.error('❌ Unexpected machines response format:', responseData);
      return { data: [] };
    }
  },

  async getMachinesBySize(sizeId: string): Promise<{ data: Machine[] }> {
    const response = await apiClient.get(`/machines/size/${sizeId}`);
    return response.data || response;
  },

  async getMachinesByProcess(processId: string): Promise<{ data: Machine[] }> {
    const response = await apiClient.get(`/machines/process/${processId}`);
    return response.data || response;
  },

  // Create new machine
  createMachine: async (data: { name: string; sizeId?: string }): Promise<{ data: Machine }> => {
    return apiClient.post('/machines', data);
  },

  // Update machine
  updateMachine: async (id: string, data: { name: string }): Promise<{ data: Machine }> => {
    return apiClient.put(`/machines/${id}`, data);
  },

  // Delete machine
  deleteMachine: async (id: string): Promise<void> => {
    return apiClient.delete(`/machines/${id}`);
  }
};
