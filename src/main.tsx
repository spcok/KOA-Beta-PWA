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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
