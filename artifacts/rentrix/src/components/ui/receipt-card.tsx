import { CheckCircle2, Printer, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiptCardProps {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  context: string;
  invoiceId: string;
  status: string;
  onClick?: () => void;
  formatDate?: (v: string) => string;
  formatMoney?: (v: number) => string;
}

export function ReceiptCard({
  receiptNumber,
  paymentDate,
  amount,
  paymentMethod,
  context,
  invoiceId,
  status,
  onClick,
  formatDate,
  formatMoney,
}: ReceiptCardProps) {
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
            <Printer className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-snug">إيصال #{receiptNumber}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate ? formatDate(paymentDate) : paymentDate}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          منشور
        </span>
      </div>

      {/* Details row */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 gap-2">
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Wallet className="size-3.5 shrink-0" />
            <span>{paymentMethod}</span>
          </div>
          <div className="truncate">{context}</div>
          <div className="text-[10px] text-muted-foreground/70">ف#{invoiceId}</div>
        </div>
        <p className="font-black text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          {formatMoney ? formatMoney(amount) : amount}
        </p>
      </div>
    </button>
  );
}
