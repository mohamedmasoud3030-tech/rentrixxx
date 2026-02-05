
import React from 'react';
import Card from './Card';

interface KpiCardProps {
  title: string;
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, label, icon }) => {
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </Card>
  );
};

export default KpiCard;
