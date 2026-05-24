import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProperties } from './use-properties';

type MapProperty = {
  id: string;
  title: string;
  address: string;
  type: string | null;
  status: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function hasCoordinates(property: MapProperty): property is MapProperty & { latitude: number; longitude: number } {
  return typeof property.latitude === 'number' && typeof property.longitude === 'number';
}

export function PropertyMapPage() {
  const propertiesQuery = useProperties({ search: '', status: 'all', page: 1, pageSize: 1000 });
  const [cityFilter, setCityFilter] = useState('');

  const allRows = (propertiesQuery.data?.rows ?? []) as MapProperty[];
  const filtered = useMemo(() => {
    const term = cityFilter.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter((property) => property.address.toLowerCase().includes(term) || property.title.toLowerCase().includes(term));
  }, [allRows, cityFilter]);
  const withCoords = useMemo(() => filtered.filter(hasCoordinates), [filtered]);
  const withoutCoords = useMemo(() => filtered.filter((property) => !hasCoordinates(property)), [filtered]);
  const center: [number, number] = withCoords.length ? [withCoords[0].latitude, withCoords[0].longitude] : [23.588, 58.3829];

  if (propertiesQuery.isLoading) return <div dir="rtl" className="space-y-2"><p>جارٍ تحميل العقارات...</p></div>;
  if (propertiesQuery.isError) return <EmptyState title="تعذر تحميل العقارات" description="تعذر تجهيز عرض الخريطة. حاول إعادة المحاولة." />;
  if (!allRows.length) return <EmptyState title="لا توجد عقارات" description="أضف عقارات أولاً لعرضها في خريطة العقارات." />;

  return <div className="space-y-4" dir="rtl">
    <h2 className="text-2xl font-black">خريطة العقارات</h2>
    <Input placeholder="تصفية بالاسم أو العنوان" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} />

    <Card>
      <CardContent className="p-0">
        {withCoords.length ? (
          <MapContainer center={center} zoom={11} style={{ height: 420, width: '100%' }}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {withCoords.map((property) => (
              <Marker key={property.id} position={[property.latitude, property.longitude]}>
                <Popup>
                  <div className="space-y-1" dir="rtl">
                    <p className="font-black">{property.title}</p>
                    <p>{property.address}</p>
                    <p className="text-xs">{property.type ?? '-'} • {property.status ?? '-'}</p>
                    <Link to="/properties/$propertyId" params={{ propertyId: property.id }} className="text-primary underline">فتح تفاصيل العقار</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="p-5"><EmptyState compact title="لا توجد إحداثيات قابلة للعرض" description="أضف خط العرض وخط الطول للعقارات حتى تظهر على الخريطة." /></div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>عقارات بدون إحداثيات</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {withoutCoords.length === 0 ? <p className="text-sm text-muted-foreground">كل العقارات المعروضة تحتوي على إحداثيات.</p> : withoutCoords.map((property) => <div key={property.id} className="rounded border p-2"><p className="font-bold">{property.title}</p><p className="text-xs text-muted-foreground">{property.address}</p></div>)}
      </CardContent>
    </Card>
  </div>;
}

export default PropertyMapPage;
