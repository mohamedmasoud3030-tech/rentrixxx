import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CalendarDays, Edit, RefreshCw, ShieldAlert, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmptyState } from '@/components/empty-state';
import { exportContractToPdf } from '@/services/pdfService';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { useCompanySettingsContract } from '../settings/useCompanySettings';
import type { Person, Property, Unit } from '@/types/domain';
import {
  formatContractDate,
  formatContractDateTime,
  formatContractDayCount,
  formatContractMoney,
  getContractInclusiveDays,
  getContractRemainingDays,
} from '@lib/format';
import { contractStatusLabels, contractStatusTone, paymentCycleLabels, renewalSchema, type RenewalPayload } from './contractSchema';
import { ContractDocumentsShell } from './contractDocumentsShell';
import { ContractPaymentsTab } from './contractPaymentsTab';
import type { ContractDetail } from './services/contractService';
import { useContract, useRenewContract } from './useContracts';

type TimelineTone = 'blue' | 'green' | 'red' | 'gray' | 'gold';
type TimelineItem = Readonly<{
  title: string;
  value: string;
  description: string;
  tone: TimelineTone;
}>;

function fieldError(message?: string) {
  return message ? <span className="text-xs font-bold text-destructive">{message}</span> : null;
}

function getContractDetailErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل العقد.';
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): Date {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function addYear(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + 1);
  nextDate.setDate(nextDate.getDate() - 1);
  return nextDate;
}

function getRenewalDefaults(contract: ContractDetail): RenewalPayload {
  const nextStart = addDays(contract.end_date, 1);
  return {
    new_start: toDateInputValue(nextStart),
    new_end: toDateInputValue(addYear(nextStart)),
    new_amount: contract.rent_amount,
  };
}

function canRenewContract(contract: ContractDetail): boolean {
  return contract.status === 'active' || contract.status === 'expired';
}

const toPdfTenant = (person: ContractDetail['people']): Person | null =>
  person
    ? {
        ...person,
        type: 'tenant',
        address: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }
    : null;

const toPdfUnit = (unit: ContractDetail['units'], propertyId: string): Unit | null =>
  unit
    ? {
        ...unit,
        property_id: propertyId,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }
    : null;

const toPdfProperty = (property: ContractDetail['properties']): Property | null =>
  property
    ? {
        ...property,
        type: 'residential',
        owner_name: null,
        purchase_value: null,
        current_value: null,
        status: 'active',
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }
    : null;

function getExpiryDescription(settings: CompanySettingsContract, contract: ContractDetail): string {
  if (contract.status === 'terminated') {
    return 'تم إنهاء العقد ولا توجد مدة متبقية معروضة.';
  }

  const remainingDays = getContractRemainingDays(contract.end_date);
  if (remainingDays < 0) {
    return `انتهى منذ ${formatContractDayCount(settings, Math.abs(remainingDays))} يوم.`;
  }

  if (remainingDays === 0) {
    return 'ينتهي اليوم حسب تاريخ نهاية العقد.';
  }

  return `باقي ${formatContractDayCount(settings, remainingDays)} يوم حتى تاريخ النهاية.`;
}

function getExpiryTone(contract: ContractDetail): TimelineTone {
  if (contract.status === 'terminated') {
    return 'red';
  }

  const remainingDays = getContractRemainingDays(contract.end_date);
  if (remainingDays < 0) {
    return 'gray';
  }

  return remainingDays <= 30 ? 'gold' : 'green';
}

function getLifecycleTimeline(settings: CompanySettingsContract, contract: ContractDetail): TimelineItem[] {
  return [
    {
      title: 'إنشاء العقد',
      value: formatContractDateTime(settings, contract.created_at),
      description: 'وقت تسجيل العقد في النظام.',
      tone: 'blue',
    },
    {
      title: 'تاريخ البداية',
      value: formatContractDate(settings, contract.start_date),
      description: `بداية الالتزام التجاري لمدة ${formatContractDayCount(settings, getContractInclusiveDays(contract.start_date, contract.end_date))} يوم.`,
      tone: 'green',
    },
    {
      title: 'تاريخ النهاية',
      value: formatContractDate(settings, contract.end_date),
      description: getExpiryDescription(settings, contract),
      tone: getExpiryTone(contract),
    },
    {
      title: 'آخر تحديث',
      value: formatContractDateTime(settings, contract.updated_at),
      description: 'آخر تعديل محفوظ على بيانات العقد.',
      tone: 'gray',
    },
  ];
}

function getFinancialTimeline(settings: CompanySettingsContract, contract: ContractDetail): TimelineItem[] {
  return [
    {
      title: 'قيمة الإيجار',
      value: formatContractMoney(settings, contract.rent_amount),
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
      description: getExpiryDescription(settings, contract),
      tone: contractStatusTone[contract.status],
    },
  ];
}

export function ContractDetailPage() {
  const { contractId } = useParams({ strict: false }) as { contractId: string };
  const navigate = useNavigate();
  const contractQuery = useContract(contractId);
  const companySettings = useCompanySettingsContract();
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

  const openRenewalDialog = (contract: ContractDetail) => {
    form.reset(getRenewalDefaults(contract));
    setOpen(true);
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
  const lifecycleTimeline = getLifecycleTimeline(companySettings, contract);
  const financialTimeline = getFinancialTimeline(companySettings, contract);
  const renewalAllowed = canRenewContract(contract);
  const cancellationReason = contract.cancellation_reason?.trim() || '—';

  const exportContractPdf = () => {
    const tenant = toPdfTenant(contract.people);
    const unit = toPdfUnit(contract.units, contract.property_id);
    const property = toPdfProperty(contract.properties);
    exportContractToPdf(contract, {
      settings: { general: { company: { name: 'Rentrix' } } },
      contracts: [contract],
      tenants: tenant ? [tenant] : [],
      units: unit ? [unit] : [],
      properties: property ? [property] : [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-black text-primary">العقد رقم #{contract.id.slice(0, 8)}</p>
          <h2 className="text-3xl font-black">تفاصيل العقد</h2>
          <p className="text-sm text-muted-foreground">عرض كامل للعقد وسجل مراحله.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild><Link to="/contracts"><ArrowRight className="me-2 size-4" />العودة</Link></Button>
          <Button variant="secondary" onClick={() => openRenewalDialog(contract)} disabled={!renewalAllowed}><RefreshCw className="me-2 size-4" />تجديد</Button>
          <Button variant="secondary" onClick={exportContractPdf}>تصدير PDF</Button>
          <Button asChild><Link to="/contracts/$contractId/edit" params={{ contractId }}><Edit className="me-2 size-4" />تعديل</Link></Button>
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
          <Info label="تاريخ البداية" value={formatContractDate(companySettings, contract.start_date)} />
          <Info label="تاريخ النهاية" value={formatContractDate(companySettings, contract.end_date)} />
          <Info label="قيمة الإيجار" value={formatContractMoney(companySettings, contract.rent_amount)} />
          <Info label="دورة السداد" value={paymentCycleLabels[contract.payment_cycle]} />
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold text-muted-foreground">الحالة</p>
            <div className="mt-2"><StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge></div>
          </div>
          <Info label="سبب الإلغاء" value={contract.status === 'terminated' ? cancellationReason : 'غير مطبق'} />
          <div className="rounded-2xl border border-border bg-background p-4 md:col-span-2">
            <p className="text-xs font-bold text-muted-foreground">ملاحظات</p>
            <p className="mt-1 leading-7">{contract.notes ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <LifecycleActionsCard contract={contract} companySettings={companySettings} renewalAllowed={renewalAllowed} onRenew={() => openRenewalDialog(contract)} />

      <ContractDocumentsShell contractId={contract.id} />

      <ContractPaymentsTab contractId={contract.id} />

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/35">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><WalletCards className="size-5 text-primary" />الخط الزمني المالي</CardTitle>
              <CardDescription>ملخص تجاري مشتق من بيانات العقد الحالية فقط دون إنشاء قيود أو إيصالات.</CardDescription>
            </div>
            <StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
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
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={renewMutation.isPending}>تجديد العقد</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LifecycleActionsCard({ contract, companySettings, renewalAllowed, onRenew }: Readonly<{ contract: ContractDetail; companySettings: CompanySettingsContract; renewalAllowed: boolean; onRenew: () => void }>) {
  const previousContract = contract.renewed_from;
  const cancellationReason = contract.cancellation_reason?.trim();

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary/5">
      <CardHeader className="bg-background/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><RefreshCw className="size-5 text-primary" />إجراءات التجديد والإنهاء</CardTitle>
            <CardDescription>توضيح دورة حياة العقد اعتمادًا على خدمات وحقول Phase 2 الموجودة فقط.</CardDescription>
          </div>
          <StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="font-black">تجديد العقد</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {renewalAllowed ? 'سيتم اقتراح بداية اليوم التالي لتاريخ نهاية العقد مع نفس قيمة الإيجار قبل إنشاء العقد الجديد.' : 'التجديد متاح للعقود النشطة أو المنتهية فقط حفاظًا على وضوح الحالة.'}
          </p>
          <Button className="mt-4" variant="secondary" onClick={onRenew} disabled={!renewalAllowed}>
            <RefreshCw className="me-2 size-4" />فتح نموذج التجديد
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="flex items-center gap-2 font-black"><ShieldAlert className="size-4 text-amber-600" />إنهاء العقد</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            يدعم النموذج الحالي تغيير الحالة إلى ملغي وتسجيل سبب الإلغاء فقط. لم تتم إضافة إجراء إنهاء مستقل لأنه يحتاج خدمة ذرية واضحة لتحديث العقد والوحدة معًا دون مخطط أو RPC جديد.
          </p>
          <Button className="mt-4" variant="secondary" asChild>
            <Link to="/contracts/$contractId/edit" params={{ contractId: contract.id }}>تعديل الحالة وسبب الإلغاء</Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="font-black">سلسلة التجديد</p>
          {previousContract ? (
            <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
              <p>هذا العقد مجدد من عقد سابق.</p>
              <p>الفترة السابقة: {formatContractDate(companySettings, previousContract.start_date)} ← {formatContractDate(companySettings, previousContract.end_date)}</p>
              <StatusBadge tone={contractStatusTone[previousContract.status]}>{contractStatusLabels[previousContract.status]}</StatusBadge>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">لا يوجد عقد سابق مرتبط بهذا العقد عبر حقل التجديد الحالي.</p>
          )}
          {cancellationReason ? <p className="mt-3 rounded-xl bg-muted p-3 text-sm leading-6">سبب الإلغاء: {cancellationReason}</p> : null}
        </div>
      </CardContent>
    </Card>
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
