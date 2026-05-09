import React from 'react';
import Card from './card';

export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => (
  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`.trim()}>
    <div>
      <h1 className="text-3xl font-black tracking-tight text-primary">{title}</h1>
      {subtitle ? <p className="text-text-muted text-sm mt-1">{subtitle}</p> : null}
    </div>
    {action ? <div className="flex items-center gap-3">{action}</div> : null}
  </div>
);

export const SectionWrapper: React.FC<{ title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, action, children, className = '' }) => (
  <Card className={className}>
    {(title || action) ? (
      <div className="flex justify-between items-center mb-4">
        {title ? <h2 className="text-xl font-bold">{title}</h2> : <div />}
        {action}
      </div>
    ) : null}
    {children}
  </Card>
);

export const FilterActionToolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>{children}</div>
);
