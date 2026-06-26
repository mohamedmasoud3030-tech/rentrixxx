import { DoorOpen, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './status-badge';

interface UnitCardProps {
  id: string;
  unitNumber: string;
  floor?: string | null;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | string;
  rentAmount?: number | null;
  notes?: string | null;
  onClick?: () => void;
  formatMoney?: (v: number) => string;
}

const statusMap: Record<string, { label: string; tone: 'blue' | 'green' | 'red' | 'gray' | 'gold' }> = {
  available:   { label: 'متاحة',  tone: 'green' },
  occupied:    { label: 'مشغولة', tone: 'blue' },
  maintenance: { label: 'صيانة',  tone: 'gold' },
  reserved:    { label: 'محجوزة', tone: 'gray' },
};

export function UnitCard({
  unitNumber,
  floor,
  status,
  rentAmount,
  notes,
  onClick,
  formatMoney,
}: UnitCardProps) {
  const s = statusMap[status] ?? statusMap['available']!;

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
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10">
            <DoorOpen className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-snug">وحدة {unitNumber}</p>
            {floor && <p className="text-[11px] text-muted-foreground mt-0.5">الدور: {floor}</p>}
          </div>
        </div>
        <StatusBadge tone={s.tone} className="shrink-0">{s.label}</StatusBadge>
      </div>

      {/* Details row */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 gap-3">
        {notes && (
          <p className="text-xs text-muted-foreground leading-relaxed flex-1">{notes}</p>
        )}
        {rentAmount != null && formatMoney && (
          <p className="font-black text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            {formatMoney(rentAmount)}
          </p>
        )}
      </div>
    </button>
  );
}
