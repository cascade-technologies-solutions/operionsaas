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
    
    // Backend returns { success: true, message: '...', status: 201, data: WorkEntry }
    // Extract work entry from response
    const responseData = response.data || response;
    
    // Check if response indicates failure
    if (responseData && typeof responseData === 'object' && 'success' in responseData && responseData.success === false) {
      const errorMessage = responseData.error || 'Failed to start work entry';
      throw new Error(errorMessage);
    }
    
    // Extract work entry data from response
    const workEntryData = responseData?.data || responseData;
    
    // Validate work entry data exists
    if (!workEntryData || typeof workEntryData !== 'object') {
      throw new Error('Invalid response: work entry data not found');
    }
    
    // Validate work entry has ID
    if (!('_id' in workEntryData) && !('id' in workEntryData)) {
      throw new Error('Invalid response: work entry ID not found');
    }
    
    return { data: workEntryData as WorkEntry };
  },

  async completeWork(id: string, data: Partial<WorkEntry>): Promise<{ data: WorkEntry }> {
    const response = await apiClient.post(`/work-entries/complete/${id}`, data);
    
    // Backend returns { success: true, message: '...', status: 200, data: WorkEntry }
    // Extract work entry from response
    const responseData = response.data || response;
    
    // Check if response indicates failure
    if (responseData && typeof responseData === 'object' && 'success' in responseData && responseData.success === false) {
      const errorMessage = responseData.error || 'Failed to complete work entry';
      throw new Error(errorMessage);
    }
    
    // Extract work entry data from response
    const workEntryData = responseData?.data || responseData;
    
    // Validate work entry data exists
    if (!workEntryData || typeof workEntryData !== 'object') {
      throw new Error('Invalid response: work entry data not found');
    }
    
    // Validate work entry has ID
    if (!('_id' in workEntryData) && !('id' in workEntryData)) {
      throw new Error('Invalid response: work entry ID not found');
    }
    
    return { data: workEntryData as WorkEntry };
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

  async getWorkEntriesByEmployee(employeeId: string, params?: { today?: string; startDate?: string; endDate?: string; status?: string; page?: number; limit?: number; skipCache?: boolean }): Promise<{ data: WorkEntry[] }> {
    // Clear cache for work entries to ensure fresh data
    if (typeof (apiClient as any).clearCache === 'function') {
      (apiClient as any).clearCache('/work-entries/employee');
    }
    
    // Build params object for apiClient.get() instead of query string
    const apiParams: Record<string, any> = {};
    if (params?.today) apiParams.today = params.today;
    if (params?.startDate) apiParams.startDate = params.startDate;
    if (params?.endDate) apiParams.endDate = params.endDate;
    if (params?.status) apiParams.status = params.status;
    if (params?.page) apiParams.page = params.page.toString();
    if (params?.limit) apiParams.limit = params.limit.toString();
    // Add timestamp query parameter to bypass frontend cache when skipCache is true
    if (params?.skipCache) {
      apiParams._t = Date.now().toString();
    }
    
    console.log('🔍 Calling apiClient.get("/work-entries/employee/' + employeeId + '", params)');
    const response = await apiClient.get(`/work-entries/employee/${employeeId}`, apiParams);
    
    console.log('🔍 Raw API response (work entries):', response);
    console.log('🔍 Response message:', (response as any)?.message);
    
    // The backend returns { success: true, data: { workEntries: [...], pagination: {...} } }
    // or { success: true, data: [...] } in some cases
    const responseData = (response as any)?.data || response;
    
    // Handle nested response structure: response.data.data.workEntries
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      const nestedData = responseData.data;
      if (nestedData && typeof nestedData === 'object') {
        if ('workEntries' in nestedData && Array.isArray(nestedData.workEntries)) {
          console.log('✅ Using response.data.data.workEntries');
          return { data: nestedData.workEntries };
        } else if (Array.isArray(nestedData)) {
          console.log('✅ Using response.data.data as array');
          return { data: nestedData };
        }
      }
    }
    
    // Handle direct workEntries property
    if (responseData && typeof responseData === 'object' && 'workEntries' in responseData) {
      const workEntries = (responseData as any).workEntries;
      if (Array.isArray(workEntries)) {
        console.log('✅ Using response.data.workEntries');
        return { data: workEntries };
      }
    }
    
    // Handle direct array response
    if (Array.isArray(responseData)) {
      console.log('✅ Using response.data as array');
      return { data: responseData };
    }
    
    // Log unexpected format but return empty array to prevent crashes
    console.error('❌ Unexpected response format for getWorkEntriesByEmployee:', {
      responseData,
      responseType: typeof responseData,
      hasData: responseData && typeof responseData === 'object' && 'data' in responseData
    });
    return { data: [] };
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
    
    // Validate response structure
    const responseData = response.data || response;
    
    // Check if response indicates failure
    if (responseData && typeof responseData === 'object' && 'success' in responseData && responseData.success === false) {
      const errorMessage = responseData.error || 'Failed to create work entry';
      throw new Error(errorMessage);
    }
    
    // Extract work entry data from response
    const workEntryData = responseData?.data || responseData;
    
    // Validate work entry data exists
    if (!workEntryData || typeof workEntryData !== 'object') {
      throw new Error('Invalid response: work entry data not found');
    }
    
    // Validate work entry has ID
    if (!('_id' in workEntryData) && !('id' in workEntryData)) {
      throw new Error('Invalid response: work entry ID not found');
    }
    
    return { data: workEntryData as WorkEntry };
  },

  async getEmployeeDailySummary(employeeId: string, date?: string): Promise<{ data: any }> {
    const url = `/work-entries/employee/${employeeId}/daily-summary${date ? `?date=${date}` : ''}`;
    const response = await apiClient.get(url);
    return response.data || response;
  },
};