import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowRight, Edit, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, formatMoney } from '@/lib/formatters';
import { contractStatusLabels, paymentCycleLabels, renewalSchema, type RenewalPayload } from './contractSchema';
import { useContract, useRenewContract } from './useContracts';
import { useState } from 'react';

const statusTone = { draft: 'gray', active: 'blue', expired: 'green', terminated: 'red' } as const;

function money(value: number) {
  return formatMoney({ amount: value, currency: DEFAULT_CURRENCY, locale: DEFAULT_LOCALE });
}

function fieldError(message?: string) { return message ? <span className="text-xs font-bold text-destructive">{message}</span> : null; }

function getContractDetailErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل العقد.';
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

  if (contractQuery.isLoading) return <RouteLoadingState />;
  if (contractQuery.isError) {
    return (
      <EmptyState
        title="تعذر تحميل العقد"
        description={getContractDetailErrorMessage(contractQuery.error)}
        action={<Button type="button" onClick={retryContractDetail}>إعادة المحاولة</Button>}
      />
    );
  }
  if (!contractQuery.data) return <EmptyState title="العقد غير موجود" description="ربما تم حذف العقد أو لا تملك صلاحية الوصول إليه." />;
  const contract = contractQuery.data;
  const timeline = [
    { title: 'إنشاء العقد', value: new Date(contract.created_at).toLocaleString('ar') },
    { title: 'تاريخ البداية', value: new Date(contract.start_date).toLocaleDateString('ar') },
    { title: 'تاريخ النهاية', value: new Date(contract.end_date).toLocaleDateString('ar') },
    { title: 'آخر تحديث', value: new Date(contract.updated_at).toLocaleString('ar') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-black text-primary">العقد رقم #{contract.id.slice(0, 8)}</p><h2 className="text-3xl font-black">تفاصيل العقد</h2><p className="text-sm text-muted-foreground">عرض كامل للعقد وسجل مراحله.</p></div>
        <div className="flex gap-2"><Button variant="secondary" asChild><Link to="/contracts"><ArrowRight className="ml-2 size-4" />العودة</Link></Button><Button variant="secondary" onClick={() => setOpen(true)}><RefreshCw className="ml-2 size-4" />تجديد</Button><Button asChild><Link to="/contracts/$contractId/edit" params={{ contractId }}><Edit className="ml-2 size-4" />تعديل</Link></Button></div>
      </div>
      <Card><CardHeader><CardTitle>بيانات العقد</CardTitle><CardDescription>الحقول الأساسية وربط العقار والوحدة والمستأجر.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Info label="العقد رقم" value={`#${contract.id.slice(0, 8)}`} /><Info label="المستأجر" value={contract.people?.full_name ?? '—'} /><Info label="الوحدة" value={contract.units?.unit_number ?? '—'} /><Info label="العقار" value={contract.properties?.title ?? '—'} /><Info label="تاريخ البداية" value={new Date(contract.start_date).toLocaleDateString('ar')} /><Info label="تاريخ النهاية" value={new Date(contract.end_date).toLocaleDateString('ar')} /><Info label="قيمة الإيجار" value={money(contract.rent_amount)} /><Info label="دورة السداد" value={paymentCycleLabels[contract.payment_cycle]} /><div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-bold text-muted-foreground">الحالة</p><div className="mt-2"><StatusBadge tone={statusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge></div></div><div className="rounded-2xl border border-border bg-background p-4 md:col-span-2"><p className="text-xs font-bold text-muted-foreground">ملاحظات</p><p className="mt-1 leading-7">{contract.notes ?? '—'}</p></div></CardContent></Card>
      <Card><CardHeader><CardTitle>الخط الزمني</CardTitle></CardHeader><CardContent className="space-y-3">{timeline.map((item) => <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4"><span className="size-3 rounded-full bg-primary" /><div><p className="font-black">{item.title}</p><p className="text-sm text-muted-foreground">{item.value}</p></div></div>)}</CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>تجديد العقد</DialogTitle><DialogDescription>سيتم إنشاء عقد جديد مرتبط بالعقد الحالي عبر RPC آمن.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={form.handleSubmit(async (values) => { const newId = await renewMutation.mutateAsync(values); setOpen(false); await navigate({ to: '/contracts/$contractId', params: { contractId: newId } }); })}><label className="grid gap-2 text-sm font-bold">تاريخ البداية<Input type="date" {...form.register('new_start')} />{fieldError(form.formState.errors.new_start?.message)}</label><label className="grid gap-2 text-sm font-bold">تاريخ النهاية<Input type="date" {...form.register('new_end')} />{fieldError(form.formState.errors.new_end?.message)}</label><label className="grid gap-2 text-sm font-bold">قيمة الإيجار<Input type="number" step="0.01" min="0" {...form.register('new_amount')} />{fieldError(form.formState.errors.new_amount?.message)}</label><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button><Button type="submit" disabled={renewMutation.isPending}>تجديد العقد</Button></div></form></DialogContent></Dialog>
    </div>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div>; }
