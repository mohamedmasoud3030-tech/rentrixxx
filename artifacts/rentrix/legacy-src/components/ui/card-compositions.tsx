import React from 'react';
import Card from './card';

export const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  className?: string;
}> = ({ label, value, icon, tone = 'default', className = '' }) => {
  const toneClass = {
    default: 'text-text',
    success: 'text-green-700 dark:text-green-400',
    danger: 'text-red-700 dark:text-red-400',
    warning: 'text-amber-700 dark:text-amber-400',
    info: 'text-blue-700 dark:text-blue-400',
  }[tone];
  return (
    <Card className={`p-4 text-center ${className}`.trim()}>
      {icon ? <div className="mx-auto mb-1 w-fit opacity-70">{icon}</div> : null}
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </Card>
  );
};

export const StatusBadge: React.FC<{ ok: boolean; okText: string; badText: string }> = ({ ok, okText, badText }) => (
  <span className={`px-2 py-1 text-xs rounded-full ${ok ? 'bg-green-100 text-green-800 dark:bg-green-900/50' : 'bg-red-100 text-red-800 dark:bg-red-900/50'}`}>
    {ok ? okText : badText}
  </span>
);
