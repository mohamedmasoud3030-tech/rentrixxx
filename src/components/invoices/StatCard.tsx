import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

interface StatCardProps {
  title?: string;
  label?: string;
  value: number;
  subtitle?: string;
  icon?: React.ReactNode;
  color: 'amber' | 'rose' | 'emerald';
  currency?: string;
}

const colorClasses: Record<string, string> = {
  amber: 'text-amber-500 bg-surface-container-low border-outline-variant/50',
  rose: 'text-error bg-surface-container-low border-outline-variant/50',
  emerald: 'text-primary bg-surface-container-low border-outline-variant/50',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  label,
  value,
  subtitle,
  icon,
  color,
  currency = 'OMR',
}) => {
  const displayTitle = title ?? label ?? '';

  return (
    <div className={`p-4 rounded-2xl border ${colorClasses[color]} flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        {icon && <div className="p-3 bg-white/50 rounded-xl">{icon}</div>}
        <div>
          <p className="text-[10px] font-black opacity-70">{displayTitle}</p>
          <p className="text-xl font-black mono-data" dir="ltr">
            {formatCurrency(value, currency)}
          </p>
          {subtitle && <p className="text-[11px] font-semibold opacity-75 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="opacity-10">
        <ArrowUpRight size={40} />
      </div>
    </div>
  );
};
