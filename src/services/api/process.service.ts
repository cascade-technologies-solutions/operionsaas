// Process Service
import { Process } from '@/types';
import { apiClient } from './client';

export const processService = {
  async getProcesses(): Promise<{ data: Process[] }> {
    const response = await apiClient.get('/processes?limit=100');
    
    // Handle different response formats
    if (response.data?.data?.processes) {
      return { data: response.data.data.processes };
    } else if (response.data?.processes) {
      return { data: response.data.processes };
    } else if (Array.isArray(response.data)) {
      return { data: response.data };
    } else if (Array.isArray(response)) {
      return { data: response };
    } else {
      return { data: [] };
    }
  },

  async getProcess(id: string): Promise<{ data: Process } | Process> {
    const response = await apiClient.get(`/processes/${id}`);
    return response.data || response;
  },

  async createProcess(data: Partial<Process>): Promise<{ data: Process }> {
    const response = await apiClient.post('/processes', data);
    return response.data || response;
  },

  async updateProcess(id: string, data: Partial<Process>): Promise<{ data: Process }> {
    const response = await apiClient.put(`/processes/${id}`, data);
    return response.data || response;
  },

  async deleteProcess(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/processes/${id}`);
    return response.data || response;
  },

  async assignEmployee(processId: string, employeeId: string): Promise<{ data: Process }> {
    const response = await apiClient.post(`/processes/${processId}/assign-employee`, { employeeId });
    return response.data || response;
  },

  async removeEmployee(processId: string, employeeId: string): Promise<{ data: Process }> {
    const response = await apiClient.delete(`/processes/${processId}/employees/${employeeId}`);
    return response.data || response;
  },

  async updateMetrics(processId: string, production: number, rejections: number, cycleTime?: number): Promise<{ data: Process }> {
    const response = await apiClient.patch(`/processes/${processId}/metrics`, { production, rejections, cycleTime });
    return response.data || response;
  },


  async setDailyTarget(processId: string, target: number): Promise<{ message: string }> {
    const response = await apiClient.post(`/processes/${processId}/set-daily-target`, { target });
    return response.data || response;
  },

  async getQuantityStatus(processId: string, productId?: string): Promise<any> {
    const url = `/processes/${processId}/quantity-status${productId ? `?productId=${productId}` : ''}`;
    const response = await apiClient.get(url);
    return response.data || response;
  },

  async unlockStage(processId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/processes/${processId}/unlock`);
    return response.data || response;
  },

  async getWaterfallView(productId: string): Promise<any> {
    const response = await apiClient.get(`/processes/waterfall/${productId}`);
    return response.data || response;
  },
};