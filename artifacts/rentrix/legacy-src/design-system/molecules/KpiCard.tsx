import React from 'react';
import { DSCard } from '../atoms/DSCard';
import { DSIcon } from '../atoms/DSIcon';
import { DSText } from '../atoms/DSText';

export const KpiCard: React.FC<{
  title: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'warning';
  subtitle?: string;
}> = ({ title, value, icon, tone = 'default', subtitle }) => {
  const toneClass = tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-primary';
  return (
    <DSCard className="kpi-card p-5">
      <div className="flex items-start justify-between gap-2">
        <DSText variant="caption" className="text-text-muted">{title}</DSText>
        {icon && <DSIcon size="md" className={toneClass}>{icon}</DSIcon>}
      </div>
      <DSText as="p" variant="h2" className="mt-2" dir="ltr">{value}</DSText>
      {subtitle && <DSText as="p" variant="caption" className="mt-1 text-text-muted">{subtitle}</DSText>}
    </DSCard>
  );
};
