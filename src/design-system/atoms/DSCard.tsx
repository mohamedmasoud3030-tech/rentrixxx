import React from 'react';

export const DSCard: React.FC<{ className?: string; children: React.ReactNode; floating?: boolean }> = ({ className = '', children, floating = false }) => (
  <div
    className={`rounded-2xl border border-border bg-card p-4 md:p-6 transition duration-[260ms] ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
      floating ? 'backdrop-blur-md shadow-[var(--ds-shadow-floating)]' : 'shadow-[var(--shadow-card)]'
    } ${className}`}
  >
    {children}
  </div>
);
