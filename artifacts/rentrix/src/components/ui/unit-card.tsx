import { DoorOpen, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const statusMap: Record<string, { label: string; bg: string; text: string }> = {
  available:   { label: 'متاحة',     bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300' },
  occupied:    { label: 'مشغولة',    bg: 'bg-blue-100 dark:bg-blue-950/50',       text: 'text-blue-700 dark:text-blue-300' },
  maintenance: { label: 'صيانة',    bg: 'bg-amber-100 dark:bg-amber-950/50',     text: 'text-amber-700 dark:text-amber-300' },
  reserved:    { label: 'محجوزة',    bg: 'bg-slate-100 dark:bg-slate-800',        text: 'text-slate-600 dark:text-slate-300' },
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
        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', s.bg, s.text)}>
          {s.label}
        </span>
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
