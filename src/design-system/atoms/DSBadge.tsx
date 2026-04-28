import React from 'react';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export const DSBadge: React.FC<{ children: React.ReactNode; variant?: Variant; className?: string }> = ({ children, variant = 'default', className = '' }) => {
  const styles: Record<Variant, string> = {
    default: 'bg-background text-text-muted border-border',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[variant]} ${className}`}>{children}</span>;
};
