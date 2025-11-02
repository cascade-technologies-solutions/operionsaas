// Dashboard Service
import { DashboardStats } from '@/types';
import { apiClient } from './client';

export interface ProductionSummaryItem {
  processId: string;
  processName: string;
  sizeCode: string;
  sizeName: string;
  productId: string;
  productName: string;
  totalAchieved: number;
  totalRejected: number;
  totalTarget: number;
  totalProduction: number;
  workEntries: number;
  employeeCount: number;
  efficiency: number;
}

export interface ProductionSummaryTotals {
  totalAchieved: number;
  totalRejected: number;
  totalTarget: number;
  totalProduction: number;
  totalWorkEntries: number;
  overallEfficiency: number;
}

export interface ProductionSummaryResponse {
  summary: ProductionSummaryItem[];
  totals: ProductionSummaryTotals;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export const dashboardService = {
  async getDashboardStats(): Promise<{ data: DashboardStats }> {
    const response = await apiClient.get('/dashboard/stats');
    return response.data || response;
  },

  async getProductionStats(dateRange?: { startDate: string; endDate: string }): Promise<{ data: any }> {
    const response = await apiClient.get('/dashboard/production', dateRange);
    return response.data || response;
  },

  async getEfficiencyStats(dateRange?: { startDate: string; endDate: string }): Promise<{ data: any }> {
    const response = await apiClient.get('/dashboard/efficiency', dateRange);
    return response.data || response;
  },

  async getAttendanceStats(dateRange?: { startDate: string; endDate: string }): Promise<{ data: any }> {
    const response = await apiClient.get('/dashboard/attendance', dateRange);
    return response.data || response;
  },

  async getRejectionStats(dateRange?: { startDate: string; endDate: string }): Promise<{ data: any }> {
    const response = await apiClient.get('/dashboard/rejections', dateRange);
    return response.data || response;
  },

  async getProductionSummary(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get(`/dashboard/production-summary?${params.toString()}`);
    return response;
  },

  async getProcessesWithStats(): Promise<any[]> {
    const response = await apiClient.get('/dashboard/processes-with-stats');
    return response.data || response;
  }
};