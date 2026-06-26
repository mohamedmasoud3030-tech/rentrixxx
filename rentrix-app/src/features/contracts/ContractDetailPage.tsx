import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CalendarDays, Edit, RefreshCw, ShieldAlert, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { exportContractToPdf } from '@/services/pdfService';
import type { Person, Property, Unit } from '@/types/domain';
import { useCompanySettingsContract } from '../settings/useCompanySettings';
import { formatContractDate, formatContractDateTime, formatContractDayCount, formatContractMoney, getContractInclusiveDays, getContractRemainingDays } from './contractDisplayFormatters';
import { contractStatusLabels, contractStatusTone, paymentCycleLabels, renewalSchema, type RenewalPayload } from './contractSchema';
import { ContractPaymentsTab } from './contractPaymentsTab';
import type { ContractDetail } from './services/contractService';
import { useContract, useRenewContract } from './useContracts';

type TimelineTone = 'blue' | 'green' | 'red' | 'gray' | 'gold';
type TimelineItem = Readonly<{ title: string; value: string; description: string; tone: TimelineTone }>;

const fieldError = (message?: string) => message ? <span className="text-xs font-bold text-destructive">{message}</span> : null;
const getContractDetailErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل العقد.';
const toDateInputValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (value: string, days: number) => { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return date; };
const addYear = (date: Date) => { const nextDate = new Date(date); nextDate.setFullYear(nextDate.getFullYear() + 1); nextDate.setDate(nextDate.getDate() - 1); return nextDate; };
const canRenewContract = (contract: ContractDetail) => contract.status === 'active' || contract.status === 'expired';
const getRenewalDefaults = (contract: ContractDetail): RenewalPayload => { const nextStart = addDays(contract.end_date, 1); return { new_start: toDateInputValue(nextStart), new_end: toDateInputValue(addYear(nextStart)), new_amount: contract.rent_amount }; };

const toPdfTenant = (person: ContractDetail['people']): Person | null => person ? { ...person, type: 'tenant', address: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null } : null;
const toPdfUnit = (unit: ContractDetail['units'], propertyId: string): Unit | null => unit ? { ...unit, name: null, property_id: propertyId, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null } : null;
const toPdfProperty = (property: ContractDetail['properties']): Property | null => property ? { ...property, type: 'residential', owner_name: null, purchase_value: null, current_value: null, status: 'active', notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null } : null;

function getExpiryDescription(settings: CompanySettingsContract, contract: ContractDetail): string {
  if (contract.status === 'terminated') return 'تم إنهاء العقد ولا توجد مدة متبقية معروضة.';
  const remainingDays = getContractRemainingDays(contract.end_date);
  if (remainingDays < 0) return `انتهى منذ ${formatContractDayCount(settings, Math.abs(remainingDays))} يوم.`;
  return remainingDays === 0 ? 'ينتهي اليوم حسب تاريخ نهاية العقد.' : `باقي ${formatContractDayCount(settings, remainingDays)} يوم حتى تاريخ النهاية.`;
}

function getTimeline(settings: CompanySettingsContract, contract: ContractDetail): TimelineItem[] {
  const expiryDays = getContractRemainingDays(contract.end_date);
  return [
    { title: 'إنشاء العقد', value: formatContractDateTime(settings, contract.created_at), description: 'وقت تسجيل العقد في النظام.', tone: 'blue' },
    { title: 'تاريخ البداية', value: formatContractDate(settings, contract.start_date), description: `بداية الالتزام التجاري لمدة ${formatContractDayCount(settings, getContractInclusiveDays(contract.start_date, contract.end_date))} يوم.`, tone: 'green' },
    { title: 'تاريخ النهاية', value: formatContractDate(settings, contract.end_date), description: getExpiryDescription(settings, contract), tone: contract.status === 'terminated' ? 'red' : expiryDays < 0 ? 'gray' : expiryDays <= 30 ? 'gold' : 'green' },
    { title: 'آخر تحديث', value: formatContractDateTime(settings, contract.updated_at), description: 'آخر تعديل محفوظ على بيانات العقد.', tone: 'gray' },
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

  if (contractQuery.isLoading) return <RouteLoadingState />;
  if (contractQuery.isError) return <EmptyState title="تعذر تحميل العقد" description={getContractDetailErrorMessage(contractQuery.error)} action={<Button onClick={() => void contractQuery.refetch()}>إعادة المحاولة</Button>} />;
  if (!contractQuery.data) return <EmptyState title="العقد غير موجود" description="ربما تم حذف العقد أو لا تملك صلاحية الوصول إليه." />;

  const contract = contractQuery.data;
  const renewalAllowed = canRenewContract(contract);
  const timeline = getTimeline(companySettings, contract);
  const details = [
    ['العقد رقم', `#${contract.id.slice(0, 8)}`], ['المستأجر', contract.people?.full_name ?? '—'], ['الوحدة', contract.units?.unit_number ?? '—'], ['العقار', contract.properties?.title ?? '—'],
    ['تاريخ البداية', formatContractDate(companySettings, contract.start_date)], ['تاريخ النهاية', formatContractDate(companySettings, contract.end_date)], ['قيمة الإيجار', formatContractMoney(companySettings, contract.rent_amount)], ['دورة السداد', paymentCycleLabels[contract.payment_cycle]],
  ];

  const exportContractPdf = () => {
    const tenant = toPdfTenant(contract.people);
    const unit = toPdfUnit(contract.units, contract.property_id);
    const property = toPdfProperty(contract.properties);
    exportContractToPdf(contract, {
      settings: { general: { company: { name: companySettings.companyName } }, operational: { currency: companySettings.defaultCurrency } },
      contracts: [contract], tenants: tenant ? [tenant] : [], units: unit ? [unit] : [], properties: property ? [property] : [],
    });
  };

  const submitRenewal = async (values: RenewalPayload) => {
    const result = await renewMutation.mutateAsync(values);
    setOpen(false);
    await navigate({ to: '/contracts/$contractId', params: { contractId: result.new_contract_id } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-black text-primary">العقد رقم #{contract.id.slice(0, 8)}</p><h2 className="text-3xl font-black">تفاصيل العقد</h2><p className="text-sm text-muted-foreground">عرض كامل للعقد وسجل مراحله.</p></div>
        <div className="flex gap-2"><Button variant="secondary" asChild><Link to="/contracts"><ArrowLeft className="me-2 size-4" />العودة</Link></Button><Button variant="secondary" disabled={!renewalAllowed} onClick={() => { form.reset(getRenewalDefaults(contract)); setOpen(true); }}><RefreshCw className="me-2 size-4" />تجديد</Button><Button variant="secondary" onClick={exportContractPdf}>تصدير PDF</Button><Button asChild><Link to="/contracts/$contractId/edit" params={{ contractId }}><Edit className="me-2 size-4" />تعديل</Link></Button></div>
      </div>

      <Card><CardHeader><CardTitle>بيانات العقد</CardTitle><CardDescription>الحقول الأساسية وربط العقار والوحدة والمستأجر.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{details.map(([label, value]) => <Info key={label} label={label} value={value} />)}<div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-bold text-muted-foreground">الحالة</p><div className="mt-2"><StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge></div></div><Info label="سبب الإلغاء" value={contract.status === 'terminated' ? contract.cancellation_reason?.trim() || '—' : 'غير مطبق'} /><div className="rounded-2xl border border-border bg-background p-4 md:col-span-2"><p className="text-xs font-bold text-muted-foreground">ملاحظات</p><p className="mt-1 leading-7">{contract.notes ?? '—'}</p></div></CardContent></Card>

      <Card className="overflow-hidden border-primary/20 bg-primary/5"><CardHeader className="bg-background/80"><CardTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-primary" />إجراءات التجديد والإنهاء</CardTitle><CardDescription>{getExpiryDescription(companySettings, contract)}</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6"><p className="text-sm text-muted-foreground">{contract.renewed_from ? 'هذا العقد مجدد من عقد سابق.' : 'لا يوجد عقد سابق مرتبط بهذا العقد.'}</p><Button variant="secondary" asChild><Link to="/contracts/$contractId/edit" params={{ contractId: contract.id }}>تعديل الحالة وسبب الإلغاء</Link></Button></CardContent></Card>

      <ContractPaymentsTab contractId={contract.id} />

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="size-5 text-primary" />الخط الزمني المالي</CardTitle><CardDescription>ملخص من بيانات العقد الحالية.</CardDescription></CardHeader><CardContent className="grid gap-4 pt-6 md:grid-cols-3"><Info label="قيمة الإيجار" value={formatContractMoney(companySettings, contract.rent_amount)} /><Info label="الوحدة المؤجرة" value={contract.units?.unit_number ?? '—'} /><Info label="العقار" value={contract.properties?.title ?? '—'} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" />الخط الزمني</CardTitle></CardHeader><CardContent className="space-y-3">{timeline.map((item) => <TimelineRow item={item} key={item.title} />)}</CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>تجديد العقد</DialogTitle><DialogDescription>سيتم إنشاء عقد جديد مرتبط بالعقد الحالي مع حفظ سلسلة التجديد.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={form.handleSubmit(submitRenewal)}><label className="grid gap-2 text-sm font-bold">تاريخ البداية<Input type="date" {...form.register('new_start')} />{fieldError(form.formState.errors.new_start?.message)}</label><label className="grid gap-2 text-sm font-bold">تاريخ النهاية<Input type="date" {...form.register('new_end')} />{fieldError(form.formState.errors.new_end?.message)}</label><label className="grid gap-2 text-sm font-bold">قيمة الإيجار<Input type="number" step="0.01" min="0" {...form.register('new_amount')} />{fieldError(form.formState.errors.new_amount?.message)}</label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button><Button type="submit" disabled={renewMutation.isPending}>تجديد العقد</Button></div></form></DialogContent></Dialog>
    </div>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div>; }
function TimelineRow({ item }: Readonly<{ item: TimelineItem }>) { return <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"><span className="mt-1 size-3 rounded-full bg-primary" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{item.title}</p><StatusBadge tone={item.tone}>{item.value}</StatusBadge></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p></div></div>; }