import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import AppErrorBoundary from './components/shared/AppErrorBoundary';
import { errorTracker } from './services/errorTracker';
import { logger } from './services/logger';
import './index.css';


let theme = 'light';
try {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    const parsedTheme = JSON.parse(storedTheme) as unknown;
    theme = typeof parsedTheme === 'string' ? parsedTheme : storedTheme;
  }
} catch {
  theme = localStorage.getItem('theme') || 'light';
}
document.documentElement.setAttribute('data-theme', theme);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => console.log('Service Worker registered successfully'))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}

window.addEventListener('error', (event) => {
  logger.error('[GlobalError] Uncaught error', event.error ?? event.message);
  errorTracker.capture(event.error ?? event.message, { area: 'window', action: 'error-event' });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('[GlobalError] Unhandled rejection', event.reason);
  errorTracker.capture(event.reason, { area: 'window', action: 'unhandled-rejection' });
});

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
