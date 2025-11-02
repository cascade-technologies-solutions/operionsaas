import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WorkEntry } from '@/types';

interface WorkState {
  workEntries: WorkEntry[];
  pendingSubmissions: WorkEntry[];
  addWorkEntry: (entry: WorkEntry) => void;
  updateWorkEntry: (id: string, data: Partial<WorkEntry>) => void;
  deleteWorkEntry: (id: string) => void;
  addPendingSubmission: (entry: WorkEntry) => void;
  removePendingSubmission: (id: string) => void;
  clearPendingSubmissions: () => void;
}

export const useWorkStore = create<WorkState>()(
  persist(
    (set) => ({
      workEntries: [],
      pendingSubmissions: [],
      
      addWorkEntry: (entry) =>
        set((state) => ({
          workEntries: [...state.workEntries, entry],
        })),
        
      updateWorkEntry: (id, data) =>
        set((state) => ({
          workEntries: state.workEntries.map((entry) =>
            entry.id === id ? { ...entry, ...data } : entry
          ),
        })),
        
      deleteWorkEntry: (id) =>
        set((state) => ({
          workEntries: state.workEntries.filter((entry) => entry.id !== id),
        })),
        
      addPendingSubmission: (entry) =>
        set((state) => ({
          pendingSubmissions: [...state.pendingSubmissions, entry],
        })),
        
      removePendingSubmission: (id) =>
        set((state) => ({
          pendingSubmissions: state.pendingSubmissions.filter(
            (entry) => entry.id !== id
          ),
        })),
        
      clearPendingSubmissions: () =>
        set({ pendingSubmissions: [] }),
    }),
    {
      name: 'work-storage',
    }
  )
);