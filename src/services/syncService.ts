// Sync service for offline-first functionality
import { useOfflineStore } from '@/stores/offlineStore';
import * as api from './api';
import { toast } from 'sonner';

class SyncService {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  startAutoSync(intervalMs: number = 30000) {
    this.syncInterval = setInterval(() => {
      this.syncPendingData();
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncPendingData() {
    if (this.syncInProgress) {
      return;
    }

    const { isOnline, offlineQueue, markAsSynced, removeFromQueue } = useOfflineStore.getState();
    
    if (!isOnline || offlineQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    let syncedCount = 0;
    let failedCount = 0;



    for (const item of offlineQueue.filter(item => !item.synced)) {
      try {
        await this.syncItem(item);
        markAsSynced(item.id);
        syncedCount++;
              } catch (error) {
          failedCount++;
        }
    }

    // Remove successfully synced items
    useOfflineStore.getState().clearSyncedItems();

    this.syncInProgress = false;

    if (syncedCount > 0) {
      toast.success(`Synced ${syncedCount} items successfully`);
    }

    if (failedCount > 0) {
      toast.error(`Failed to sync ${failedCount} items`);
    }


  }

  private async syncItem(item: any) {
    switch (item.type) {
      case 'attendance':
        return await api.attendanceService.markAttendance(item.data);
      
      case 'work_entry':
        return await api.workEntryService.submitWork(item.data);
      
      case 'validation':
        return await api.workEntryService.validateEntry(
          item.data.id,
          item.data.status,
          item.data.notes
        );
      
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  async forceSync() {
    const { isOnline } = useOfflineStore.getState();
    
    if (!isOnline) {
      toast.error('No internet connection available');
      return;
    }

    await this.syncPendingData();
  }

  // Queue operations for offline mode
  queueAttendance(data: any) {
    const { addToQueue } = useOfflineStore.getState();
    addToQueue({
      type: 'attendance',
      data,
      timestamp: new Date(),
    });
  }

  queueWorkEntry(data: any) {
    const { addToQueue } = useOfflineStore.getState();
    addToQueue({
      type: 'work_entry',
      data,
      timestamp: new Date(),
    });
  }

  queueValidation(data: any) {
    const { addToQueue } = useOfflineStore.getState();
    addToQueue({
      type: 'validation',
      data,
      timestamp: new Date(),
    });
  }
}

export const syncService = new SyncService();

// Initialize auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncService.syncPendingData();
  });
}