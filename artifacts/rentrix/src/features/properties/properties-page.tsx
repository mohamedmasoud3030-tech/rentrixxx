import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { useProperties } from '@/hooks/use-properties';

export function PropertiesPage() {
  const { data, isLoading, isError } = useProperties();

  if (isLoading) return <RouteLoadingState />;

  if (isError) {
    return <EmptyState title="تعذر تحميل العقارات" description="تحقق من اتصال Supabase وصلاحيات قاعدة البيانات ثم حاول مرة أخرى." />;
  }

  if (!data?.length) {
    return <EmptyState title="لا توجد عقارات بعد" description="ابدأ بإضافة أول عقار. سيتم تخزين البيانات في Supabase مع نسخة كاش محلية للأداء." action={<Button>إضافة عقار</Button>} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">سجل العقارات</h2>
          <p className="text-sm text-muted-foreground">قائمة جاهزة للتوسع مع ترقيم صفحات وفلاتر لاحقاً.</p>
        </div>
        <Button>إضافة عقار</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {data.map((property) => (
          <Card key={property.id}>
            <CardHeader>
              <CardTitle>{property.title}</CardTitle>
              <CardDescription>{property.address}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">النوع</span><span>{property.type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الحالة</span><span>{property.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">القيمة الحالية</span><span>{property.current_value ?? '—'}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
