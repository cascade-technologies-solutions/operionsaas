// Work Entry Service
import { WorkEntry } from '@/types';
import { apiClient } from './client';

export const workEntryService = {
  async getActiveWorkEntry(): Promise<{ data: WorkEntry | null }> {
    const response = await apiClient.get('/work-entries/active');
    return response.data || response;
  },

  async getWorkEntries(): Promise<{ workEntries: WorkEntry[] }> {
    const response = await apiClient.get('/work-entries');
    return response.data || response;
  },

  async getWorkEntry(id: string): Promise<{ data: WorkEntry }> {
    const response = await apiClient.get(`/work-entries/${id}`);
    return response.data || response;
  },

  async startWork(data: Partial<WorkEntry>): Promise<{ data: WorkEntry }> {
    const response = await apiClient.post('/work-entries/start', data);
    return response.data || response;
  },

  async completeWork(id: string, data: Partial<WorkEntry>): Promise<{ data: WorkEntry }> {
    const response = await apiClient.post(`/work-entries/complete/${id}`, data);
    return response.data || response;
  },

  async createWorkEntry(data: Partial<WorkEntry>): Promise<{ data: WorkEntry }> {
    const response = await apiClient.post('/work-entries', data);
    return response.data || response;
  },

  async updateWorkEntry(id: string, data: Partial<WorkEntry>): Promise<{ data: WorkEntry }> {
    const response = await apiClient.put(`/work-entries/${id}`, data);
    return response.data || response;
  },

  async deleteWorkEntry(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/work-entries/${id}`);
    return response.data || response;
  },

  async getWorkEntriesByEmployee(employeeId: string, params?: { today?: string; startDate?: string; endDate?: string; status?: string; page?: number; limit?: number }): Promise<{ data: WorkEntry[] }> {
    const queryParams = new URLSearchParams();
    if (params?.today) queryParams.append('today', params.today);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const url = `/work-entries/employee/${employeeId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    
    // The backend returns { data: { workEntries: [...], pagination: {...} } }
    const responseData = response.data || response;
    
    if (responseData.data && responseData.data.workEntries) {
      return { data: responseData.data.workEntries };
    } else if (responseData.workEntries) {
      return { data: responseData.workEntries };
    } else if (Array.isArray(responseData)) {
      return { data: responseData };
    } else {
      console.error('❌ Unexpected response format:', responseData);
      return { data: [] };
    }
  },

  async getWorkHistoryByEmployee(employeeId: string): Promise<{ data: WorkEntry[] }> {
    const response = await apiClient.get(`/work-entries/employee/${employeeId}/history`);
    
    // The backend returns { data: { workEntries: [...], pagination: {...} } }
    const responseData = response.data || response;
    
    if (responseData.data && responseData.data.workEntries) {
      return { data: responseData.data.workEntries };
    } else if (responseData.workEntries) {
      return { data: responseData.workEntries };
    } else if (Array.isArray(responseData)) {
      return { data: responseData };
    } else {
      console.error('❌ Unexpected response format:', responseData);
      return { data: [] };
    }
  },

  async getPendingValidations(): Promise<{ data: WorkEntry[] }> {
    try {
      const response = await apiClient.get('/work-entries/pending-validations');
      console.log('Pending validations response:', response);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching pending validations:', error);
      // Return empty array instead of throwing error
      return { data: [] };
    }
  },

  async validateWorkEntry(id: string, status: 'approved' | 'rejected', notes?: string): Promise<{ data: WorkEntry }> {
    const response = await apiClient.post(`/work-entries/${id}/validate`, { status, notes });
    return response.data || response;
  },

  async updateProduction(id: string, achieved: number, rejected: number): Promise<{ data: WorkEntry }> {
    const response = await apiClient.patch(`/work-entries/${id}/production`, { achieved, rejected });
    return response.data || response;
  },

  async getProductReport(productId: string, queryParams?: string): Promise<any> {
    const url = `/work-entries/product-report/${productId}${queryParams ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data || response;
  },

  async createDirectWorkEntry(data: Partial<WorkEntry>): Promise<{ data: WorkEntry }> {
    const response = await apiClient.post('/work-entries/direct', data);
    return response.data || response;
  },

  async getEmployeeDailySummary(employeeId: string, date?: string): Promise<{ data: any }> {
    const url = `/work-entries/employee/${employeeId}/daily-summary${date ? `?date=${date}` : ''}`;
    const response = await apiClient.get(url);
    return response.data || response;
  },
};