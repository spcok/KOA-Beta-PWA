import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Error Boundaries
window.onerror = function (message, source, lineno, colno, error) {
  console.error('🛠️ [Engine QA] Global Error Caught:', { message, source, lineno, colno, error });
  return false; 
};

window.addEventListener('unhandledrejection', function (event) {
  console.error('🛠️ [Engine QA] Unhandled Promise Rejection:', event.reason);
});

// 🚨 SCORCHED EARTH: Service Worker Exterminator
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('🚨 SCORCHED EARTH: Unregistered ghost Service Worker:', registration);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
