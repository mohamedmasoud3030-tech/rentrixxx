import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: 'primary' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
  compact?: boolean;
}

const accentMap = {
  primary: {
    bg: 'bg-primary/8',
    icon: 'bg-primary text-primary-foreground',
    trend_up: 'text-emerald-600 dark:text-emerald-400',
    trend_down: 'text-rose-600 dark:text-rose-400',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: 'bg-emerald-500 text-white',
    trend_up: 'text-emerald-600 dark:text-emerald-400',
    trend_down: 'text-rose-600 dark:text-rose-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: 'bg-amber-500 text-white',
    trend_up: 'text-emerald-600 dark:text-emerald-400',
    trend_down: 'text-rose-600 dark:text-rose-400',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    icon: 'bg-rose-500 text-white',
    trend_up: 'text-emerald-600 dark:text-emerald-400',
    trend_down: 'text-rose-600 dark:text-rose-400',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    icon: 'bg-violet-500 text-white',
    trend_up: 'text-emerald-600 dark:text-emerald-400',
    trend_down: 'text-rose-600 dark:text-rose-400',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    icon: 'bg-sky-500 text-white',
    trend_up: 'text-emerald-600 dark:text-emerald-400',
    trend_down: 'text-rose-600 dark:text-rose-400',
  },
};

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  trendValue,
  accent = 'primary',
  compact = false,
}: KpiCardProps) {
  const colors = accentMap[accent];

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card p-4 transition-all',
        'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn('grid size-9 shrink-0 place-items-center rounded-xl', compact && 'size-8', colors.icon)}>
          <Icon className={cn('size-4', compact && 'size-3.5')} />
        </div>
        {trend && trendValue && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold',
              trend === 'up' && `${colors.trend_up} bg-emerald-100 dark:bg-emerald-900/40`,
              trend === 'down' && `${colors.trend_down} bg-rose-100 dark:bg-rose-900/40`,
              trend === 'neutral' && 'text-muted-foreground bg-muted',
            )}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'} {trendValue}
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className={cn('font-black tabular-nums leading-none', compact ? 'text-xl' : 'text-2xl')}>{value}</p>
        <p className={cn('mt-1 font-semibold text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}
