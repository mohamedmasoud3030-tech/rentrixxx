import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CalendarDays, Edit, FileText, LockKeyhole, RefreshCw, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, formatMoney } from '@/lib/formatters';
import { contractStatusLabels, paymentCycleLabels, renewalSchema, type RenewalPayload } from './contractSchema';
import type { ContractDetail } from './services/contractService';
import { useContract, useRenewContract } from './useContracts';

const statusTone = { draft: 'gray', active: 'blue', expired: 'green', terminated: 'red' } as const;
const DAY_IN_MS = 86_400_000;
const arabicDateFormatter = new Intl.DateTimeFormat('ar', { dateStyle: 'medium' });
const arabicDateTimeFormatter = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' });

const contractDocumentSlots = [
  {
    title: 'نسخة العقد الموقعة',
    description: 'مساحة قراءة مخصصة لعرض مرجع النسخة الموقعة عند توفر خدمة مستندات عقدية لاحقًا.',
  },
  {
    title: 'هوية المستأجر',
    description: 'موضع تعريفي فقط لملف إثبات هوية المستأجر دون رفع أو تخزين جديد.',
  },
  {
    title: 'ملاحق العقد',
    description: 'غلاف جاهز لإظهار ملاحق العقد المرتبطة به مستقبلًا بدون توليد PDF أو ترحيل بيانات.',
  },
] as const;

type TimelineTone = 'blue' | 'green' | 'red' | 'gray' | 'gold';
type TimelineItem = Readonly<{
  title: string;
  value: string;
  description: string;
  tone: TimelineTone;
}>;

function money(value: number) {
  return formatMoney({ amount: value, currency: DEFAULT_CURRENCY, locale: DEFAULT_LOCALE });
}

function fieldError(message?: string) {
  return message ? <span className="text-xs font-bold text-destructive">{message}</span> : null;
}

function getContractDetailErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل العقد.';
}

function formatDate(value: string): string {
  return arabicDateFormatter.format(new Date(value));
}

function formatDateTime(value: string): string {
  return arabicDateTimeFormatter.format(new Date(value));
}

function getInclusiveDays(startDate: string, endDate: string): number {
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  return Math.max(1, Math.round((endTime - startTime) / DAY_IN_MS) + 1);
}

function getRemainingDays(endDate: string): number {
  const today = new Date();
  const endTime = new Date(endDate).getTime();
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.ceil((endTime - todayTime) / DAY_IN_MS);
}

function getExpiryDescription(contract: ContractDetail): string {
  if (contract.status === 'terminated') {
    return 'تم إنهاء العقد ولا توجد مدة متبقية معروضة.';
  }

  const remainingDays = getRemainingDays(contract.end_date);
  if (remainingDays < 0) {
    return `انتهى منذ ${Math.abs(remainingDays).toLocaleString('ar')} يوم.`;
  }

  if (remainingDays === 0) {
    return 'ينتهي اليوم حسب تاريخ نهاية العقد.';
  }

  return `باقي ${remainingDays.toLocaleString('ar')} يوم حتى تاريخ النهاية.`;
}

function getExpiryTone(contract: ContractDetail): TimelineTone {
  if (contract.status === 'terminated') {
    return 'red';
  }

  const remainingDays = getRemainingDays(contract.end_date);
  if (remainingDays < 0) {
    return 'gray';
  }

  return remainingDays <= 30 ? 'gold' : 'green';
}

function getLifecycleTimeline(contract: ContractDetail): TimelineItem[] {
  return [
    {
      title: 'إنشاء العقد',
      value: formatDateTime(contract.created_at),
      description: 'وقت تسجيل العقد في النظام.',
      tone: 'blue',
    },
    {
      title: 'تاريخ البداية',
      value: formatDate(contract.start_date),
      description: `بداية الالتزام التجاري لمدة ${getInclusiveDays(contract.start_date, contract.end_date).toLocaleString('ar')} يوم.`,
      tone: 'green',
    },
    {
      title: 'تاريخ النهاية',
      value: formatDate(contract.end_date),
      description: getExpiryDescription(contract),
      tone: getExpiryTone(contract),
    },
    {
      title: 'آخر تحديث',
      value: formatDateTime(contract.updated_at),
      description: 'آخر تعديل محفوظ على بيانات العقد.',
      tone: 'gray',
    },
  ];
}

function getFinancialTimeline(contract: ContractDetail): TimelineItem[] {
  return [
    {
      title: 'قيمة الإيجار',
      value: money(contract.rent_amount),
      description: `دورة السداد: ${paymentCycleLabels[contract.payment_cycle]}.`,
      tone: 'blue',
    },
    {
      title: 'الوحدة المؤجرة',
      value: contract.units?.unit_number ?? '—',
      description: contract.properties?.title ?? 'لم يتم ربط عقار ظاهر بالعقد.',
      tone: 'green',
    },
    {
      title: 'حالة العقد',
      value: contractStatusLabels[contract.status],
      description: getExpiryDescription(contract),
      tone: statusTone[contract.status],
    },
  ];
}

export function ContractDetailPage() {
  const { contractId } = useParams({ strict: false }) as { contractId: string };
  const navigate = useNavigate();
  const contractQuery = useContract(contractId);
  const renewMutation = useRenewContract(contractId);
  const [open, setOpen] = useState(false);
  const form = useForm<RenewalPayload>({ resolver: zodResolver(renewalSchema), defaultValues: { new_start: '', new_end: '', new_amount: 0 } });

  const retryContractDetail = async () => {
    await contractQuery.refetch();
  };

  const submitRenewal = async (values: RenewalPayload) => {
    const newId = await renewMutation.mutateAsync(values);
    setOpen(false);
    await navigate({ to: '/contracts/$contractId', params: { contractId: newId } });
  };

  if (contractQuery.isLoading) {
    return <RouteLoadingState />;
  }

  if (contractQuery.isError) {
    return (
      <EmptyState
        title="تعذر تحميل العقد"
        description={getContractDetailErrorMessage(contractQuery.error)}
        action={<Button type="button" onClick={retryContractDetail}>إعادة المحاولة</Button>}
      />
    );
  }

  if (!contractQuery.data) {
    return <EmptyState title="العقد غير موجود" description="ربما تم حذف العقد أو لا تملك صلاحية الوصول إليه." />;
  }

  const contract = contractQuery.data;
  const lifecycleTimeline = getLifecycleTimeline(contract);
  const financialTimeline = getFinancialTimeline(contract);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-black text-primary">العقد رقم #{contract.id.slice(0, 8)}</p>
          <h2 className="text-3xl font-black">تفاصيل العقد</h2>
          <p className="text-sm text-muted-foreground">عرض كامل للعقد وسجل مراحله.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild><Link to="/contracts"><ArrowRight className="ml-2 size-4" />العودة</Link></Button>
          <Button variant="secondary" onClick={() => setOpen(true)}><RefreshCw className="ml-2 size-4" />تجديد</Button>
          <Button asChild><Link to="/contracts/$contractId/edit" params={{ contractId }}><Edit className="ml-2 size-4" />تعديل</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات العقد</CardTitle>
          <CardDescription>الحقول الأساسية وربط العقار والوحدة والمستأجر.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="العقد رقم" value={`#${contract.id.slice(0, 8)}`} />
          <Info label="المستأجر" value={contract.people?.full_name ?? '—'} />
          <Info label="الوحدة" value={contract.units?.unit_number ?? '—'} />
          <Info label="العقار" value={contract.properties?.title ?? '—'} />
          <Info label="تاريخ البداية" value={formatDate(contract.start_date)} />
          <Info label="تاريخ النهاية" value={formatDate(contract.end_date)} />
          <Info label="قيمة الإيجار" value={money(contract.rent_amount)} />
          <Info label="دورة السداد" value={paymentCycleLabels[contract.payment_cycle]} />
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold text-muted-foreground">الحالة</p>
            <div className="mt-2"><StatusBadge tone={statusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge></div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4 md:col-span-2">
            <p className="text-xs font-bold text-muted-foreground">ملاحظات</p>
            <p className="mt-1 leading-7">{contract.notes ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <ContractDocumentsShell contract={contract} />

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/35">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><WalletCards className="size-5 text-primary" />الخط الزمني المالي</CardTitle>
              <CardDescription>ملخص تجاري مشتق من بيانات العقد الحالية فقط دون إنشاء قيود أو إيصالات.</CardDescription>
            </div>
            <StatusBadge tone={statusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          {financialTimeline.map((item) => <TimelineCard item={item} key={item.title} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" />الخط الزمني</CardTitle>
          <CardDescription>تواريخ العقد الأساسية مع تنبيه واضح لقرب الانتهاء أو انتهاء العقد.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lifecycleTimeline.map((item) => <TimelineRow item={item} key={item.title} />)}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تجديد العقد</DialogTitle>
            <DialogDescription>سيتم إنشاء عقد جديد مرتبط بالعقد الحالي عبر RPC آمن.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={form.handleSubmit(submitRenewal)}>
            <label className="grid gap-2 text-sm font-bold">
              تاريخ البداية
              <Input type="date" {...form.register('new_start')} />
              {fieldError(form.formState.errors.new_start?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              تاريخ النهاية
              <Input type="date" {...form.register('new_end')} />
              {fieldError(form.formState.errors.new_end?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              قيمة الإيجار
              <Input type="number" step="0.01" min="0" {...form.register('new_amount')} />
              {fieldError(form.formState.errors.new_amount?.message)}
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={renewMutation.isPending}>تجديد العقد</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractDocumentsShell({ contract }: Readonly<{ contract: ContractDetail }>) {
  const documentReference = `#${contract.id.slice(0, 8)}`;

  return (
    <Card className="overflow-hidden border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="bg-background/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" />تبويب مستندات العقد</CardTitle>
            <CardDescription>
              غلاف عقدي للقراءة فقط يوضح مكان ملفات العقد دون رفع ملفات أو توليد PDF أو إضافة جداول جديدة.
            </CardDescription>
          </div>
          <StatusBadge tone="gray"><LockKeyhole className="ml-1 size-3" />قراءة فقط</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          {contractDocumentSlots.map((slot) => (
            <DocumentSlotCard description={slot.description} key={slot.title} reference={documentReference} title={slot.title} />
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-7 text-muted-foreground">
          هذا التبويب مرتبط بالعقد الحالي فقط: {documentReference}. لا توجد إجراءات رفع، حذف، طباعة، أو إنشاء إيصالات ضمن هذا النطاق.
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentSlotCard({ description, reference, title }: Readonly<{ description: string; reference: string; title: string }>) {
  return (
    <div className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary"><FileText className="size-5" /></div>
        <StatusBadge tone="gray">غير متصل</StatusBadge>
      </div>
      <p className="mt-4 font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2 text-xs font-bold text-muted-foreground">مرجع العقد: {reference}</p>
    </div>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function TimelineCard({ item }: Readonly<{ item: TimelineItem }>) {
  return (
    <div className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <StatusBadge tone={item.tone}>{item.title}</StatusBadge>
      <p className="mt-4 text-2xl font-black tracking-tight">{item.value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
    </div>
  );
}

function TimelineRow({ item }: Readonly<{ item: TimelineItem }>) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
      <span className="mt-1 size-3 rounded-full bg-primary" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-black">{item.title}</p>
          <StatusBadge tone={item.tone}>{item.value}</StatusBadge>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
      </div>
    </div>
  );
}
