import { Home, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CompanySettingsContract } from '@/lib/companySettings';
import type { DashboardSnapshot } from '../dashboardSnapshot';
import { formatCompanyDate, formatCompanyMoney } from '@/lib/companyFormatters';

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير 🌤';
  if (h < 17) return 'مساء الخير ☀️';
  return 'مساء النور 🌙';
}

interface HeroBannerProps {
  snapshot: DashboardSnapshot | undefined;
  isLoading: boolean;
  settings: CompanySettingsContract;
  today: string;
}

export function HeroBanner({ snapshot, isLoading, settings, today }: HeroBannerProps) {
  const activeContracts = snapshot?.operational.activeContracts ?? 0;
  const vacantUnits = snapshot?.operational.vacantUnits ?? 0;
  const collected = snapshot?.financial.collectedRent ?? 0;
  const netPosition = snapshot?.financial.netPosition ?? 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 text-white">
      <div className="pointer-events-none absolute -left-8 -top-8 size-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-4 size-32 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400">{getGreeting()}</p>
            <h1 className="mt-0.5 text-xl font-black">لوحة التحكم</h1>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-300 backdrop-blur-sm">
            {formatCompanyDate(settings, `${snapshot?.period.dateTo ?? today}T00:00:00`)}
          </div>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <div>
            {isLoading
              ? <Skeleton className="h-10 w-24 bg-white/10" />
              : <p className="text-4xl font-black tabular-nums">{activeContracts}</p>}
            <p className="text-sm font-semibold text-slate-400">عقد نشط</p>
          </div>
          <div className="mb-1 ms-4 h-10 w-px bg-white/20" />
          <div>
            {isLoading
              ? <Skeleton className="h-6 w-20 bg-white/10" />
              : <p className="text-lg font-black" dir="ltr">{formatCompanyMoney(settings, collected)}</p>}
            <p className="text-xs font-semibold text-slate-400">محصّل هذا الشهر</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
            vacantUnits > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300',
          )}>
            <Home className="size-3" />
            {vacantUnits > 0 ? `${vacantUnits} وحدة شاغرة` : 'لا شواغر'}
          </div>
          <div className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
            netPosition >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300',
          )}>
            <TrendingUp className="size-3" />
            محصل بعد المصروفات {formatCompanyMoney(settings, netPosition)}
          </div>
        </div>
      </div>
    </div>
  );
}
