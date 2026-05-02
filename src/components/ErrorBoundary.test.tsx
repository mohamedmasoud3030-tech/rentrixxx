import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { logger, errorTracker } from '@/infrastructure/observability';

vi.mock('@/infrastructure/observability', () => ({
  logger: {
    error: vi.fn(),
  },
  errorTracker: {
    capture: vi.fn(),
  },
}));

const Boom: React.FC = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('catches render exceptions and shows fallback', () => {
    render(
      <ErrorBoundary boundaryName="test-boundary">
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert').textContent).toContain('حدث خلل غير متوقع');
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(errorTracker.capture).toHaveBeenCalledTimes(1);
  });

  it('retries rendering when retry button is clicked', () => {
    let shouldThrow = true;
    const Flaky: React.FC = () => {
      if (shouldThrow) {
        throw new Error('first render fails');
      }
      return <div>ok-now</div>;
    };

    render(
      <ErrorBoundary boundaryName="retry-boundary">
        <Flaky />
      </ErrorBoundary>,
    );

    const retryButton = screen.getByRole('button', { name: 'إعادة المحاولة' });
    shouldThrow = false;
    fireEvent.click(retryButton);

    expect(screen.getByText('ok-now')).toBeTruthy();
  });

  it('renders custom fallback for subtree throw with recoverable classification', () => {
    render(
      <ErrorBoundary
        boundaryName="subtree-boundary"
        fallback={({ severity }) => <div role="alert">severity:{severity}</div>}
      >
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert').textContent).toContain('severity:recoverable');
  });
});
