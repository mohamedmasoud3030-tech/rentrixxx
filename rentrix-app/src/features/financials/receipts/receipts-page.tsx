import { Link, useSearch } from '@tanstack/react-router';
import { ArrowRight, Ban, CalendarDays, Printer, ReceiptText, Search, WalletCards } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { ReceiptCard } from '@/components/ui/receipt-card';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AuthorizationContext } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, formatMoney, formatShortId, getErrorMessage } from '../components/financials-formatters';
import { ReceiptDetailCard } from '../components/receipt-detail-card';
import { formatReceiptContext, paymentMethodLabels, receiptStatusLabels } from '../components/receipt-formatters';
import type { ReceiptRecord } from './receiptService';
import { ReceiptDetailPage } from './receipt-detail-page';
import { useReceipt, useReceipts, useVoidReceipt } from './useReceipts';

type MethodFilter = 'all' | ReceiptRecord['payment_method'];

function getReceiptIdFromSearch(search: Record<string, unknown>) {
  return typeof search.receiptId === 'string' ? search.receiptId : '';
}

function isWithinDate(receipt: ReceiptRecord, from: string, to: string) {
  return (!from || receipt.payment_date >= from) && (!to || receipt.payment_date <= to);
}

export function canVoidReceipts(authorization: AuthorizationContext | null | undefined) {
  return authorization?.role === 'ADMIN' || authorization?.role === 'MANAGER';
}

export function createReceiptPrintHref(receiptId: string) {
  return `/receipts?receiptId=${encodeURIComponent(receiptId)}`;
}

function createVoidRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `void-${Date.now()}`;
}

function ReceiptMetric({ label, value, helper, icon: Icon }: Readonly<{ label: string; value: string; helper: string; icon: typeof ReceiptText }>) {
  return (
    <Card className="border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-black text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></div>
      </CardContent>
    </Card>
  );
}

function ReceiptsHistoryContent() {
  const { authorization } = useAuth();
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState<MethodFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const receiptsQuery = useReceipts({ limit: 100 });
  const selectedDetailQuery = useReceipt(selectedReceiptId);
  const voidReceiptMutation = useVoidReceipt();
  const canVoidReceipt = canVoidReceipts(authorization);

  const receipts = receiptsQuery.data ?? [];
  const filteredReceipts = useMemo(() => receipts.filter((receipt) => {
    const haystack = `${receipt.receipt_number} ${receipt.reference_number ?? ''} ${receipt.tenant_name ?? ''} ${receipt.property_title ?? ''} ${receipt.unit_number ?? ''} ${formatShortId(receipt.invoice_id)}`.toLowerCase();
    return (deferredQuery.length === 0 || haystack.includes(deferredQuery))
      && (method === 'all' || receipt.payment_method === method)
      && isWithinDate(receipt, from, to);
  }), [deferredQuery, from, method, receipts, to]);
  const totalAmount = filteredReceipts.reduce((total, receipt) => total + receipt.amount, 0);
  const selectedReceipt = selectedDetailQuery.data;
  const handleVoidReceipt = (receipt: ReceiptRecord) => {
    const reason = globalThis.prompt?.(`سبب إلغاء الإيصال ${receipt.receipt_number}`)?.trim();
    if (!reason) return;

    voidReceiptMutation.mutate({
      receipt_id: receipt.id,
      reason,
      request_id: createVoidRequestId(),
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-primary">سجل التحصيل</p>
          <h2 className="text-3xl font-black tracking-tight">الإيصالات</h2>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">مراجعة إيصالات الدفعات المنشورة، فتح تفاصيل الإيصال، واستخدام أمر الطباعة عند الحاجة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild><Link to="/financials"><ArrowRight className="me-2 size-4" />المالية</Link></Button>
          {selectedReceiptId ? <Button asChild><a href={createReceiptPrintHref(selectedReceiptId)}><Printer className="me-2 size-4" />طباعة المحدد</a></Button> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReceiptMetric label="الإيصالات المعروضة" value={filteredReceipts.length.toLocaleString('ar-SA')} helper="ضمن الفلاتر الحالية" icon={ReceiptText} />
        <ReceiptMetric label="إجمالي التحصيل" value={formatMoney(totalAmount)} helper="من الإيصالات المعروضة" icon={WalletCards} />
        <ReceiptMetric label="أحدث النتائج" value={receipts.length.toLocaleString('ar-SA')} helper="آخر 100 إيصال" icon={CalendarDays} />
        <ReceiptMetric label="الإيصال المحدد" value={selectedReceipt?.receipt_number ?? '—'} helper="جاهز للعرض والطباعة" icon={Printer} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فلاتر الإيصالات</CardTitle>
          <CardDescription>ابحث برقم الإيصال أو رقم المرجع أو اسم المستأجر أو العقار.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1 text-sm font-bold xl:col-span-2">
            <span>بحث</span>
            <div className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pe-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="رقم الإيصال REC-، المرجع، المستأجر، العقار" />
            </div>
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>طريقة الدفع</span>
            <Select value={method} onChange={(event) => setMethod(event.target.value as MethodFilter)}>
              <option value="all">كل الطرق</option>
              {Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-bold"><span>من تاريخ</span><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="space-y-1 text-sm font-bold"><span>إلى تاريخ</span><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تاريخ الإيصالات</CardTitle>
          <CardDescription>اختر إيصالاً لعرض تفاصيله وروابط الطباعة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {receiptsQuery.isLoading ? <div className="space-y-3">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-14" />)}</div> : null}
          {receiptsQuery.isError ? <EmptyState title="تعذر تحميل الإيصالات" description={getErrorMessage(receiptsQuery.error, 'أعد المحاولة بعد لحظات.')} role="alert" ariaLive="assertive" /> : null}
          {!receiptsQuery.isLoading && !receiptsQuery.isError && filteredReceipts.length === 0 ? <EmptyState title="لا توجد إيصالات مطابقة" description="غيّر البحث أو الفلاتر لعرض إيصالات أخرى." /> : null}

          {filteredReceipts.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 md:hidden">
                {filteredReceipts.map((receipt) => (
                  <ReceiptCard
                    key={receipt.id}
                    id={receipt.id}
                    receiptNumber={receipt.receipt_number}
                    paymentDate={receipt.payment_date}
                    amount={receipt.amount}
                    paymentMethod={paymentMethodLabels[receipt.payment_method] ?? receipt.payment_method}
                    context={formatReceiptContext(receipt)}
                    invoiceId={formatShortId(receipt.invoice_id)}
                    status={receipt.status}
                    onClick={() => setSelectedReceiptId(receipt.id)}
                    formatDate={formatDate}
                    formatMoney={formatMoney}
                  />
                ))}
              </div>
              <div className="grid gap-2 md:hidden">
                {filteredReceipts.map((receipt) => (
                  <div key={`${receipt.id}-actions`} className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3">
                    <Button variant="secondary" className="min-h-10 px-3" onClick={() => setSelectedReceiptId(receipt.id)}>عرض</Button>
                    <Button variant="secondary" className="min-h-10 px-3" asChild><a href={createReceiptPrintHref(receipt.id)}><Printer className="me-2 size-4" />طباعة</a></Button>
                    {canVoidReceipt ? <Button variant="danger" className="min-h-10 px-3" onClick={() => handleVoidReceipt(receipt)} disabled={voidReceiptMutation.isPending}><Ban className="me-2 size-4" />إلغاء</Button> : null}
                  </div>
                ))}
              </div>

              <DataTable className="hidden md:block" aria-label="جدول الإيصالات">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الإيصال</TableHead>
                      <TableHead>تاريخ الدفع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>الفاتورة</TableHead>
                      <TableHead>السياق</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className={selectedReceiptId === receipt.id ? 'bg-primary/5' : undefined}>
                        <TableCell className="font-black">{receipt.receipt_number}</TableCell>
                        <TableCell>{formatDate(receipt.payment_date)}</TableCell>
                        <TableCell dir="ltr" className="font-bold">{formatMoney(receipt.amount)}</TableCell>
                        <TableCell>{paymentMethodLabels[receipt.payment_method] ?? receipt.payment_method}</TableCell>
                        <TableCell>{formatShortId(receipt.invoice_id)}</TableCell>
                        <TableCell>{formatReceiptContext(receipt)}</TableCell>
                        <TableCell><StatusBadge tone="green">{receiptStatusLabels[receipt.status] ?? receipt.status}</StatusBadge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" className="min-h-10 px-3" onClick={() => setSelectedReceiptId(receipt.id)}>عرض</Button>
                            <Button variant="secondary" className="min-h-10 px-3" asChild><a href={createReceiptPrintHref(receipt.id)}><Printer className="me-2 size-4" />طباعة</a></Button>
                            {canVoidReceipt ? <Button variant="danger" className="min-h-10 px-3" onClick={() => handleVoidReceipt(receipt)} disabled={voidReceiptMutation.isPending}><Ban className="me-2 size-4" />إلغاء</Button> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTable>
            </>
          ) : null}

          <ReceiptDetailCard
            selectedReceiptId={selectedReceiptId}
            receiptDetail={selectedDetailQuery.data}
            isLoading={selectedDetailQuery.isLoading}
            isError={selectedDetailQuery.isError}
            error={selectedDetailQuery.error}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function ReceiptsPage() {
  const searchParams = useSearch({ strict: false }) as Record<string, unknown>;
  const receiptIdFromSearch = getReceiptIdFromSearch(searchParams);

  return receiptIdFromSearch ? <ReceiptDetailPage /> : <ReceiptsHistoryContent />;
}
