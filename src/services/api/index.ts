// Central API Export
export { apiClient } from './client';
export { authService } from './auth.service';
export { factoryService } from './factory.service';
export { productService } from './product.service';
export { processService } from './process.service';
export { machineService } from './machine.service';
export { userService } from './user.service';
export { attendanceService } from './attendance.service';
export { workEntryService } from './workEntry.service';
export { dashboardService } from './dashboard.service';
export { reportsService } from './reports.service';

// Re-export types for convenience
export type { ApiResponse, RequestConfig } from './client';