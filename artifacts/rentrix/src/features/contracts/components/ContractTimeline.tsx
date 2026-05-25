import { CalendarDays, WalletCards } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CompanySettingsContract } from '@/lib/companySettings';
import {
  formatContractDate,
  formatContractDateTime,
  formatContractDayCount,
  formatContractMoney,
  getContractInclusiveDays,
  getContractRemainingDays,
} from '@lib/format';
import { contractStatusLabels, contractStatusTone, paymentCycleLabels } from '../contractSchema';
import type { ContractDetail } from '../services/contractService';

type TimelineTone = 'blue' | 'green' | 'red' | 'gray' | 'gold';
type TimelineItem = Readonly<{ title: string; value: string; description: string; tone: TimelineTone }>;

function getExpiryDescription(settings: CompanySettingsContract, contract: ContractDetail): string {
  if (contract.status === 'terminated') return 'تم إنهاء العقد ولا توجد مدة متبقية معروضة.';
  const remainingDays = getContractRemainingDays(contract.end_date);
  if (remainingDays < 0) return `انتهى منذ ${formatContractDayCount(settings, Math.abs(remainingDays))} يوم.`;
  if (remainingDays === 0) return 'ينتهي اليوم حسب تاريخ نهاية العقد.';
  return `باقي ${formatContractDayCount(settings, remainingDays)} يوم حتى تاريخ النهاية.`;
}

function getExpiryTone(contract: ContractDetail): TimelineTone {
  if (contract.status === 'terminated') return 'red';
  const remainingDays = getContractRemainingDays(contract.end_date);
  if (remainingDays < 0) return 'gray';
  return remainingDays <= 30 ? 'gold' : 'green';
}

export function getLifecycleTimeline(settings: CompanySettingsContract, contract: ContractDetail): TimelineItem[] {
  return [
    { title: 'إنشاء العقد', value: formatContractDateTime(settings, contract.created_at), description: 'وقت تسجيل العقد في النظام.', tone: 'blue' },
    { title: 'تاريخ البداية', value: formatContractDate(settings, contract.start_date), description: `بداية الالتزام التجاري لمدة ${formatContractDayCount(settings, getContractInclusiveDays(contract.start_date, contract.end_date))} يوم.`, tone: 'green' },
    { title: 'تاريخ النهاية', value: formatContractDate(settings, contract.end_date), description: getExpiryDescription(settings, contract), tone: getExpiryTone(contract) },
    { title: 'آخر تحديث', value: formatContractDateTime(settings, contract.updated_at), description: 'آخر تعديل محفوظ على بيانات العقد.', tone: 'gray' },
  ];
}

export function getFinancialTimeline(settings: CompanySettingsContract, contract: ContractDetail): TimelineItem[] {
  return [
    { title: 'قيمة الإيجار', value: formatContractMoney(settings, contract.rent_amount), description: `دورة السداد: ${paymentCycleLabels[contract.payment_cycle]}.`, tone: 'blue' },
    { title: 'الوحدة المؤجرة', value: contract.units?.unit_number ?? '—', description: contract.properties?.title ?? 'لم يتم ربط عقار ظاهر بالعقد.', tone: 'green' },
    { title: 'حالة العقد', value: contractStatusLabels[contract.status], description: getExpiryDescription(settings, contract), tone: contractStatusTone[contract.status] },
  ];
}

function TimelineCard({ item }: Readonly<{ item: TimelineItem }>) {
  return <div className="rounded-3xl border border-border bg-background p-5 shadow-sm"><StatusBadge tone={item.tone}>{item.title}</StatusBadge><p className="mt-4 text-2xl font-black tracking-tight">{item.value}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p></div>;
}

function TimelineRow({ item }: Readonly<{ item: TimelineItem }>) {
  return <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"><span className="mt-1 size-3 rounded-full bg-primary" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{item.title}</p><StatusBadge tone={item.tone}>{item.value}</StatusBadge></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p></div></div>;
}

export function ContractTimeline({ companySettings, contract }: Readonly<{ companySettings: CompanySettingsContract; contract: ContractDetail }>) {
  const lifecycleTimeline = getLifecycleTimeline(companySettings, contract);
  const financialTimeline = getFinancialTimeline(companySettings, contract);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/35"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><WalletCards className="size-5 text-primary" />الخط الزمني المالي</CardTitle><CardDescription>ملخص تجاري مشتق من بيانات العقد الحالية فقط دون إنشاء قيود أو إيصالات.</CardDescription></div><StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge></div></CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">{financialTimeline.map((item) => <TimelineCard item={item} key={item.title} />)}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" />الخط الزمني</CardTitle><CardDescription>تواريخ العقد الأساسية مع تنبيه واضح لقرب الانتهاء أو انتهاء العقد.</CardDescription></CardHeader>
        <CardContent className="space-y-3">{lifecycleTimeline.map((item) => <TimelineRow item={item} key={item.title} />)}</CardContent>
      </Card>
    </>
  );
}
