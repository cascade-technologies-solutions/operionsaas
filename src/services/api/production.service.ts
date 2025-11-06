// Production Service
import { apiClient } from './client';

export interface CheckInResponse {
  checkinTime: string;
  sessionToken: string;
}

export interface ProcessStage {
  processId: string;
  processName: string;
  stageOrder: number;
}

export interface ProcessStatus {
  availableQuantity: number;
  stageOrder: number;
  isFirstStage: boolean;
  previousStageAchieved?: number;
  currentStageConsumed?: number;
}

export interface ProductionSubmitData {
  checkinTime: string;
  productId: string;
  processId: string;
  machineId?: string;
  shiftType?: string;
  achieved: number;
  rejected: number;
  photo: string;
}

export const productionService = {
  // Check-in
  async checkIn(): Promise<{ data: CheckInResponse }> {
    const response = await apiClient.post<{ success: boolean; data: CheckInResponse; message?: string }>('/production/checkin');
    const responseData = response.data || response;
    
    if (responseData && typeof responseData === 'object' && 'success' in responseData && responseData.success === false) {
      const errorMessage = responseData.error || 'Failed to check in';
      throw new Error(errorMessage);
    }
    
    const checkInData = responseData?.data || responseData;
    
    if (!checkInData || typeof checkInData !== 'object') {
      throw new Error('Invalid response: check-in data not found');
    }
    
    return { data: checkInData as CheckInResponse };
  },

  // Get process stages for a product
  async getProcessStagesByProduct(productId: string): Promise<{ data: { stages: ProcessStage[] } }> {
    const response = await apiClient.get<{ success: boolean; data: { stages: ProcessStage[] }; message?: string }>(
      '/production/process-stages',
      { product_id: productId }
    );
    
    const responseData = response.data || response;
    
    if (responseData && typeof responseData === 'object' && 'success' in responseData && responseData.success === false) {
      const errorMessage = responseData.error || 'Failed to retrieve process stages';
      throw new Error(errorMessage);
    }
    
    const stagesData = responseData?.data || responseData;
    
    if (!stagesData || typeof stagesData !== 'object') {
      throw new Error('Invalid response: stages data not found');
    }
    
    return { data: stagesData as { stages: ProcessStage[] } };
  },

  // Get process status (available quantity)
  async getProcessStatus(productId: string, stageId: string): Promise<{ data: ProcessStatus }> {
    const response = await apiClient.get<{ success: boolean; data: ProcessStatus; message?: string }>(
      '/production/process-status',
      { product_id: productId, stage_id: stageId }
    );
    
    const responseData = response.data || response;
    
    if (responseData && typeof responseData === 'object' && 'success' in responseData && responseData.success === false) {
      const errorMessage = responseData.error || 'Failed to retrieve process status';
      throw new Error(errorMessage);
    }
    
    const statusData = responseData?.data || responseData;
    
    if (!statusData || typeof statusData !== 'object') {
      throw new Error('Invalid response: process status data not found');
    }
    
    return { data: statusData as ProcessStatus };
  },

  // Submit production entry
  async submitProduction(data: ProductionSubmitData): Promise<{ data: any }> {
    const response = await apiClient.post<{ success: boolean; data: any; message?: string }>(
      '/production/submit',
      data
    );
    
    const responseData = response.data || response;
    
    if (responseData && typeof responseData === 'object' && 'success' in responseData && responseData.success === false) {
      const errorMessage = responseData.error || 'Failed to submit production entry';
      throw new Error(errorMessage);
    }
    
    const productionData = responseData?.data || responseData;
    
    if (!productionData || typeof productionData !== 'object') {
      throw new Error('Invalid response: production entry data not found');
    }
    
    return { data: productionData };
  }
};

