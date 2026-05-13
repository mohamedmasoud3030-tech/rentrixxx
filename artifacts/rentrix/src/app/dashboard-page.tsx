import { Building2, FileText, ReceiptText, WalletCards } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const cards = [
  { title: 'العقارات', value: '—', icon: Building2, description: 'مصدر الحقيقة: Supabase' },
  { title: 'العقود النشطة', value: '—', icon: FileText, description: 'جاهز لربط البيانات' },
  { title: 'الفواتير المستحقة', value: '—', icon: ReceiptText, description: 'مع كاش محلي' },
  { title: 'التدفق النقدي', value: '—', icon: WalletCards, description: 'مرحلة تأسيسية' },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-bold text-primary">نظام سطح مكتب · مكتب عقاري واحد</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight">بنية Rentrix الجديدة موحدة وآمنة وجاهزة للتوسع المرحلي.</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Supabase هو مصدر الحقيقة الوحيد، وDexie طبقة كاش ومزامنة مؤقتة فقط. جميع المستخدمين المصادقين مديرون.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
                <Icon className="size-5 text-primary" />
              </CardHeader>
              <CardContent><p className="text-3xl font-black">{card.value}</p></CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
