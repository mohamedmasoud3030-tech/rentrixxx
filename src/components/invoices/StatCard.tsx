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
  amber: 'text-amber-600 bg-amber-50 border-amber-100',
  rose: 'text-rose-600 bg-rose-50 border-rose-100',
  emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
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
          <p className="text-xl font-black" dir="ltr">
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
