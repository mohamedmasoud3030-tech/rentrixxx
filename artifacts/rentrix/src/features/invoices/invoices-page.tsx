import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4"><p>إجمالي الفواتير</p><p>{stats.total}</p></Card><Card className="p-4"><p>غير مدفوعة</p><p>{stats.unpaid}</p></Card><Card className="p-4"><p>متأخرة</p><p>{stats.overdue}</p></Card><Card className="p-4"><p>مدفوعة</p><p>{stats.paid}</p></Card><Card className="p-4"><p>إجمالي الرصيد</p><p>{formatMoney(stats.outstanding)}</p></Card>
      </div>
      <Card className="space-y-3 p-4"><div className="flex flex-wrap gap-2">{statusFilters.map((filter) => <Button key={filter.value} variant={status === filter.value ? 'primary' : 'secondary'} onClick={() => setStatus(filter.value)}>{filter.label}</Button>)}</div><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث" /></Card>
      <Card className="overflow-x-auto">{invoicesQuery.isError ? <div className="p-4">{getErrorMessage(invoicesQuery.error, 'تعذر تحميل الفواتير')}</div> : null}<table className="w-full min-w-[700px]"><tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id}><td><input type="checkbox" checked={bulk.isSelected(invoice.id)} onChange={() => bulk.toggleOne(invoice.id)} /></td><td>{invoice.id.slice(0, 8)}</td><td>{formatDate(invoice.due_date)}</td><td>{formatInvoiceStatusLabel(invoice.status)}</td><td>{formatMoney(invoice.amount)}</td></tr>)}</tbody></table></Card>
      <BulkActionsBar selectedCount={bulk.selectedCount} selectionLabel={`تم تحديد ${bulk.selectedCount} فاتورة`} onClear={bulk.clear} actions={<Button variant="secondary" onClick={() => exportCsv(selectedItems)}><Download className="me-2 size-4" />تصدير</Button>} />
    </div>
  );
}
