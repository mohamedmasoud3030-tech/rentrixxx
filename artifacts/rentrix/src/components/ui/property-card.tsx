import { Building2, DoorOpen, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  id: string;
  title: string;
  address?: string | null;
  unitCount?: number;
  occupiedUnits?: number;
  monthlyRent?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'sold' | string;
  onClick?: () => void;
  formatMoney?: (v: number) => string;
}

const statusStyles: Record<string, { dot: string; label: string; bg: string }> = {
  active:       { dot: 'bg-emerald-500', label: 'نشط',      bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  inactive:     { dot: 'bg-slate-400',   label: 'غير نشط',  bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  maintenance:  { dot: 'bg-amber-500',   label: 'صيانة',    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  sold:         { dot: 'bg-sky-500',     label: 'مباع',     bg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
};

export function PropertyCard({
  title,
  address,
  unitCount = 0,
  occupiedUnits = 0,
  monthlyRent,
  status,
  onClick,
  formatMoney,
}: PropertyCardProps) {
  const s = statusStyles[status] ?? statusStyles['inactive']!;
  const occupancyRate = unitCount > 0 ? Math.round((occupiedUnits / unitCount) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border border-border/60 bg-card p-4 text-start',
        'hover:shadow-md hover:border-primary/30 active:scale-[0.98]',
        'transition-all duration-150',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10">
          <Building2 className="size-5 text-primary" />
        </div>

        {/* Status badge */}
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5', s.bg)}>
          <span className={cn('size-1.5 rounded-full', s.dot)} />
          {s.label}
        </span>
      </div>

      {/* Title & address */}
      <div className="mt-3">
        <p className="font-bold text-base leading-snug">{title}</p>
        {address && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{address}</p>}
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4 border-t border-border/40 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DoorOpen className="size-3.5" />
          <span className="font-semibold text-foreground">{occupiedUnits}/{unitCount}</span>
          <span>وحدة</span>
        </div>

        {unitCount > 0 && (
          <div className="flex-1">
            {/* Occupancy bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  occupancyRate >= 80 ? 'bg-emerald-500' :
                  occupancyRate >= 50 ? 'bg-amber-500' : 'bg-rose-500',
                )}
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{occupancyRate}% إشغال</p>
          </div>
        )}

        {monthlyRent != null && formatMoney && (
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="size-3 text-emerald-500" />
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(monthlyRent)}</span>
          </div>
        )}
      </div>
    </button>
  );
}
