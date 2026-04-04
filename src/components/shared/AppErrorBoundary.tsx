import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error): void {
    console.error('[AppErrorBoundary] Unhandled render error', error);
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
          <div className="max-w-md w-full rounded-2xl border border-outline-variant/40 bg-surface-container-low p-6 text-center">
            <h1 className="text-xl font-black mb-2">حدث خطأ غير متوقع</h1>
            <p className="text-sm text-text-muted">يرجى تحديث الصفحة أو إعادة تسجيل الدخول.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
