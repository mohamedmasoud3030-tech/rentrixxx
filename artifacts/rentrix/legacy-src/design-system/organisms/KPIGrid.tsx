import React from 'react';
import { KpiCard } from '../molecules/KpiCard';

export const KPIGrid: React.FC<{
  items: Array<{ label: string; value: string; icon?: React.ReactNode; tone?: 'default' | 'success' | 'danger' | 'warning'; subtitle?: string }>;
  className?: string;
}> = ({ items, className = '' }) => (
  <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 ${className}`}>
    {items.map((item) => (
      <KpiCard key={item.label} title={item.label} value={item.value} icon={item.icon} tone={item.tone} subtitle={item.subtitle} />
    ))}
  </div>
);
