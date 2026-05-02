import React, { ReactNode } from 'react';
import { logger } from '@/services/logger';

type FallbackRenderContext = {
  error: Error | null;
  retry: () => void;
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((context: FallbackRenderContext) => ReactNode);
  boundaryName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(`[ErrorBoundary] ${this.props.boundaryName ?? 'unknown'} render failure`, {
      area: 'ui',
      action: 'render',
      boundaryName: this.props.boundaryName ?? 'unknown',
      componentStack: errorInfo.componentStack,
      message: error.message,
      stack: error.stack,
    });
  }

  private readonly handleRetry = () => {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error: this.state.error, retry: this.handleRetry });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <h2 className="font-bold text-red-800">حدث خلل غير متوقع</h2>
          <p className="text-sm text-red-700">تعذر عرض هذا الجزء حالياً. حاول مرة أخرى.</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 rounded-md bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-800"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
