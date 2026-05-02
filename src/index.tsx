import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { queryClient } from './config/queryClient';
import { errorTracker } from './services/errorTracker';
import { logger } from './services/logger';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('يتوفر تحديث جديد للتطبيق. هل تريد التحديث الآن؟')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    logger.info('App offline ready');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

globalThis.addEventListener('error', (event) => {
  logger.error('[GlobalError] Uncaught error', event.error ?? event.message);
  errorTracker.capture(event.error ?? event.message, { area: 'window', action: 'error-event' });
});

globalThis.addEventListener('unhandledrejection', (event) => {
  logger.error('[GlobalError] Unhandled rejection', event.reason);
  errorTracker.capture(event.reason, { area: 'window', action: 'unhandled-rejection' });
});

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
