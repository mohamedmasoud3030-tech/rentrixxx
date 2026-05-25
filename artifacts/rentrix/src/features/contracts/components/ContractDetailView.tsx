import { Link, useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Edit, Printer, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { exportContractToPdf } from '@/services/pdfService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { formatContractDate, formatContractMoney } from '@lib/format';
import { contractStatusLabels, contractStatusTone, paymentCycleLabels, renewalSchema, type RenewalPayload } from '../contractSchema';
import { ContractDocumentsShell } from '../contractDocumentsShell';
import { ContractPaymentsTab } from '../contractPaymentsTab';
import type { ContractDetail } from '../services/contractService';
import { useRenewContract } from '../useContracts';
import { ContractTimeline } from './ContractTimeline';
import { canRenewContract, getRenewalDefaults } from '../hooks/useContractRenewal';
import { toPdfProperty, toPdfTenant, toPdfUnit } from '../hooks/useContractPdfExport';

function fieldError(message?: string) { return message ? <span className="text-xs font-bold text-destructive">{message}</span> : null; }

export function ContractDetailView({ contract, companySettings }: Readonly<{ contract: ContractDetail; companySettings: CompanySettingsContract }>) {
  const navigate = useNavigate();
  const renewMutation = useRenewContract(contract.id);
  const [open, setOpen] = useState(false);
  const form = useForm<RenewalPayload>({ resolver: zodResolver(renewalSchema), defaultValues: { new_start: '', new_end: '', new_amount: 0 } });
  const renewalAllowed = canRenewContract(contract);
  const cancellationReason = contract.cancellation_reason?.trim() || '—';
  const hasContractPrintData = Boolean(contract.people && contract.properties);

  const submitRenewal = async (values: RenewalPayload) => { const newId = await renewMutation.mutateAsync(values); setOpen(false); await navigate({ to: '/contracts/$contractId', params: { contractId: newId } }); };
  const openRenewalDialog = () => { form.reset(getRenewalDefaults(contract)); setOpen(true); };
  const exportContractPdf = () => {
    if (!hasContractPrintData || !contract.people || !contract.properties) return;
    const timestamp = contract.created_at;
    const tenant = toPdfTenant(contract.people, timestamp);
    const unit = contract.units ? toPdfUnit(contract.units, contract.property_id, timestamp) : null;
    const property = toPdfProperty(contract.properties, timestamp);
    if (!tenant || !property) return;
    exportContractToPdf(contract, {
      settings: { general: { company: { name: companySettings.companyName } } },
      contracts: [contract],
      tenants: [tenant],
      units: unit ? [unit] : [],
      properties: [property],
    });
  };

  return <div className="space-y-6">{/* trimmed for brevity in refactor */}
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1"><p className="text-sm font-black text-primary">العقد رقم #{contract.id.slice(0, 8)}</p><h2 className="text-3xl font-black">تفاصيل العقد</h2><p className="text-sm text-muted-foreground">عرض كامل للعقد وسجل مراحله.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" asChild><Link to="/contracts"><ArrowRight className="me-2 size-4" />العودة</Link></Button><Button variant="secondary" onClick={openRenewalDialog} disabled={!renewalAllowed}><RefreshCw className="me-2 size-4" />تجديد</Button><Button variant="secondary" onClick={exportContractPdf} disabled={!hasContractPrintData} title={hasContractPrintData ? 'طباعة العقد' : 'طباعة العقد متاحة بعد اكتمال بيانات المستأجر والعقار فقط.'}><Printer className="me-2 size-4" />طباعة العقد</Button><Button asChild><Link to="/contracts/$contractId/edit" params={{ contractId: contract.id }}><Edit className="me-2 size-4" />تعديل</Link></Button></div></div>
    <Card><CardHeader><CardTitle>بيانات العقد</CardTitle><CardDescription>الحقول الأساسية وربط العقار والوحدة والمستأجر.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Info label="العقد رقم" value={`#${contract.id.slice(0, 8)}`} /><Info label="المستأجر" value={contract.people?.full_name ?? '—'} /><Info label="الوحدة" value={contract.units?.unit_number ?? '—'} /><Info label="العقار" value={contract.properties?.title ?? '—'} /><Info label="تاريخ البداية" value={formatContractDate(companySettings, contract.start_date)} /><Info label="تاريخ النهاية" value={formatContractDate(companySettings, contract.end_date)} /><Info label="قيمة الإيجار" value={formatContractMoney(companySettings, contract.rent_amount)} /><Info label="دورة السداد" value={paymentCycleLabels[contract.payment_cycle]} /><div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-bold text-muted-foreground">الحالة</p><div className="mt-2"><StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge></div></div><Info label="سبب الإلغاء" value={contract.status === 'terminated' ? cancellationReason : 'غير مطبق'} /></CardContent></Card>
    <ContractDocumentsShell contractId={contract.id} /><ContractPaymentsTab contractId={contract.id} /><ContractTimeline companySettings={companySettings} contract={contract} />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>تجديد العقد</DialogTitle><DialogDescription>سيتم إنشاء عقد جديد مرتبط بالعقد الحالي عبر RPC آمن.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={form.handleSubmit(submitRenewal)}><label className="grid gap-2 text-sm font-bold">تاريخ البداية<Input type="date" {...form.register('new_start')} />{fieldError(form.formState.errors.new_start?.message)}</label><label className="grid gap-2 text-sm font-bold">تاريخ النهاية<Input type="date" {...form.register('new_end')} />{fieldError(form.formState.errors.new_end?.message)}</label><label className="grid gap-2 text-sm font-bold">قيمة الإيجار<Input type="number" step="0.01" min="0" {...form.register('new_amount')} />{fieldError(form.formState.errors.new_amount?.message)}</label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button><Button type="submit" disabled={renewMutation.isPending}>تجديد العقد</Button></div></form></DialogContent></Dialog>
  </div>;
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div>; }
