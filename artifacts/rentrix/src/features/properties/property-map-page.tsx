import { EmptyState } from '@/components/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { useProperties } from './use-properties';

export function PropertyMapPage() {
  const propertiesQuery = useProperties({ search: '', status: 'all', page: 1, pageSize: 1000 });

  if (propertiesQuery.isLoading) return <div dir="rtl" className="space-y-2"><p>جارٍ تحميل العقارات...</p></div>;
  if (propertiesQuery.isError) return <EmptyState title="تعذر تحميل العقارات" description="تعذر تجهيز عرض الخريطة. حاول إعادة المحاولة." />;

  const rows = propertiesQuery.data?.rows ?? [];
  const getCoords = (property: (typeof rows)[number]) => {
    const maybe = property as { latitude?: number | null; longitude?: number | null };
    return { latitude: maybe.latitude ?? null, longitude: maybe.longitude ?? null };
  };
  if (!rows.length) return <EmptyState title="لا توجد عقارات" description="أضف عقارات أولاً لعرضها في خريطة العقارات." />;

  return <div className="space-y-4" dir="rtl">
    <h2 className="text-xl font-black">خريطة العقارات (MVP)</h2>
    <p className="text-sm text-muted-foreground">عرض خفيف بدون مكتبات خرائط إضافية. يتم إظهار حالة الإحداثيات لكل عقار.</p>
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((property) => {
        const { latitude, longitude } = getCoords(property);
        return <Card key={property.id}><CardContent className="p-4 space-y-1"><p className="font-black">{property.title}</p><p className="text-sm text-muted-foreground">{property.address}</p><p className="text-xs">{latitude != null && longitude != null ? `(${latitude}, ${longitude})` : 'لا توجد إحداثيات موقع لهذا العقار'}</p></CardContent></Card>;
      })}
    </div>
  </div>;
}

export default PropertyMapPage;
