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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
