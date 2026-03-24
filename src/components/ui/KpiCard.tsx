import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  label?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: { value: number; label: string };
}

const colorMap = {
  primary: { iconBg: 'hsl(var(--color-primary) / 0.12)', iconColor: 'hsl(var(--color-primary))', accent: 'hsl(var(--color-primary))' },
  success: { iconBg: 'var(--color-success-bg)', iconColor: 'var(--color-success-text)', accent: 'hsl(var(--color-success-text))' },
  warning: { iconBg: 'var(--color-warning-bg)', iconColor: 'var(--color-warning-text)', accent: 'hsl(var(--color-warning-text))' },
  danger: { iconBg: 'var(--color-danger-bg)', iconColor: 'var(--color-danger-text)', accent: 'hsl(var(--color-danger-text))' },
  info: { iconBg: 'var(--color-info-bg)', iconColor: 'var(--color-info-text)', accent: 'hsl(var(--color-info-text))' },
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, label, icon, color = 'primary', trend }) => {
  const colors = colorMap[color];

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 group transition-all duration-250"
      style={{ boxShadow: 'var(--shadow-card)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; (e.currentTarget as HTMLElement).style.transform = ''; }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-text-muted leading-snug">{title}</p>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: colors.iconBg, color: colors.iconColor }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p
          className="text-2xl font-black leading-none"
          style={{ color: colors.accent }}
        >
          {value}
        </p>
        {label && <p className="text-xs text-text-muted mb-0.5">{label}</p>}
      </div>
      {trend && (
        <div className={`mt-2 text-xs font-bold flex items-center gap-1 ${trend.value >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
          <span>{trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}%</span>
          <span className="text-text-muted font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default KpiCard;
