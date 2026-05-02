import React from 'react';
import { PageContainer } from '@/design-system';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppErrorFallback } from '@/components/AppErrorFallback';

type AppShellLayoutProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export const AppShellLayout: React.FC<AppShellLayoutProps> = ({ children, header, footer }) => {
  return (
    <PageContainer header={header} footer={footer}>
      <ErrorBoundary
        boundaryName="app-shell-layout"
        fallback={({ retry, severity }) => <AppErrorFallback retry={retry} severity={severity} />}
      >
        {children}
      </ErrorBoundary>
    </PageContainer>
  );
};
