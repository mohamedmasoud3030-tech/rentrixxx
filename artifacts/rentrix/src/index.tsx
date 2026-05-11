import './i18n';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { queryClient } from './config/queryClient';
import { errorTracker } from './infrastructure/observability';
import { logger } from './infrastructure/observability';
import './index.css';

const ReactQueryDevtools = import.meta.env.DEV
  ? React.lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : null;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

globalThis.addEventListener('error', (event) => {
  logger.error('[GlobalError] Uncaught error', { message: event.error?.message || event.message, code: event.error?.code });
  errorTracker.capture(event.error ?? event.message, { area: 'global', action: 'error-event' });
});

globalThis.addEventListener('unhandledrejection', (event) => {
  logger.error('[GlobalError] Unhandled rejection', { message: event.reason?.message || String(event.reason), code: event.reason?.code });
  errorTracker.capture(event.reason, { area: 'global', action: 'unhandled-rejection' });
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
      {ReactQueryDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
