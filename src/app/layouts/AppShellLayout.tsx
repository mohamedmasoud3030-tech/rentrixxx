import React from 'react';
import { PageContainer } from '@/design-system';

type AppShellLayoutProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export const AppShellLayout: React.FC<AppShellLayoutProps> = ({ children, header, footer }) => {
  return (
    <PageContainer header={header} footer={footer}>
      {children}
    </PageContainer>
  );
};
