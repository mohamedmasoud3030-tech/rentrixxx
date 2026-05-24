import { Calculator, FileWarning, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';

const commissionCapabilities = [
  { title: 'تعريف العمولة', description: 'واجهة تمهيدية فقط لحين اعتماد مصدر البيانات وقواعد احتساب العمولات.', icon: Calculator },
  { title: 'لا احتساب مالي الآن', description: 'لا يتم احتساب ربح المكتب أو مستحقات المالك أو أي قيود محاسبية من هذه الصفحة.', icon: FileWarning },
  { title: 'استعادة آمنة', description: 'لا تضيف هذه الصفحة جداول أو خدمات أو بيانات وهمية، وتبقى منفصلة عن ledger.', icon: ShieldCheck },
] as const;

export function CommissionsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary">قيد الاسترجاع</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">العمولات</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              صفحة تشغيلية مؤقتة لاسترجاع واجهة العمولات من النسخ القديمة تدريجياً، مع تعطيل أي احتساب مالي أو ترحيل محاسبي حتى اعتماد نموذج البيانات.
            </p>
          </div>
          <StatusBadge tone="gray">واجهة فقط</StatusBadge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {commissionCapabilities.map((item) => {
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
            title="لم يتم توصيل محرك العمولات بعد"
            description="سيتم تفعيل القوائم والإجراءات فقط بعد اعتماد schema وخدمة آمنة للعمولات بدون ربط تلقائي بالمحاسبة أو مستحقات الملاك."
          />
        </CardContent>
      </Card>
    </div>
  );
}
