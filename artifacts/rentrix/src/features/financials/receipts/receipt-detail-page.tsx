import { Link, useSearch } from '@tanstack/react-router';
import { ArrowRight, Printer, ReceiptText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { documentEngine } from '@/services/documents/documentEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatDate, formatMoney, formatShortId, getErrorMessage, paymentMethodLabels } from '@lib/format';
import type { ReceiptRecord } from './receiptService';
import { useReceipt, useReceipts } from './useReceipts';

type ReceiptField = { label: string; value: string };
function valueOrDash(value: string | null | undefined) { return value === null || value === undefined || value === '' ? '—' : value; }
function getReceiptFields(receipt: ReceiptRecord): ReceiptField[] { return [
  { label: 'رقم الإيصال', value: receipt.receipt_number }, { label: 'معرّف الدفع', value: formatShortId(receipt.payment_id) },
  { label: 'معرّف الفاتورة', value: formatShortId(receipt.invoice_id) }, { label: 'تاريخ الدفع', value: formatDate(receipt.payment_date) },
  { label: 'طريقة الدفع', value: paymentMethodLabels[receipt.payment_method] ?? receipt.payment_method }, { label: 'المبلغ', value: formatMoney(receipt.amount) },
  { label: 'المستأجر', value: valueOrDash(receipt.tenant_name) }, { label: 'العقار', value: valueOrDash(receipt.property_title) },
  { label: 'الوحدة', value: valueOrDash(receipt.unit_number) }, { label: 'المرجع', value: valueOrDash(receipt.reference_number) },
];}
function ReceiptFieldGrid({ receipt }: Readonly<{ receipt: ReceiptRecord }>) { return <div className="grid gap-3 md:grid-cols-2">{getReceiptFields(receipt).map((field) => <div key={field.label} className="rounded-2xl border border-border/70 bg-background/80 p-4 print:border-slate-300 print:bg-white"><p className="text-xs font-bold text-muted-foreground print:text-slate-500">{field.label}</p><p className="mt-2 break-words text-base font-black text-foreground print:text-slate-950">{field.value}</p></div>)}</div>; }
function ReceiptPrintDocument({ receipt }: Readonly<{ receipt: ReceiptRecord }>) { return <Card className="mx-auto max-w-3xl overflow-hidden border-primary/10 bg-card print:border-0 print:shadow-none"><CardContent className="space-y-8 p-8 print:p-0"><header className="flex flex-col gap-5 border-b pb-6 print:border-slate-300"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-muted-foreground print:text-slate-500">{defaultCompanyLocalSettings.companyName}</p><h1 className="mt-2 text-3xl font-black text-foreground print:text-slate-950">إيصال دفع</h1></div><div className="rounded-3xl bg-primary/10 p-4 text-primary print:border print:border-slate-300 print:bg-white print:text-slate-950"><ReceiptText className="size-8" /></div></div><div className="rounded-2xl bg-muted/40 p-4 print:border print:border-slate-300 print:bg-white"><p className="text-xs font-bold text-muted-foreground print:text-slate-500">Reference</p><p className="mt-1 font-mono text-lg font-black tracking-wide text-foreground print:text-slate-950">{receipt.receipt_number}</p></div></header><ReceiptFieldGrid receipt={receipt} /></CardContent></Card>; }
function ReceiptDetailContent({ receiptId }: Readonly<{ receiptId: string }>) { const receiptQuery = useReceipt(receiptId); if (receiptQuery.isLoading) return <Card><CardContent className="p-6 text-center text-muted-foreground">جارٍ تحميل الإيصال...</CardContent></Card>; if (receiptQuery.isError) return <Card><CardContent className="p-6 text-center text-destructive">{getErrorMessage(receiptQuery.error, 'تعذر تحميل الإيصال')}</CardContent></Card>; if (!receiptQuery.data) return <Card><CardContent className="p-6 text-center text-muted-foreground">الإيصال غير موجود.</CardContent></Card>; const receipt = receiptQuery.data; return <><div className="print:hidden mb-3"><Button variant="secondary" onClick={() => { const result = documentEngine.previewDocument('receipt', { generatedAt: formatDate(receipt.payment_date), companyName: defaultCompanyLocalSettings.companyName, receiptNumber: receipt.receipt_number, paymentId: formatShortId(receipt.payment_id), invoiceId: formatShortId(receipt.invoice_id), paymentDate: formatDate(receipt.payment_date), paymentMethod: paymentMethodLabels[receipt.payment_method] ?? receipt.payment_method, amount: formatMoney(receipt.amount), tenant: valueOrDash(receipt.tenant_name), property: valueOrDash(receipt.property_title), unit: valueOrDash(receipt.unit_number), reference: valueOrDash(receipt.reference_number) }); if (!result.success) globalThis.alert(result.errorMessage ?? 'تعذر فتح المعاينة'); }}><Printer className="ms-2 size-4" />طباعة</Button></div><ReceiptPrintDocument receipt={receipt} /></>; }

function ReceiptsListContent() {
  const query = useReceipts({ limit: 200 });
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => (query.data ?? []).filter((r) => [r.receipt_number, r.reference_number, r.tenant_name, r.property_title].some((v) => (v ?? '').toLowerCase().includes(search.toLowerCase()))), [query.data, search]);
  if (query.isLoading) return <Card><CardContent className="p-6 text-center text-muted-foreground">جارٍ تحميل الإيصالات...</CardContent></Card>;
  if (query.isError) return <Card><CardContent className="p-6 text-center text-destructive">{getErrorMessage(query.error, 'تعذر تحميل الإيصالات')}</CardContent></Card>;
  return <div className="space-y-4"><div className="relative max-w-md"><Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث برقم الإيصال أو المستأجر أو العقار" className="pe-10"/></div>{filtered.length===0 ? <Card><CardContent className="p-6 text-center text-muted-foreground">لا توجد إيصالات مطابقة.</CardContent></Card> : <div className="grid gap-3">{filtered.map((receipt)=><Card key={receipt.id}><CardContent className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">{receipt.receipt_number}</p><p className="text-xs text-muted-foreground">{formatDate(receipt.payment_date)} • {valueOrDash(receipt.tenant_name)}</p></div><div className="flex items-center gap-3"><p className="font-black text-primary">{formatMoney(receipt.amount)}</p><Button asChild><Link to="/receipts" search={{ receiptId: receipt.id }}>عرض</Link></Button></div></div></CardContent></Card>)}</div>}</div>;
}

function getReceiptIdFromSearch(search: Record<string, unknown>) { const receiptId = search.receiptId; return typeof receiptId === 'string' ? receiptId : ''; }
export function ReceiptDetailPage() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const receiptId = getReceiptIdFromSearch(search);
  return <div className="space-y-6 print:bg-white" dir="rtl"><div className="flex flex-wrap items-start justify-between gap-3 print:hidden"><div><h2 className="text-3xl font-black">{receiptId ? 'عرض إيصال الدفع' : 'الإيصالات'}</h2><p className="text-sm text-muted-foreground">{receiptId ? 'عرض جاهز للطباعة.' : 'قائمة الإيصالات المسجلة في النظام.'}</p></div><Button variant="secondary" asChild><Link to="/financials"><ArrowRight className="ms-2 size-4" />العودة للمالية</Link></Button></div>{receiptId ? <ReceiptDetailContent receiptId={receiptId} /> : <ReceiptsListContent />}</div>;
}
