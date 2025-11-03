// PWA Service for handling service worker registration and PWA functionality
class PWAService {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator;

  async registerServiceWorker(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('Service Worker not supported');
      return false;
    }

    try {
      // First, unregister any existing service worker
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of existingRegistrations) {
        await registration.unregister();
      }

      // Clear all caches
      await this.clearAllCaches();

      // Register new service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Force update - bypasses HTTP cache for service worker file
      });

      console.log('Service Worker registered successfully:', this.registration);

      // Force immediate activation if a new worker is installing
      if (this.registration.installing) {
        const installingWorker = this.registration.installing;
        console.log('New service worker installing, forcing skip waiting');
        installingWorker.postMessage({ type: 'SKIP_WAITING' });
        
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'activated') {
            console.log('New service worker activated, reloading page');
            window.location.reload();
          }
        });
      }

      // If there's a waiting worker, activate it immediately
      if (this.registration.waiting) {
        console.log('Waiting service worker found, forcing activation');
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Reload after a short delay to allow activation
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          console.log('Update found, new service worker installing');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content is available
                console.log('New service worker installed, forcing activation');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                // Reload to activate new worker
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              } else {
                // First time installation
                console.log('Service worker installed for the first time');
              }
            }
          });
        }
      });

      // Listen for service worker activation messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_ACTIVATED') {
          console.log('Service worker activated, version:', event.data.version);
        }
      });

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  async unregisterServiceWorker(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.unregister();
      this.registration = null;
      return true;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  async clearAllCaches(): Promise<void> {
    if (!this.isSupported) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    if (!this.isSupported) return 0;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return 0;
    }
  }

  private notifyUpdateAvailable(): void {
    // This would typically show a notification to the user
    // that a new version is available
    console.log('New version available');
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  addOnlineListener(callback: () => void): void {
    window.addEventListener('online', callback);
  }

  addOfflineListener(callback: () => void): void {
    window.addEventListener('offline', callback);
  }

  removeOnlineListener(callback: () => void): void {
    window.removeEventListener('online', callback);
  }

  removeOfflineListener(callback: () => void): void {
    window.removeEventListener('offline', callback);
  }

  async forceUpdate(): Promise<void> {
    if (!this.isSupported) return;

    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      // Clear all caches
      await this.clearAllCaches();

      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Failed to force update:', error);
    }
  }
}

export const pwaService = new PWAService();
