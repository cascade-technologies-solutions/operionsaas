import { apiClient } from './client';
import { ProcessStagesSummaryReport, ProductProcessStagesReport, DisplayAnalyticsReport } from '@/types';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  productId?: string;
  processId?: string;
  employeeId?: string;
  factoryId?: string;
  viewType?: 'product' | 'process';
  periodType?: 'daily' | 'weekly' | 'monthly';
  period?: string;
}

export interface DetailedReportFilters extends ReportFilters {
  periodType: 'daily' | 'weekly' | 'monthly';
  period: string;
}

export interface DetailedProductionData {
  date: Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  product: {
    id: string;
    name: string;
    code: string;
  };
  process: {
    id: string;
    name: string;
    order: number;
  };
  target: number;
  achieved: number;
  rejected: number;
  efficiency: number;
  status: string;
}

export interface ProcessStagesData {
  productName: string;
  productCode: string;
  totalProduction: number;
  totalRejections: number;
  totalTarget: number;
  processStages: {
    processName: string;
    order: number;
    production: number;
    rejections: number;
    target: number;
    efficiency: number;
    entries: number;
  }[];
}

export interface EmployeePerformanceData {
  name: string;
  production: number;
  rejections: number;
  target: number;
  efficiency: number;
  count: number;
  avgDaily: number;
}

export interface TrendData {
  date: string;
  production: number;
  efficiency: number;
  rejection: number;
  attendance: number;
}

export interface ProductionData {
  name: string;
  production: number;
  target: number;
  efficiency: number;
}

export interface QualityData {
  name: string;
  value: number;
  color: string;
}

export interface EmployeePerformanceData {
  name: string;
  production: number;
  efficiency: number;
  rejections: number;
}

export interface ReportResponse {
  success: boolean;
  data: {
    trends: TrendData[];
    production: ProductionData[];
    quality: QualityData[];
    employeePerformance: EmployeePerformanceData[];
    summary: {
      totalProduction: number;
      totalEfficiency: number;
      totalRejections: number;
      activeEmployees: number;
      pendingValidations: number;
    };
  };
  message?: string;
  error?: string;
}

export const reportsService = {
  // Get production trends
  async getProductionTrends(filters: ReportFilters): Promise<TrendData[]> {
    const response = await apiClient.get('/reports/trends', filters);
    return response.data?.data?.trends || [];
  },

  // Get production data by product
  async getProductionData(filters: ReportFilters): Promise<ProductionData[]> {
    const response = await apiClient.get('/reports/production', filters);
    return response.data?.data?.production || [];
  },

  // Get quality data
  async getQualityData(filters: ReportFilters): Promise<QualityData[]> {
    const response = await apiClient.get('/reports/quality', filters);
    return response.data?.data?.quality || [];
  },

  // Get employee performance data
  async getEmployeePerformance(filters: ReportFilters): Promise<EmployeePerformanceData[]> {
    const response = await apiClient.get('/reports/employee-performance', filters);
    return response.data?.data?.employeePerformance || [];
  },

  // Get comprehensive report
  async getComprehensiveReport(filters: ReportFilters): Promise<ReportResponse['data']> {
    const response = await apiClient.get('/reports/comprehensive', filters);
    return response.data?.data || {
      trends: [],
      production: [],
      quality: [],
      employeePerformance: [],
      summary: {
        totalProduction: 0,
        totalEfficiency: 0,
        totalRejections: 0,
        activeEmployees: 0,
        pendingValidations: 0,
      }
    };
  },

  // Generate and export report
  async exportReport(filters: ReportFilters, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await apiClient.get(`/reports/export/${format}`, filters, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get employee performance for specific employee
  async getEmployeePerformanceData(employeeId: string, filters: ReportFilters): Promise<any> {
    
    try {
      const response = await apiClient.get(`/reports/employee/${employeeId}`, filters);
      
      // Handle different response structures
      if (response && response.data) {
        return response.data;
      } else if (response && response.success) {
        return response.data || {};
      } else {
        return {};
      }
    } catch (error) {
      console.error('❌ Reports service error:', error);
      throw error;
    }
  },

  // Get factory summary statistics
  async getFactorySummary(factoryId: string): Promise<any> {
    const response = await apiClient.get(`/reports/factory-summary/${factoryId}`);
    return response.data?.data || {};
  },

  // Get supervisor team performance
  async getTeamPerformance(supervisorId: string, filters: ReportFilters): Promise<any> {
    const response = await apiClient.get(`/reports/team-performance/${supervisorId}`, filters);
    return response.data?.data || {};
  },

  // Get process stages summary report
  async getProcessStagesSummary(filters: ReportFilters): Promise<ProcessStagesSummaryReport> {
    const response = await apiClient.get('/reports/process-stages-summary', filters);
    return response.data?.data || {
      viewType: 'product',
      products: [],
      processes: [],
      grandTotals: {
        totalAchieved: 0,
        totalRejected: 0,
        totalAvailable: 0
      },
      dateRange: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    };
  },

  // Export process stages summary report
  async exportProcessStagesSummary(filters: ReportFilters, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await apiClient.get(`/reports/process-stages-summary/export/${format}`, filters, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get product process stages report
  async getProductProcessStages(filters: ReportFilters & { realtime?: boolean }): Promise<ProductProcessStagesReport> {
    const response = await apiClient.get('/reports/product-process-stages', filters);
    return response.data || {
      products: [],
      grandTotals: {
        totalAchieved: 0,
        totalRejected: 0,
        totalAvailable: 0,
        totalTarget: 0
      },
      activeSessions: [],
      lastUpdated: new Date().toISOString(),
      realtime: false
    };
  },

  // Get realtime display data
  async getRealtimeDisplay(filters: ReportFilters): Promise<DisplayAnalyticsReport> {
    const response = await apiClient.get('/reports/realtime-display', filters);
    return response.data || {
      products: [],
      grandTotals: {
        totalAchieved: 0,
        totalRejected: 0,
        totalAvailable: 0,
        totalTarget: 0
      },
      activeSessions: [],
      analytics: {
        plan: 0,
        actual: 0,
        expected: 0,
        avgCycleTime: 0,
        totalProducts: 0,
        totalProcesses: 0,
        efficiency: 0
      },
      hourlyData: [],
      productPlanData: [],
      processStagesData: [],
      analyticsGrandTotals: {
        totalPlan: 0,
        totalProduction: 0,
        totalExpected: 0,
        overallAchievement: 0
      },
      lastUpdated: new Date().toISOString(),
      realtime: true
    };
  },

  // Export product process stages report
  async exportProductProcessStages(filters: ReportFilters & { realtime?: boolean }, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await apiClient.get(`/reports/product-process-stages/export/${format}`, filters, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get detailed production data
  async getProductionDetailed(filters: DetailedReportFilters): Promise<DetailedProductionData[]> {
    const response = await apiClient.get('/reports/production-detailed', filters);
    return response.data?.data || [];
  },

  // Get process stages analysis
  async getProcessStagesAnalysis(filters: DetailedReportFilters): Promise<ProcessStagesData[]> {
    const response = await apiClient.get('/reports/process-stages-analysis', filters);
    return response.data?.data || [];
  },

  // Get employee performance data (enhanced)
  async getEmployeePerformanceDetailed(filters: DetailedReportFilters): Promise<EmployeePerformanceData[]> {
    const response = await apiClient.get('/reports/employee-performance', filters);
    return response.data?.data || [];
  },

  // Export detailed report with period types
  async exportDetailedReport(filters: DetailedReportFilters, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await apiClient.get(`/reports/export/${format}`, filters, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Search production report
  async searchProductionReport(filters: {
    searchType: 'product' | 'process';
    searchId: string;
    dateFilter?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
    startDate?: string;
    endDate?: string;
  }): Promise<{
    searchType: 'product' | 'process';
    searchName: string;
    data: Array<{
      date: string;
      processStageId?: string;
      processStageName?: string;
      stageOrder?: number;
      totalAchieved: number;
      totalRejected: number;
      machines: string[];
      machinesUsed: string;
      efficiency: number;
      target: number;
    }>;
  }> {
    const response = await apiClient.get('/reports/search-production', filters);
    
    // Handle different response structures:
    // Backend returns: { success: true, data: { searchType, searchName, data: [...] } }
    // apiClient.get returns the parsed JSON, so response = { success: true, data: { searchType, searchName, data: [...] } }
    // Therefore response.data = { searchType, searchName, data: [...] }
    
    let result: any;
    if (response.data?.data && typeof response.data.data === 'object' && 'searchType' in response.data.data) {
      // Nested structure: response.data.data = { searchType, searchName, data: [...] }
      result = response.data.data;
    } else if (response.data && typeof response.data === 'object' && 'searchType' in response.data) {
      // Direct structure: response.data = { searchType, searchName, data: [...] }
      result = response.data;
    } else {
      // Fallback
      result = {
        searchType: filters.searchType,
        searchName: '',
        data: []
      };
    }
    
    // Ensure data is always an array
    const resultData = {
      searchType: result.searchType || filters.searchType,
      searchName: result.searchName || '',
      data: Array.isArray(result.data) ? result.data : []
    };
    
    
    return resultData;
  },

  // Export search report
  async exportSearchReport(
    filters: {
      searchType: 'product' | 'process';
      searchId: string;
      dateFilter?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
      startDate?: string;
      endDate?: string;
    },
    format: 'pdf' | 'excel'
  ): Promise<Blob> {
    const blob = await apiClient.get<Blob>(`/reports/search-production/export/${format}`, filters, {
      responseType: 'blob'
    });
    
    // Ensure we have a valid Blob object
    if (!(blob instanceof Blob)) {
      console.error('Invalid blob response:', blob);
      throw new Error('Invalid file response from server');
    }
    
    return blob;
  }
};
