import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/format';
import { useArchiveLand, useCreateLand, useLands, useUpdateLand } from './use-lands';

export function LandsPage() {
  const [search, setSearch] = useState('');
  const { data, isError, error } = useLands(search);
  const create = useCreateLand();
  const update = useUpdateLand();
  const archive = useArchiveLand();
  const [form, setForm] = useState({ title: '', address: '', city: '', area: '', area_unit: 'sqm', ownership_status: 'owned', zoning_type: '', value_amount: '', latitude: '', longitude: '', notes: '', status: 'active' });

  return <div className="space-y-6" dir="rtl">
    <h2 className="text-3xl font-black">الأراضي</h2>
    <Card><CardHeader><CardTitle>إضافة أرض</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="الاسم" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
        <Input placeholder="العنوان" value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} />
        <Input placeholder="المدينة" value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} />
        <Input type="number" min="0" placeholder="المساحة" value={form.area} onChange={(e) => setForm((s) => ({ ...s, area: e.target.value }))} />
        <Input placeholder="وحدة المساحة" value={form.area_unit} onChange={(e) => setForm((s) => ({ ...s, area_unit: e.target.value }))} />
        <select className="h-10 rounded-md border px-3" value={form.ownership_status} onChange={(e) => setForm((s) => ({ ...s, ownership_status: e.target.value }))}><option value="owned">owned</option><option value="leased">leased</option><option value="disputed">disputed</option><option value="other">other</option></select>
        <Input placeholder="التصنيف" value={form.zoning_type} onChange={(e) => setForm((s) => ({ ...s, zoning_type: e.target.value }))} />
        <Input type="number" min="0" placeholder="القيمة" value={form.value_amount} onChange={(e) => setForm((s) => ({ ...s, value_amount: e.target.value }))} />
        <Input type="number" placeholder="خط العرض" value={form.latitude} onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))} />
        <Input type="number" placeholder="خط الطول" value={form.longitude} onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))} />
        <Input placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
        <Button onClick={() => create.mutate({ title: form.title, address: form.address || null, city: form.city || null, area: form.area ? Number(form.area) : null, area_unit: form.area_unit, ownership_status: form.ownership_status as any, zoning_type: form.zoning_type || null, value_amount: form.value_amount ? Number(form.value_amount) : null, latitude: form.latitude ? Number(form.latitude) : null, longitude: form.longitude ? Number(form.longitude) : null, notes: form.notes || null, status: form.status as any })}>حفظ</Button>
      </div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>قائمة الأراضي</CardTitle></CardHeader><CardContent className="space-y-3">
      <Input placeholder="بحث" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Table><TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>المدينة</TableHead><TableHead>المساحة</TableHead><TableHead>الحالة</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader><TableBody>{(data ?? []).map((l: any) => <TableRow key={l.id}><TableCell>{l.title}</TableCell><TableCell>{l.city ?? '-'}</TableCell><TableCell>{l.area ?? '-'} {l.area_unit}</TableCell><TableCell>{l.status}</TableCell><TableCell><div className="flex gap-2"><Button variant="secondary" onClick={() => update.mutate({ id: l.id, payload: { status: l.status === 'active' ? 'inactive' : 'active' } })}>تبديل</Button><Button variant="secondary" onClick={() => archive.mutate(l.id)}>أرشفة</Button></div></TableCell></TableRow>)}</TableBody></Table>
    </CardContent></Card>

    {isError ? <p className="text-sm text-destructive">{getErrorMessage(error, 'تعذر تحميل الأراضي')}</p> : null}
  </div>;
}
