import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useGenerateInvoices, useInvoices } from '@/features/financials/invoices/useInvoices';
import { getSafeRemainingAmount } from '@/features/financials/financialMath';
import { downloadCsv } from '@/utils/helpers';
import { formatDate, formatInvoiceStatusLabel, formatMoney, getErrorMessage } from '@lib/format';
import type { InvoiceListItem, InvoiceStatusFilter } from '@/services/financial/invoiceService';

const statusFilters: ReadonlyArray<{ value: InvoiceStatusFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'unpaid', label: 'غير مدفوعة' },
  { value: 'overdue', label: 'متأخرة' },
  { value: 'paid', label: 'مدفوعة' },
];

export function InvoicesPage() {
  const [status, setStatus] = useState<InvoiceStatusFilter>('all');
  const [search, setSearch] = useState('');
  const invoicesQuery = useInvoices({ status });
  const generateInvoices = useGenerateInvoices();
  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = invoicesQuery.data ?? [];
    if (!term) return all;
    return all.filter((invoice) => [invoice.id, invoice.contract_id, invoice.contracts?.tenant_id, invoice.contracts?.property_id].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [invoicesQuery.data, search]);
  const stats = useMemo(() => filteredInvoices.reduce((acc, invoice) => {
    acc.total += 1;
    if (invoice.status === 'paid') acc.paid += 1;
    if (invoice.status === 'overdue') acc.overdue += 1;
    if (invoice.status === 'issued' || invoice.status === 'partial' || invoice.status === 'overdue') acc.unpaid += 1;
    acc.outstanding += getSafeRemainingAmount(invoice.amount, invoice.paid_amount);
    return acc;
  }, { total: 0, paid: 0, overdue: 0, unpaid: 0, outstanding: 0 }), [filteredInvoices]);
  const bulk = useBulkSelection(filteredInvoices.map((item) => item.id));
  const selectedItems = useMemo(() => filteredInvoices.filter((item) => bulk.selectedIds.has(item.id)), [bulk.selectedIds, filteredInvoices]);
  const exportCsv = (rows: InvoiceListItem[]) => downloadCsv(`invoices-${new Date().toISOString().slice(0, 10)}`, rows.map((invoice) => ({ invoiceNumber: invoice.id, amount: invoice.amount })), ['invoiceNumber', 'amount']);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-black">الفواتير</h2><Button onClick={() => generateInvoices.mutate()} disabled={generateInvoices.isPending}>إنشاء الفواتير الشهرية</Button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4"><p>إجمالي الفواتير</p><p>{stats.total}</p></Card><Card className="p-4"><p>غير مدفوعة</p><p>{stats.unpaid}</p></Card><Card className="p-4"><p>متأخرة</p><p>{stats.overdue}</p></Card><Card className="p-4"><p>مدفوعة</p><p>{stats.paid}</p></Card><Card className="p-4"><p>إجمالي الرصيد</p><p>{formatMoney(stats.outstanding)}</p></Card>
      </div>
      <Card className="space-y-3 p-4"><div className="flex flex-wrap gap-2">{statusFilters.map((filter) => <Button key={filter.value} variant={status === filter.value ? 'primary' : 'secondary'} onClick={() => setStatus(filter.value)}>{filter.label}</Button>)}</div><Input aria-label="بحث الفواتير" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث" /></Card>
      <Card className="overflow-hidden">
        {invoicesQuery.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div> : null}
        {invoicesQuery.isError ? <div className="p-4 text-destructive">{getErrorMessage(invoicesQuery.error, 'تعذر تحميل الفواتير')}</div> : null}
        {!invoicesQuery.isLoading && !invoicesQuery.isError && filteredInvoices.length === 0 ? <div className="p-4"><EmptyState title="لا توجد فواتير مطابقة" description="جرّب تعديل عوامل التصفية أو البحث لعرض النتائج." /></div> : null}
        {!invoicesQuery.isLoading && !invoicesQuery.isError && filteredInvoices.length > 0 ? <div className="overflow-x-auto"><Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>تحديد</TableHead><TableHead>رقم الفاتورة</TableHead><TableHead>تاريخ الاستحقاق</TableHead><TableHead>الحالة</TableHead><TableHead>الإجمالي</TableHead><TableHead>المتبقي</TableHead></TableRow></TableHeader><TableBody>{filteredInvoices.map((invoice) => <TableRow key={invoice.id}><TableCell><input aria-label={`تحديد الفاتورة ${invoice.id.slice(0, 8)}`} type="checkbox" checked={bulk.isSelected(invoice.id)} onChange={() => bulk.toggleOne(invoice.id)} /></TableCell><TableCell className="font-bold">{invoice.id.slice(0, 8)}</TableCell><TableCell>{formatDate(invoice.due_date)}</TableCell><TableCell>{formatInvoiceStatusLabel(invoice.status)}</TableCell><TableCell dir="ltr">{formatMoney(invoice.amount)}</TableCell><TableCell dir="ltr">{formatMoney(getSafeRemainingAmount(invoice.amount, invoice.paid_amount))}</TableCell></TableRow>)}</TableBody></Table></div> : null}
      </Card>
      <BulkActionsBar selectedCount={bulk.selectedCount} selectionLabel={`تم تحديد ${bulk.selectedCount} فاتورة`} onClear={bulk.clear} actions={<div className="flex gap-2"><Button variant="secondary" aria-label="تصدير الفواتير المحددة" onClick={() => exportCsv(selectedItems)}><Download className="me-2 size-4" />تصدير</Button><Button variant="secondary" aria-label="طباعة الفواتير المحددة" onClick={() => globalThis.window.print()}><Printer className="me-2 size-4" />طباعة</Button></div>} />
    </div>
  );
}
