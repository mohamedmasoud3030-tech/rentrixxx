import { MapPinned, Ruler, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';

const landsCapabilities = [
  { title: 'بيانات الأرض', description: 'مساحة، موقع، حالة تشغيلية، وملاحظات عامة عند توفر نموذج البيانات.', icon: Ruler },
  { title: 'ربط مستقبلي بالعقارات', description: 'الربط سيبقى مؤجلاً حتى اعتماد schema واضح للعقارات/الأراضي.', icon: MapPinned },
  { title: 'استعادة آمنة', description: 'هذه الواجهة لا تضيف جداول أو خدمات جديدة ولا تحفظ بيانات تجريبية.', icon: ShieldCheck },
] as const;

export function LandsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary">قيد الاسترجاع</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">الأراضي</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              صفحة تشغيلية مؤقتة لاسترجاع وحدة الأراضي من النسخ القديمة تدريجياً، مع إبقاء قاعدة البيانات والخدمات الحالية كما هي.
            </p>
          </div>
          <StatusBadge tone="gray">واجهة فقط</StatusBadge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {landsCapabilities.map((item) => {
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
            title="لم يتم توصيل نموذج بيانات الأراضي بعد"
            description="سيتم تفعيل الإدخال والقوائم بعد اعتماد schema واضح للأراضي وربطه بالخدمات الحالية بدون إنشاء بيانات وهمية."
          />
        </CardContent>
      </Card>
    </div>
  );
}
