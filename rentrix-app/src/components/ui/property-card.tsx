import { Building2, DoorOpen, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './status-badge';

interface PropertyCardProps {
  id: string;
  title: string;
  address?: string | null;
  /**
   * Total number of units attached to the property.
   * - `undefined` (not provided by the caller) means the list view does not
   *   have a safe source for this count, so we render a neutral label
   *   instead of a misleading "0/0" or developer-speak.
   * - `0` is an honest "we have data, the property has no units".
   */
  unitCount?: number;
  occupiedUnits?: number;
  monthlyRent?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'sold' | string;
  onClick?: () => void;
  formatMoney?: (v: number) => string;
}

const statusStyles: Record<string, { label: string; tone: 'blue' | 'green' | 'red' | 'gray' | 'gold' }> = {
  active:       { label: 'نشط',      tone: 'green' },
  inactive:     { label: 'غير نشط',  tone: 'gray' },
  maintenance:  { label: 'صيانة',    tone: 'gold' },
  sold:         { label: 'مباع',     tone: 'blue' },
};

// Public helper so other call sites can render the same neutral label
// without re-deriving the rule from props.
export function formatPropertyUnitSummary(unitCount: number | undefined, occupiedUnits: number | undefined): {
  text: string;
  hasCount: boolean;
} {
  if (unitCount === undefined) {
    return { text: 'تفاصيل الوحدات', hasCount: false };
  }
  if (unitCount === 0) {
    return { text: '0 وحدة', hasCount: true };
  }
  const occupied = occupiedUnits ?? 0;
  return { text: `${occupied}/${unitCount} وحدة`, hasCount: true };
}

export function PropertyCard({
  title,
  address,
  unitCount,
  occupiedUnits,
  monthlyRent,
  status,
  onClick,
  formatMoney,
}: PropertyCardProps) {
  const s = statusStyles[status] ?? statusStyles['inactive']!;
  const { text: unitsText, hasCount } = formatPropertyUnitSummary(unitCount, occupiedUnits);
  const occupancyRate = hasCount && unitCount! > 0 ? Math.round((occupiedUnits! / unitCount!) * 100) : 0;

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
        <StatusBadge tone={s.tone} dot>{s.label}</StatusBadge>
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
          <span className={cn('font-semibold', hasCount ? 'text-foreground' : 'text-muted-foreground')}>
            {unitsText}
          </span>
        </div>

        {hasCount && unitCount! > 0 && (
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
            <span className="font-bold text-emerald-600">{formatMoney(monthlyRent)}</span>
          </div>
        )}
      </div>
    </button>
  );
}
