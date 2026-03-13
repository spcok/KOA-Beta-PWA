import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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

// Capture PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  // @ts-expect-error - custom property
  window.deferredPwaPrompt = e;
  console.log(`'beforeinstallprompt' event was fired and captured.`);
});

// Manual Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Native Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Native Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
