import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarDays, FileClock, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useContracts } from '@/features/contracts/useContracts';
import type { ContractListItem } from '@/features/contracts/services/contractService';
import { useOwners } from '@/features/owners/useOwners';
import { useProperties } from '@/features/properties/use-properties';
import { useInvoices } from '@/features/financials/invoices/useInvoices';
import { useLeads } from '@/features/leads/use-leads';
import { useAgedReceivablesReport, useOverdueInvoicesReport } from '@/features/financials/reports/useFinancialReports';
import { formatDate, formatInvoiceStatusLabel, formatMoney, getErrorMessage } from '@lib/format';

type FilterState = Readonly<{ asOf: string }>;
type MetricCardProps = Readonly<{ label: string; value: string; helper: string; tone?: 'blue' | 'green' | 'red' | 'gray' | 'gold' }>;

const supportedReportNames = ['ملخص الإشغال', 'ملخص العقود', 'ملخص الفواتير والتحصيل', 'ملخص المتأخرات', 'ملخص العقارات والوحدات'];
const deferredReports = [
  { title: 'تصدير PDF متقدم', reason: 'مؤجل. سيتم التفعيل فقط بعد اعتماد خدمة تصدير موجودة ومجربة.' },
  { title: 'تقارير محاسبية متقدمة', reason: 'مؤجل. لا توجد إضافة Ledger/Chart of Accounts/Journal في هذه المرحلة.' },
];
const contractStatusLabels: Record<ContractListItem['status'], string> = {
  draft: 'مسودة',
  active: 'نشط',
  expired: 'منتهي',
  terminated: 'منهى',
};
const knownContractStatuses: ContractListItem['status'][] = ['draft', 'active', 'expired', 'terminated'];

function getTodayInput() {
  return new Date().toISOString().slice(0, 10);
}

function MetricCard({ label, value, helper, tone = 'blue' }: MetricCardProps) {
  return <div className="rounded-2xl border border-border bg-background/80 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-muted-foreground">{label}</p><StatusBadge tone={tone}>قراءة فقط</StatusBadge></div><p className="mt-3 text-2xl font-black" dir="ltr">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div>;
}

export function ReportsPage() {
  const [filters, setFilters] = useState<FilterState>({ asOf: getTodayInput() });
  const arrearsFilters = useMemo(() => ({ asOf: filters.asOf }), [filters.asOf]);

  const contractsQuery = useContracts({ status: 'all' });
  const propertiesQuery = useProperties({ search: '', status: 'all', page: 1, pageSize: 500 });
  const ownersQuery = useOwners();
  const invoicesQuery = useInvoices({ status: 'all', search: '' });
  const leadsQuery = useLeads();
  const overdueInvoicesQuery = useOverdueInvoicesReport(arrearsFilters);
  const agedReceivablesQuery = useAgedReceivablesReport(arrearsFilters);

  const contracts = contractsQuery.data ?? [];
  const properties = propertiesQuery.data?.rows ?? [];
  const invoices = invoicesQuery.data ?? [];

  const contractStatusSummary = useMemo(() => {
    return contracts.reduce<Record<ContractListItem['status'], number>>((acc, contract) => {
      if (knownContractStatuses.includes(contract.status)) {
        acc[contract.status] += 1;
      }
      return acc;
    }, { draft: 0, active: 0, expired: 0, terminated: 0 });
  }, [contracts]);

  const occupiedUnits = contractStatusSummary.active;
  const totalUnits = new Set(contracts.map((contract) => contract.unit_id).filter(Boolean)).size;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const invoiceSummary = useMemo(() => {
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const paidAmount = invoices.reduce((sum, invoice) => sum + invoice.paid_amount, 0);
    const outstanding = Math.max(totalAmount - paidAmount, 0);
    return { totalAmount, paidAmount, outstanding };
  }, [invoices]);

  const isLoading = contractsQuery.isLoading || propertiesQuery.isLoading || ownersQuery.isLoading || invoicesQuery.isLoading || leadsQuery.isLoading || overdueInvoicesQuery.isLoading || agedReceivablesQuery.isLoading;
  const firstError = contractsQuery.error ?? propertiesQuery.error ?? ownersQuery.error ?? invoicesQuery.error ?? leadsQuery.error ?? overdueInvoicesQuery.error ?? agedReceivablesQuery.error;

  const overdueRows = overdueInvoicesQuery.data?.rows ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-primary/10 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-black text-primary">مركز التقارير التشغيلية</p><h2 className="text-3xl font-black tracking-tight">التقارير</h2><CardDescription>قراءة فقط من البيانات الحالية بدون أي منطق محاسبي متقدم أو ترحيل جديد.</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="secondary" asChild><Link to="/arrears">المتأخرات</Link></Button><Button variant="secondary" asChild><Link to="/invoices">الفواتير</Link></Button></div></div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]"><label className="space-y-1 text-sm font-bold"><span>تاريخ الاحتساب (As of)</span><Input type="date" value={filters.asOf} onChange={(event) => setFilters({ asOf: event.target.value })} /></label><div className="flex items-end"><Button className="w-full" onClick={() => setFilters({ asOf: getTodayInput() })} variant="secondary"><RefreshCcw className="ms-2 size-4" />اليوم</Button></div></div>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3"><CalendarDays className="size-4 text-primary" /><span className="text-sm font-bold text-muted-foreground">مدعوم الآن:</span>{supportedReportNames.map((name) => <StatusBadge key={name} tone="green">{name}</StatusBadge>)}</div>

      {firstError ? <Card><CardContent className="p-4 text-sm text-destructive">{getErrorMessage(firstError, 'تعذر تحميل التقارير. يمكنك إعادة المحاولة بأمان.')}</CardContent></Card> : null}
      {isLoading ? <Card><CardContent className="p-4 text-sm text-muted-foreground">جارٍ تحميل التقارير...</CardContent></Card> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="نسبة الإشغال" value={`${occupancyRate}%`} helper={`${occupiedUnits} مشغولة من ${totalUnits} وحدة (مبني على العقود الحالية)`} tone="green" />
        <MetricCard label="العقود النشطة" value={contractStatusSummary.active.toLocaleString('ar')} helper="من جميع العقود الحالية" />
        <MetricCard label="إجمالي الفواتير" value={formatMoney(invoiceSummary.totalAmount)} helper={`${invoices.length} فاتورة`} tone="blue" />
        <MetricCard label="إجمالي التحصيل" value={formatMoney(invoiceSummary.paidAmount)} helper="مدفوع من الفواتير الحالية" tone="green" />
        <MetricCard label="إجمالي المتأخرات" value={formatMoney(agedReceivablesQuery.data?.totalOverdue ?? 0)} helper={`${overdueRows.length} فاتورة متأخرة`} tone="gold" />
      </section>

      <Card>
        <CardHeader><CardTitle>ملخص حالة العقود</CardTitle><CardDescription>إجمالي العقود حسب الحالة الحالية.</CardDescription></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{knownContractStatuses.map((status) => <div key={status} className="rounded-xl border border-border bg-muted/30 p-3"><p className="text-sm text-muted-foreground">{contractStatusLabels[status]}</p><p className="text-xl font-black">{contractStatusSummary[status].toLocaleString('ar')}</p></div>)}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ملخص العقارات والوحدات</CardTitle><CardDescription>من بيانات العقارات الحالية فقط.</CardDescription></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-xl border border-border bg-muted/30 p-3"><p className="text-sm text-muted-foreground">عدد العقارات</p><p className="text-xl font-black">{properties.length.toLocaleString('ar')}</p></div><div className="rounded-xl border border-border bg-muted/30 p-3"><p className="text-sm text-muted-foreground">عدد الوحدات</p><p className="text-xl font-black">{totalUnits.toLocaleString('ar')}</p></div><div className="rounded-xl border border-border bg-muted/30 p-3"><p className="text-sm text-muted-foreground">عدد الملاك</p><p className="text-xl font-black">{(ownersQuery.data ?? []).length.toLocaleString('ar')}</p></div></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ملخص الفواتير المتأخرة</CardTitle><CardDescription>مبني على خدمة المتأخرات الحالية حسب تاريخ الاحتساب.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>الفاتورة</TableHead><TableHead>المستأجر</TableHead><TableHead>الاستحقاق</TableHead><TableHead>أيام التأخير</TableHead><TableHead>المتبقي</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader><TableBody>{overdueRows.slice(0, 20).map((row) => <TableRow key={row.invoiceId}><TableCell>{row.shortInvoiceId}</TableCell><TableCell>{row.tenantName ?? '—'}</TableCell><TableCell>{formatDate(row.dueDate)}</TableCell><TableCell>{row.daysOverdue.toLocaleString('ar')}</TableCell><TableCell dir="ltr">{formatMoney(row.remainingAmount)}</TableCell><TableCell>{formatInvoiceStatusLabel(row.status)}</TableCell></TableRow>)}{!isLoading && overdueRows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد فواتير متأخرة حسب as-of.</TableCell></TableRow> : null}</TableBody></Table>
        </CardContent>
      </Card>

      {(leadsQuery.data?.length ?? 0) > 0 ? <Card><CardHeader><CardTitle>ملخص العملاء المحتملين</CardTitle><CardDescription>قراءة فقط من خدمة Leads الحالية بدون دمج مع People.</CardDescription></CardHeader><CardContent><p className="text-sm">إجمالي العملاء المحتملين: <span className="font-black">{leadsQuery.data!.length.toLocaleString('ar')}</span></p></CardContent></Card> : null}

      <section className="grid gap-4 md:grid-cols-2" aria-label="Deferred reports">{deferredReports.map((report) => <Card key={report.title} className="border-dashed border-muted-foreground/30 bg-muted/20"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><FileClock className="size-4" />{report.title}</CardTitle><StatusBadge tone="gray">مؤجل</StatusBadge></div><CardDescription>{report.reason}</CardDescription></CardHeader></Card>)}</section>
    </div>
  );
}
