import { Calendar, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractCardProps {
  id: string;
  contractNumber?: string | null;
  tenantName: string;
  location: string;
  endDate: string;
  daysRemaining: number;
  monthlyRent: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DRAFT' | string;
  onClick?: () => void;
  formatMoney?: (v: number) => string;
  formatDate?: (v: string) => string;
}

const statusMap: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE:      { label: 'نشط',     bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300' },
  EXPIRED:     { label: 'منتهي',   bg: 'bg-rose-100 dark:bg-rose-950/50',       text: 'text-rose-700 dark:text-rose-300' },
  TERMINATED:  { label: 'مُنهى',   bg: 'bg-slate-100 dark:bg-slate-800',        text: 'text-slate-600 dark:text-slate-300' },
  DRAFT:       { label: 'مسودة',   bg: 'bg-amber-100 dark:bg-amber-950/50',     text: 'text-amber-700 dark:text-amber-300' },
};

export function ContractCard({
  contractNumber,
  tenantName,
  location,
  endDate,
  daysRemaining,
  monthlyRent,
  status,
  onClick,
  formatMoney,
  formatDate,
}: ContractCardProps) {
  const s = statusMap[status] ?? statusMap['DRAFT']!;
  const urgency = daysRemaining <= 7 ? 'rose' : daysRemaining <= 30 ? 'amber' : 'emerald';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border border-border/60 bg-card p-4 text-start',
        'hover:shadow-md hover:border-primary/30 active:scale-[0.98]',
        'transition-all duration-150',
        daysRemaining <= 7 && status === 'ACTIVE' && 'border-rose-300 dark:border-rose-800',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10">
            <User className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-snug truncate">{tenantName}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{location}</p>
          </div>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', s.bg, s.text)}>
          {s.label}
        </span>
      </div>

      {/* Stats */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 gap-3">
        {/* End date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span>{formatDate ? formatDate(endDate) : endDate}</span>
        </div>

        {/* Days remaining */}
        {status === 'ACTIVE' && (
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
            urgency === 'rose'   && 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
            urgency === 'amber'  && 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
            urgency === 'emerald' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
          )}>
            <Clock className="size-3" />
            {daysRemaining <= 0 ? 'انتهى' : `${daysRemaining} يوم`}
          </div>
        )}

        {/* Rent */}
        <p className="font-black text-sm text-primary">
          {formatMoney ? formatMoney(monthlyRent) : monthlyRent}
        </p>
      </div>

      {contractNumber && (
        <p className="mt-1.5 text-[10px] text-muted-foreground/60">عقد #{contractNumber}</p>
      )}
    </button>
  );
}
