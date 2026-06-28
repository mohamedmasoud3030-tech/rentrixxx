import type { ReactNode } from 'react';
import { AsyncContentState } from '@/components/async-content-state';

interface ListStateBodyProps {
  readonly status: 'loading' | 'error' | 'empty' | 'ready';
  readonly error?: unknown;
  readonly errorTitle?: string;
  readonly errorAction?: ReactNode;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly emptyAction?: ReactNode;
  readonly children: ReactNode;
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
}: Readonly<ListStateBodyProps>) {
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
