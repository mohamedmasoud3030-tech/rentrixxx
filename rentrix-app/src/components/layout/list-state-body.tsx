import type { ReactNode } from 'react';
import { AsyncContentState } from '@/components/async-content-state';

interface ListStateBodyProps {
  status: 'loading' | 'error' | 'empty' | 'ready';
  error?: unknown;
  errorTitle?: string;
  errorAction?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
}

export function ListStateBody({
  status,
  error,
  errorTitle,
  errorAction,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}: ListStateBodyProps) {
  return (
    <AsyncContentState
      status={status}
      error={error}
      errorTitle={errorTitle}
      errorAction={errorAction}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
    >
      {children}
    </AsyncContentState>
  );
}
