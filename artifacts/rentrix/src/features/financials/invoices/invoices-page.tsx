import { Card, CardContent } from '@/components/ui/card';
import { InvoiceWorkspaceSection } from '../components/invoice-workspace-section';

const invoiceWorkspaceNotes = [
  'تصفية الفواتير والبحث من نفس مساحة العمل.',
  'تسجيل دفعة سريعة بعد اختيار الفاتورة.',
  'مراجعة الإيصالات الأخيرة دون مغادرة الصفحة.',
] as const;

export function InvoicesPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold text-muted-foreground">استعادة واجهة الفواتير</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">مساحة عمل الفواتير</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            واجهة تشغيلية موحدة لإدارة الفواتير والمدفوعات والإيصالات بالاعتماد على الخدمات الحالية فقط، دون أي ترحيل محاسبي أو احتسابات ملاك نهائية.
          </p>
        </div>
        <Card className="border-dashed bg-muted/25">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-black">ما الذي يمكنك فعله هنا؟</p>
            <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
              {invoiceWorkspaceNotes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <InvoiceWorkspaceSection />
    </div>
  );
}
