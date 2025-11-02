// User Types
export type UserRole = 'super_admin' | 'factory_admin' | 'supervisor' | 'employee';

export interface User {
  id?: string;
  _id?: string;
  username?: string;
  email?: string | null;
  role: UserRole;
  factoryId?: string;
  supervisorId?: string;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    avatar?: string;
  };
  assignedProcesses?: (string | Process)[];
  deviceId?: string | null;
  isActive: boolean;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Factory Types
export interface Factory {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  geofence: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  adminId?: string;
  subscription?: {
    plan: 'basic' | 'pro' | 'enterprise';
    validUntil: Date;
    maxUsers: number;
  };
  status?: 'pending' | 'approved' | 'suspended';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Product Types
export interface Product {
  id?: string;
  _id?: string;
  factoryId: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  isActive: boolean;
  dailyTarget?: number;
  processes?: Array<{
    processId: string;
    order: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Process Types
export interface Process {
  id?: string;
  _id?: string;
  factoryId: string;
  name: string;
  machineNumber?: string;
  stage: number;
  description?: string;
  targetPerHour: number;
  isActive: boolean;
  availableQuantity?: number;
  isLocked?: boolean;
  lockedAt?: Date;
  dailyTarget?: number;
  createdAt: Date;
  updatedAt: Date;
}


// Machine Types
export interface Machine {
  _id: string;
  factoryId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Attendance Types
export interface Attendance {
  id?: string;
  _id?: string;
  employeeId: string;
  factoryId: string;
  date?: Date;
  checkIn: {
    time: Date;
    date?: Date;
    location: {
      latitude: number;
      longitude: number;
    };
    isWithinGeofence: boolean;
    status: 'present' | 'absent' | 'half-day';
  };
  checkOut?: {
    time: Date;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  shiftType: 'morning' | 'evening' | 'night';
  processId: string;
  target: number;
  status?: 'present' | 'absent' | 'half-day'; // Keep for backward compatibility
  createdAt: Date;
  updatedAt?: Date;
}

// Work Entry Types
export interface WorkEntry {
  id?: string;
  _id?: string;
  employeeId: string | { _id: string; profile: { firstName: string; lastName: string } };
  supervisorId?: string;
  factoryId: string | { _id: string; name: string };
  attendanceId: string;
  processId: string | { _id: string; name: string };
  productId: string;
  machineId?: string;
  machineCode?: string;
  shiftType?: string;
  achieved: number;
  rejected: number;
  photo: string;
  validationStatus: 'pending' | 'approved' | 'rejected';
  validatedBy?: string | { _id: string; profile: { firstName: string; lastName: string } };
  validatedAt?: Date;
  validationNotes?: string;
  reasonForLessProduction?: string;
  targetQuantity: number;
  startTime: Date;
  endTime: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Report Types
export interface Report {
  id: string;
  factoryId: string;
  generatedBy: string;
  type: 'production' | 'efficiency' | 'rejection' | 'attendance';
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    productId?: string;
    processId?: string;
    employeeId?: string;
  };
  data: Record<string, unknown>;
  createdAt: Date;
}

// Dashboard Stats
export interface DashboardStats {
  attendance: {
    totalRecords: number;
    checkedIn: number;
    checkedOut: number;
    absent: number;
    late: number;
  };
  workEntries: {
    totalEntries: number;
    pending: number;
    approved: number;
    rejected: number;
    totalTarget: number;
    totalAchieved: number;
    totalRejected: number;
    efficiency: number;
  };
  processes: {
    totalProcesses: number;
    active: number;
    inactive: number;
    maintenance: number;
  };
  products: {
    totalProducts: number;
    active: number;
    lowStock: number;
    totalStock: number;
    totalValue: number;
  };
  employees: {
    totalEmployees: number;
    active: number;
    inactive: number;
  };
}

// Process Stages Summary Types
export interface ProcessStagesSummaryItem {
  processId: string;
  processName: string;
  stageOrder: number;
  achievedQuantity: number;
  rejectedQuantity: number;
  availableQuantity: number;
  workEntryCount: number;
  targetQuantity: number;
  efficiency: number;
  latestEntry?: Date;
}

export interface ProductSummary {
  productId: string;
  productName: string;
  productCode: string;
  processes: ProcessStagesSummaryItem[];
  totals: {
    totalAchieved: number;
    totalRejected: number;
    totalAvailable: number;
  };
}

export interface ProcessSummary {
  processId: string;
  processName: string;
  stageOrder: number;
  products: {
    productId: string;
    productName: string;
    productCode: string;
    achievedQuantity: number;
    rejectedQuantity: number;
    availableQuantity: number;
    workEntryCount: number;
    targetQuantity: number;
    efficiency: number;
    latestEntry?: Date;
  }[];
  totals: {
    totalAchieved: number;
    totalRejected: number;
    totalAvailable: number;
  };
}

export interface ProcessStagesSummaryReport {
  viewType: 'product' | 'process';
  products?: ProductSummary[];
  processes?: ProcessSummary[];
  grandTotals: {
    totalAchieved: number;
    totalRejected: number;
    totalAvailable: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Product Process Stages Types
export interface ProcessStageData {
  processId: string;
  processName: string;
  stageOrder: number;
  achievedQuantity: number;
  rejectedQuantity: number;
  availableQuantity: number;
  targetQuantity: number;
  efficiency: number;
  workEntryCount: number;
  latestEntry?: Date;
  activeWorkSessions?: number;
}

export interface ProductProcessStagesData {
  productId: string;
  productName: string;
  productCode: string;
  processes: ProcessStageData[];
  totals: {
    totalAchieved: number;
    totalRejected: number;
    totalAvailable: number;
    totalTarget: number;
  };
}

export interface ActiveWorkSession {
  productId: string;
  productName: string;
  processId: string;
  processName: string;
  employeeName: string;
  startTime: Date;
  currentAchieved: number;
  currentRejected: number;
}

export interface ProductProcessStagesReport {
  products: ProductProcessStagesData[];
  grandTotals: {
    totalAchieved: number;
    totalRejected: number;
    totalAvailable: number;
    totalTarget: number;
  };
  activeSessions: ActiveWorkSession[];
  lastUpdated: string;
  realtime: boolean;
}

// Analytics Display Types
export interface HourlyProductionData {
  hour: string;
  production: number;
  plan: number;
  expected: number;
  timestamp: string;
}

export interface DisplayAnalytics {
  plan: number;
  actual: number;
  expected: number;
  avgCycleTime: number;
  totalProducts: number;
  totalProcesses: number;
  efficiency: number;
}

export interface ProductPlanData {
  sequence: number;
  modelCode: string;
  modelName: string;
  production: number;
  rejected: number;
  efficiency: number;
  productId: string;
  processId: string;
  processName: string;
}

export interface ProcessStageData {
  processName: string;
  stageOrder: number;
  achieved: number;
  rejected: number;
  processId: string;
}

export interface ProcessStageAnalytics {
  productName: string;
  productCode: string;
  processes: ProcessStageData[];
}

export interface DisplayAnalyticsReport {
  analytics: DisplayAnalytics;
  hourlyData: HourlyProductionData[];
  productPlanData: ProductPlanData[];
  processStagesData: ProcessStageAnalytics[];
  grandTotals: {
    totalPlan: number;
    totalProduction: number;
    totalExpected: number;
    overallAchievement: number;
  };
  lastUpdated: string;
  realtime: boolean;
}
