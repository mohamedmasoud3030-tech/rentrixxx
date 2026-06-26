import { Link } from '@tanstack/react-router';
import { AlertTriangle, BarChart3, FileText, ReceiptText, WalletCards } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = [
  { label: 'إنشاء عقد',  to: '/contracts/new', icon: FileText,     accent: 'bg-primary/10 text-primary' },
  { label: 'الفواتير',   to: '/invoices',       icon: ReceiptText,  accent: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  { label: 'المتأخرات',  to: '/arrears',        icon: AlertTriangle, accent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  { label: 'المالية',    to: '/financials',     icon: WalletCards,  accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { label: 'التقارير',   to: '/reports',        icon: BarChart3,    accent: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
] as const;

export function QuickActions() {
  return (
    <div>
      <SectionHeader title="إجراءات سريعة" />
      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.to} to={action.to} className="shrink-0">
              <div className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-2xl p-4 min-h-[56px] min-w-[56px] transition-all',
                'hover:scale-105 active:scale-95 border border-border/50',
                action.accent,
              )}>
                <Icon className="size-6" />
                <span className="text-[11px] font-bold text-center leading-tight whitespace-nowrap">{action.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
