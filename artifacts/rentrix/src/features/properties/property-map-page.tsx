import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProperties } from './use-properties';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function PropertyMapPage() {
  const propertiesQuery = useProperties({ search: '', status: 'all', page: 1, pageSize: 1000 });
  const [cityFilter, setCityFilter] = useState('');

  if (propertiesQuery.isLoading) return <div dir="rtl" className="space-y-2"><p>جارٍ تحميل العقارات...</p></div>;
  if (propertiesQuery.isError) return <EmptyState title="تعذر تحميل العقارات" description="تعذر تجهيز عرض الخريطة. حاول إعادة المحاولة." />;

  const rows = propertiesQuery.data?.rows ?? [];
  if (!rows.length) return <EmptyState title="لا توجد عقارات" description="أضف عقارات أولاً لعرضها في خريطة العقارات." />;

  const filtered = useMemo(() => rows.filter((r) => !cityFilter || r.address.toLowerCase().includes(cityFilter.toLowerCase())), [rows, cityFilter]);
  const withCoords = filtered.filter((p: any) => p.latitude != null && p.longitude != null);
  const withoutCoords = filtered.filter((p: any) => p.latitude == null || p.longitude == null);
  const center: [number, number] = withCoords.length ? [withCoords[0].latitude as number, withCoords[0].longitude as number] : [23.588, 58.3829];

  return <div className="space-y-4" dir="rtl">
    <h2 className="text-2xl font-black">خريطة العقارات</h2>
    <Input placeholder="تصفية بالمدينة/العنوان" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />

    <Card>
      <CardContent className="p-0">
        <MapContainer center={center} zoom={11} style={{ height: 420, width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {withCoords.map((property: any) => (
            <Marker key={property.id} position={[property.latitude, property.longitude]}>
              <Popup>
                <div className="space-y-1" dir="rtl">
                  <p className="font-black">{property.title}</p>
                  <p>{property.address}</p>
                  <p className="text-xs">{property.type} • {property.status}</p>
                  <Link to="/properties/$propertyId" params={{ propertyId: property.id }} className="text-primary underline">فتح تفاصيل العقار</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>عقارات بدون إحداثيات</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {withoutCoords.length === 0 ? <p className="text-sm text-muted-foreground">كل العقارات تحتوي على إحداثيات.</p> : withoutCoords.map((p: any) => <div key={p.id} className="rounded border p-2"><p className="font-bold">{p.title}</p><p className="text-xs text-muted-foreground">{p.address}</p></div>)}
      </CardContent>
    </Card>
  </div>;
}

export default PropertyMapPage;
