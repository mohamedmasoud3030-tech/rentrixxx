import { Link, useSearch } from '@tanstack/react-router';
import { ArrowRight, Printer, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatDate, formatMoney, formatShortId, getErrorMessage } from '@lib/format';
import { paymentMethodLabels } from '@lib/format';
import type { ReceiptRecord } from './receiptService';
import { useReceipt } from './useReceipts';

type ReceiptField = {
  label: string;
  value: string;
};

function valueOrDash(value: string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return value;
}

function getReceiptFields(receipt: ReceiptRecord): ReceiptField[] {
  return [
    { label: 'رقم الإيصال', value: receipt.receipt_number },
    { label: 'معرّف الدفع', value: formatShortId(receipt.payment_id) },
    { label: 'معرّف الفاتورة', value: formatShortId(receipt.invoice_id) },
    { label: 'تاريخ الدفع', value: formatDate(receipt.payment_date) },
    { label: 'طريقة الدفع', value: paymentMethodLabels[receipt.payment_method] ?? receipt.payment_method },
    { label: 'المبلغ', value: formatMoney(receipt.amount) },
    { label: 'المستأجر', value: valueOrDash(receipt.tenant_name) },
    { label: 'العقار', value: valueOrDash(receipt.property_title) },
    { label: 'الوحدة', value: valueOrDash(receipt.unit_number) },
    { label: 'المرجع', value: valueOrDash(receipt.reference_number) },
  ];
}

function ReceiptFieldGrid({ receipt }: Readonly<{ receipt: ReceiptRecord }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {getReceiptFields(receipt).map((field) => (
        <div key={field.label} className="rounded-2xl border border-border/70 bg-background/80 p-4 print:border-slate-300 print:bg-white">
          <p className="text-xs font-bold text-muted-foreground print:text-slate-500">{field.label}</p>
          <p className="mt-2 break-words text-base font-black text-foreground print:text-slate-950">{field.value}</p>
        </div>
      ))}
    </div>
  );
}

function ReceiptPrintDocument({ receipt }: Readonly<{ receipt: ReceiptRecord }>) {
  return (
    <Card className="mx-auto max-w-3xl overflow-hidden border-primary/10 bg-card print:border-0 print:shadow-none">
      <CardContent className="space-y-8 p-8 print:p-0">
        <header className="flex flex-col gap-5 border-b pb-6 print:border-slate-300">
          <div className="flex iteme-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-muted-foreground print:text-slate-500">{defaultCompanyLocalSettings.companyName}</p>
              <h1 className="mt-2 text-3xl font-black text-foreground print:text-slate-950">إيصال دفع</h1>
            </div>
            <div className="rounded-3xl bg-primary/10 p-4 text-primary print:border print:border-slate-300 print:bg-white print:text-slate-950">
              <ReceiptText className="size-8" />
            </div>
          </div>
          <div className="rounded-2xl bg-muted/40 p-4 print:border print:border-slate-300 print:bg-white">
            <p className="text-xs font-bold text-muted-foreground print:text-slate-500">Reference</p>
            <p className="mt-1 font-mono text-lg font-black tracking-wide text-foreground print:text-slate-950">{receipt.receipt_number}</p>
          </div>
        </header>

        <ReceiptFieldGrid receipt={receipt} />

        <footer className="border-t pt-5 text-sm leading-7 text-muted-foreground print:border-slate-300 print:text-slate-600">
          <p>تم إنشاء هذا العرض من بيانات الإيصال المتاحة في النظام. يمكن استخدام أمر الطباعة في المتصفح للحفظ كملف PDF عند الحاجة.</p>
        </footer>
      </CardContent>
    </Card>
  );
}

function ReceiptDetailContent({ receiptId }: Readonly<{ receiptId: string }>) {
  const receiptQuery = useReceipt(receiptId);

  if (receiptQuery.isLoading) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">جارٍ تحميل الإيصال...</CardContent></Card>;
  }

  if (receiptQuery.isError) {
    return <Card><CardContent className="p-6 text-center text-destructive">{getErrorMessage(receiptQuery.error, 'تعذر تحميل الإيصال')}</CardContent></Card>;
  }

  if (receiptQuery.data === undefined) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">الإيصال غير موجود.</CardContent></Card>;
  }

  return <ReceiptPrintDocument receipt={receiptQuery.data} />;
}

function getReceiptIdFromSearch(search: Record<string, unknown>) {
  const receiptId = search.receiptId;
  return typeof receiptId === 'string' ? receiptId : '';
}

export function ReceiptDetailPage() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const receiptId = getReceiptIdFromSearch(search);

  return (
    <div className="space-y-6 print:bg-white" dir="rtl">
      <div className="flex flex-wrap iteme-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-black text-primary">Receipt #{receiptId ? receiptId.slice(0, 8) : '—'}</p>
          <h2 className="text-3xl font-black">عرض إيصال الدفع</h2>
          <p className="text-sm text-muted-foreground">عرض جاهز للطباعة بدون إضافة اعتماد PDF جديد.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild><Link to="/financials"><ArrowRight className="me-2 size-4" />العودة للمالية</Link></Button>
          <Button onClick={() => globalThis.print()}><Printer className="me-2 size-4" />طباعة</Button>
        </div>
      </div>

      <ReceiptDetailContent receiptId={receiptId} />
    </div>
  );
}
