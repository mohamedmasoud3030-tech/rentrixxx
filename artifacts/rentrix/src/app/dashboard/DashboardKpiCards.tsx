import { AlertTriangle, Banknote, Building2, CalendarClock, Home, ReceiptText, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { formatCompanyMoney } from '@lib/format';
import { cn } from '@/lib/utils';
import type { DashboardSnapshot } from '../dashboardSnapshot';

export type KpiCard = {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone: string;
  isMoney?: boolean;
};

function formatDashboardMoney(settings: CompanySettingsContract, value: number | null | undefined) {
  return formatCompanyMoney(settings, value);
}

function createMoneyCard(params: Omit<KpiCard, 'value' | 'isMoney'> & { amount: number; settings: CompanySettingsContract; displayValue?: string }): KpiCard {
  return {
    title: params.title,
    value: params.displayValue ?? formatDashboardMoney(params.settings, params.amount),
    icon: params.icon,
    description: params.description,
    tone: params.tone,
    isMoney: true,
  };
}

export function buildDashboardSummaryCards(snapshot: DashboardSnapshot | undefined, settings: CompanySettingsContract, hasError = false): KpiCard[] {
  const financial = snapshot?.financial;
  const moneyOrUnavailable = (value: number | null | undefined) => (hasError ? 'غير متاح' : formatDashboardMoney(settings, value ?? 0));
  const operational = snapshot?.operational;

  return [
    createMoneyCard({ title: 'الإيجار المستحق', amount: financial?.rentDue ?? 0, icon: Banknote, description: 'إجمالي المفوتر خلال الفترة الحالية', tone: 'bg-sky-600', settings, displayValue: moneyOrUnavailable(financial?.rentDue) }),
    createMoneyCard({ title: 'المحصل هذا الشهر', amount: financial?.collectedRent ?? 0, icon: WalletCards, description: `${financial?.paymentsCount ?? 0} دفعات مسجلة`, tone: 'bg-emerald-600', settings, displayValue: moneyOrUnavailable(financial?.collectedRent) }),
    createMoneyCard({ title: 'الرصيد المتبقي', amount: financial?.outstandingRent ?? 0, icon: ReceiptText, description: `${financial?.invoicesCount ?? 0} فواتير في الفترة`, tone: 'bg-amber-600', settings, displayValue: moneyOrUnavailable(financial?.outstandingRent) }),
    createMoneyCard({ title: 'المصروفات', amount: financial?.expenses ?? 0, icon: AlertTriangle, description: `${financial?.expensesCount ?? 0} مصروفات مسجلة`, tone: 'bg-rose-600', settings, displayValue: moneyOrUnavailable(financial?.expenses) }),
    createMoneyCard({ title: 'صافي المركز', amount: financial?.netPosition ?? 0, icon: Building2, description: 'تحصيل الفترة ناقص المصروفات', tone: 'bg-indigo-600', settings, displayValue: moneyOrUnavailable(financial?.netPosition) }),
    { title: 'الإشغال', value: `${operational?.occupancyRate ?? 0}%`, icon: Home, description: `${operational?.occupiedUnits ?? 0} مشغولة / ${operational?.units ?? 0} وحدة`, tone: 'bg-cyan-600' },
    { title: 'تنتهي خلال 30 يوم', value: operational?.expiringContracts30Days ?? 0, icon: CalendarClock, description: 'عقود تحتاج متابعة', tone: 'bg-orange-600' },
  ];
}

export function DashboardKpiCards({ cards, isLoading }: Readonly<{ cards: KpiCard[]; isLoading: boolean }>) {
  return <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-7">{cards.map((card) => {
    const Icon = card.icon;
    return <Card key={card.title} className="overflow-hidden"><CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3"><div><CardTitle className="text-base">{card.title}</CardTitle><CardDescription>{card.description}</CardDescription></div><div className={cn('grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm', card.tone)}><Icon className="size-5" /></div></CardHeader><CardContent>{isLoading ? <Skeleton className="h-9 w-24" /> : <p className="text-3xl font-black" dir={card.isMoney ? 'ltr' : 'rtl'}>{card.value}</p>}</CardContent></Card>;
  })}</section>;
}
