import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Toaster } from 'sonner';

interface DataErrorScreenProps {
  message: string;
  onRetry: () => Promise<void>;
}

const DataErrorScreen: React.FC<DataErrorScreenProps> = ({ message, onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      className="flex h-screen w-full items-center justify-center bg-background"
      dir="rtl"
      role="alert"
      aria-live="assertive"
    >
      <Toaster position="top-center" />
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-border bg-card p-10 text-center shadow-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text">تعذر تحميل البيانات</h2>
          <p className="text-sm leading-relaxed text-text-muted">
            فشل الاتصال بقاعدة البيانات. تحقق من الاتصال وحاول مرة أخرى.
          </p>
          {import.meta.env.DEV && message && (
            <p className="mt-2 break-all rounded-md bg-red-50 px-3 py-2 font-mono text-xs text-red-600 dark:bg-red-900/10 dark:text-red-400">
              {message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isRetrying ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة'}
        </button>
      </div>
    </div>
  );
};

export default DataErrorScreen;
