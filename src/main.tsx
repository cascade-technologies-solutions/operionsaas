import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { pwaService } from './services/pwaService'

// Ensure dark mode is applied by default
document.documentElement.classList.add('dark')

// Initialize Sentry for error tracking (optional)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  // Use dynamic import to avoid breaking if package not installed
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE || 'development',
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event) {
          // Remove sensitive data
          if (event.request) {
            if (event.request.headers) {
              delete event.request.headers['authorization']
            }
          }
          return event
        },
      })
    })
    .catch(() => {
      // Sentry package not installed or failed to load - continue without it
      console.debug('Sentry not available - error tracking disabled')
    })
}

// TEMPORARY FIX: Unregister all service workers to fix CORS issues
// Service workers interfere with CORS preflight requests even when bypassing
window.addEventListener('load', async () => {
  try {
    // First, unregister ALL existing service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Unregistered service worker to fix CORS');
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('Cleared all caches');
      }
    }
    
    // Temporarily disabled: Don't register service worker until CORS issue is fully resolved
    // await pwaService.registerServiceWorker();
    console.log('Service worker registration temporarily disabled to fix CORS');
  } catch (error) {
    console.error('Service worker cleanup failed:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
