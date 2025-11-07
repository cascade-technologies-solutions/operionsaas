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

// Re-enable service worker with CORS-safe configuration
window.addEventListener('load', async () => {
  try {
    // Clean up any previously registered service workers and caches
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const result = await registration.unregister();
        if (result) {
          console.log('[SW] Removed stale service worker registration');
        }
      }
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      if (cacheNames.length > 0) {
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log('[SW] Cleared legacy caches before re-registration');
      }
    }

    // Register the service worker (handles its own cleanup internally as well)
    const registered = await pwaService.registerServiceWorker();
    if (!registered) {
      console.warn('[SW] Service worker not registered (unsupported or disabled)');
    } else {
      console.log('[SW] Service worker registration completed');
    }
  } catch (error) {
    console.error('[SW] Service worker setup failed', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
