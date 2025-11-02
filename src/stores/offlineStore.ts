import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OfflineData {
  id: string;
  type: 'attendance' | 'work_entry' | 'validation';
  data: any;
  timestamp: Date;
  synced: boolean;
}

interface OfflineState {
  isOnline: boolean;
  offlineQueue: OfflineData[];
  setOnlineStatus: (status: boolean) => void;
  addToQueue: (data: Omit<OfflineData, 'id' | 'synced'>) => void;
  markAsSynced: (id: string) => void;
  removeFromQueue: (id: string) => void;
  clearSyncedItems: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: navigator.onLine,
      offlineQueue: [],
      
      setOnlineStatus: (status) =>
        set({ isOnline: status }),
        
      addToQueue: (data) =>
        set((state) => ({
          offlineQueue: [
            ...state.offlineQueue,
            {
              ...data,
              id: Date.now().toString(),
              synced: false,
            },
          ],
        })),
        
      markAsSynced: (id) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.map((item) =>
            item.id === id ? { ...item, synced: true } : item
          ),
        })),
        
      removeFromQueue: (id) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((item) => item.id !== id),
        })),
        
      clearSyncedItems: () =>
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((item) => !item.synced),
        })),
    }),
    {
      name: 'offline-storage',
    }
  )
);

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false);
  });
}