import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { pwaService } from './services/pwaService'

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

// Register service worker for PWA
window.addEventListener('load', async () => {
  try {
    await pwaService.registerServiceWorker();
  } catch (error) {
    // PWA service worker registration failed
  }
});

createRoot(document.getElementById("root")!).render(<App />);
