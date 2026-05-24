import { FileWarning, ReceiptText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';

const accountingCapabilities = [
  {
    title: 'الفواتير والمدفوعات هي المصدر الحالي',
    description: 'التشغيل المالي المعتمد الآن يمر عبر وحدات الفواتير والمدفوعات فقط ضمن التدفق الأساسي المعتمد.',
    icon: ReceiptText,
  },
  {
    title: 'لا قيود محاسبية الآن',
    description: 'إدخالات اليومية، دفتر الأستاذ، وكشوف المالكين والتحويلات معلّقة عمداً حتى اعتماد schema وقواعد العمل.',
    icon: FileWarning,
  },
  {
    title: 'جاهز للاسترجاع لاحقاً',
    description: 'واجهة آمنة تمهيدية بدون أي حسابات متقدمة أو ربط محرك محاسبة، لتسهيل التفعيل المنضبط لاحقاً.',
    icon: RefreshCw,
  },
] as const;

export function AccountingPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary">قيد الاسترجاع</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">المحاسبة</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              تم إبقاء هذه الصفحة كواجهة تشغيلية آمنة فقط. دفتر الأستاذ، قيود اليومية، كشوف المالكين،
              مدفوعات الاستحقاق، والحسابات المتقدمة معطّلة عمداً حتى اعتماد schema نهائي وقواعد أعمال واضحة.
            </p>
          </div>
          <StatusBadge tone="gray">مؤجل بأمان</StatusBadge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {accountingCapabilities.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <Card className="border-dashed bg-muted/25">
        <CardContent className="p-5">
          <EmptyState
            compact
            title="لا يوجد محرك محاسبي متصل حتى الآن"
            description="سيتم تفعيل وظائف المحاسبة فقط بعد اعتماد مخطط البيانات وقواعد الترحيل رسمياً، بدون بيانات وهمية أو خدمات بديلة."
          />
        </CardContent>
      </Card>
    </div>
  );
}
