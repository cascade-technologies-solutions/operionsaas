import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Attendance } from '@/types';

interface AttendanceState {
  currentAttendance: Attendance | null;
  attendanceHistory: Attendance[];
  setCurrentAttendance: (attendance: Attendance | null) => void;
  addAttendance: (attendance: Attendance) => void;
  clearCurrentAttendance: () => void;
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set) => ({
      currentAttendance: null,
      attendanceHistory: [],
      
      setCurrentAttendance: (attendance) =>
        set({ currentAttendance: attendance }),
        
      addAttendance: (attendance) =>
        set((state) => ({
          attendanceHistory: [...state.attendanceHistory, attendance],
          currentAttendance: attendance,
        })),
        
      clearCurrentAttendance: () =>
        set({ currentAttendance: null }),
    }),
    {
      name: 'attendance-storage',
    }
  )
);