import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// PWA Event Trap - Capture before React mounts to eliminate race conditions
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // @ts-expect-error - custom property
  window.deferredPwaPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-prompt-captured'));
  console.log('🛠️ [PWA] Install prompt captured and stashed.');
});

// Global Error Boundaries
window.onerror = function (message, source, lineno, colno, error) {
  console.error('🛠️ [Engine QA] Global Error Caught:', { message, source, lineno, colno, error });
  // Prevent white-screening by returning true (optional, but we want to log it safely)
  return false; 
};

window.addEventListener('unhandledrejection', function (event) {
  console.error('🛠️ [Engine QA] Unhandled Promise Rejection:', event.reason);
  // Prevent default handling if necessary
  // event.preventDefault();
});

// PWA Exterminator - REMOVED for Phase 3 implementation
// We are now implementing a native Service Worker

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  // Nuclear Ghost Killer
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      console.warn('🗑️ [Nuclear Cleanup] Removing Service Worker:', registration.scope);
      registration.unregister();
    }
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🛠️ [PWA] Service Worker registered:', registration.scope);

      // 1. Update Detection (OTA)
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🛠️ [PWA] New content available; please refresh.');
              window.dispatchEvent(new CustomEvent('pwa-update-available'));
            }
          });
        }
      });

      // 2. Background Sync Registration (Wait for active state)
      navigator.serviceWorker.ready.then((readyRegistration) => {
        if ('sync' in readyRegistration) {
          // @ts-expect-error - sync is not in standard types yet
          readyRegistration.sync.register('koa-sync').catch((err) => {
            console.warn('🛠️ [PWA] Background Sync registration failed:', err);
          });
        }
      });

    } catch (err) {
      console.error('🛠️ [PWA] SW Registration Failed:', err);
    }
  });

  // 3. Broadcast Listener for Background Sync
  const broadcast = new BroadcastChannel('koa-pwa-messages');
  broadcast.onmessage = (event) => {
    if (event.data && event.data.type === 'SYNC_REQUESTED') {
      console.log('🌐 [PWA] Sync requested by Service Worker. Processing queue...');
      import('./lib/syncEngine').then(({ processSyncQueue }) => {
        processSyncQueue().catch(err => console.error('🛠️ [PWA] Background sync processing failed:', err));
      });
    }
  };
}
