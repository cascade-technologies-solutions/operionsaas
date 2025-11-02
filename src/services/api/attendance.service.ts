// Attendance Service
import { Attendance } from '@/types';
import { apiClient } from './client';

export const attendanceService = {
  async getAttendance(): Promise<{ data: Attendance[] }> {
    const response = await apiClient.get('/attendance');
    
    // Handle the nested response structure
    const responseData = response.data || response;
    
    // The backend returns { data: { attendance: [...], pagination: {...} } }
    let attendanceArray: Attendance[] = [];
    
    if (responseData.data && responseData.data.attendance) {
      attendanceArray = responseData.data.attendance;
    } else if (responseData.attendance) {
      attendanceArray = responseData.attendance;
    } else if (Array.isArray(responseData)) {
      attendanceArray = responseData;
    } else if (Array.isArray(responseData.data)) {
      attendanceArray = responseData.data;
    } else {
      attendanceArray = [];
    }
    
    return { data: attendanceArray };
  },

  async getAttendanceByEmployee(employeeId: string): Promise<{ data: Attendance[] }> {
    const response = await apiClient.get(`/attendance/employee/${employeeId}`);
    // Handle both wrapped and unwrapped responses
    const responseData = response.data || response;
    
    // The backend returns { data: { attendance: [...], pagination: {...} } }
    const attendanceArray = responseData?.attendance || responseData?.data || responseData || [];
    
    return {
      data: attendanceArray
    };
  },

  async getTodayAttendance(employeeId: string): Promise<{ data: Attendance }> {
    const response = await apiClient.get(`/attendance/today/${employeeId}`);
    const responseData = response.data || response;
    
    // Handle different response structures
    let attendanceData: Attendance | null = null;
    
    if (responseData.data && responseData.data.attendance) {
      attendanceData = responseData.data.attendance;
    } else if (responseData.attendance) {
      attendanceData = responseData.attendance;
    } else if (responseData._id || responseData.id) {
      attendanceData = responseData;
    }
    
    return { data: attendanceData };
  },

  async checkIn(data: {
    employeeId: string;
    processId: string;
    location: { latitude: number; longitude: number };
    shiftType: 'morning' | 'evening' | 'night';
    target: number;
  }): Promise<{ data: Attendance }> {
    const response = await apiClient.post('/attendance/check-in', data);
    return response.data || response;
  },

  async checkOut(attendanceId: string, location: { latitude: number; longitude: number }): Promise<{ data: Attendance }> {
    const response = await apiClient.post(`/attendance/${attendanceId}/check-out`, { location });
    return response.data || response;
  },

  async updateStatus(attendanceId: string, status: 'present' | 'absent' | 'half-day'): Promise<{ data: Attendance }> {
    const response = await apiClient.patch(`/attendance/${attendanceId}/status`, { status });
    return response.data || response;
  },

  async getAttendanceHistory(employeeId: string, startDate?: Date, endDate?: Date): Promise<{ data: Attendance[] }> {
    let url = `/attendance/employee/${employeeId}/history`;
    
    // Add date range parameters if provided
    const params = new URLSearchParams();
    if (startDate) {
      params.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      params.append('endDate', endDate.toISOString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    

    
    const response = await apiClient.get(url);
    
    // The backend returns { data: { attendance: [...], pagination: {...} } }
    const responseData = response.data || response;
    
    if (responseData.data && responseData.data.attendance) {
      return { data: responseData.data.attendance };
    } else if (responseData.attendance) {
      return { data: responseData.attendance };
    } else if (Array.isArray(responseData)) {
      return { data: responseData };
    } else {
      return { data: [] };
    }
  },

  async markAbsent(): Promise<{ data: { markedAbsent: number; alreadyMarked: number; totalEmployees: number } }> {
    const response = await apiClient.post('/attendance/mark-absent');
    return response.data || response;
  },
};