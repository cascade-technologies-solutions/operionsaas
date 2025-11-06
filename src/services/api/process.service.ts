// Process Service
import { Process } from '@/types';
import { apiClient } from './client';

export const processService = {
  async getProcesses(): Promise<{ data: Process[] }> {
    // Clear cache for processes to ensure fresh data
    // This prevents stale/cached data from other endpoints
    if (typeof (apiClient as any).clearCache === 'function') {
      (apiClient as any).clearCache('/processes');
    }
    
    // Pass limit=100 to fetch all processes (backend default is 10)
    // Add timestamp to ensure fresh request (bypasses any remaining cache)
    const timestamp = Date.now();
    console.log('🔍 Calling apiClient.get("/processes", { limit: 100, _t: timestamp })');
    const response = await apiClient.get('/processes', { limit: 100, _t: timestamp });
    
    // Debug logging to understand the response structure
    console.log('🔍 Raw API response (processes):', response);
    console.log('🔍 Response message:', (response as any)?.message);
    console.log('🔍 response.data:', (response as any)?.data);
    console.log('🔍 response.data?.processes:', (response as any)?.data?.processes);
    
    // Handle different response formats - backend returns: { success: true, data: { processes: [...], pagination: {...} } }
    if ((response as any)?.data?.data?.processes) {
      console.log('✅ Using response.data.data.processes');
      return { data: (response as any).data.data.processes };
    } else if ((response as any)?.data?.processes) {
      console.log('✅ Using response.data.processes');
      return { data: (response as any).data.processes };
    } else if (Array.isArray((response as any)?.data)) {
      console.log('✅ Using response.data as array');
      return { data: (response as any).data };
    } else if (Array.isArray(response)) {
      console.log('✅ Using response as array');
      return { data: response };
    } else {
      console.warn('⚠️ No processes found in response, returning empty array');
      console.warn('⚠️ Full response:', JSON.stringify(response, null, 2));
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

  async getQuantityStatus(processId: string, productId?: string, skipCache?: boolean): Promise<any> {
    const params = new URLSearchParams();
    if (productId) {
      params.append('productId', productId);
    }
    if (skipCache) {
      params.append('_t', Date.now().toString());
    }
    const queryString = params.toString();
    const url = `/processes/${processId}/quantity-status${queryString ? `?${queryString}` : ''}`;
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