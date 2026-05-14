import { Link } from '@tanstack/react-router';
import { Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyMoney } from '@/lib/companyFormatters';
import { propertyStatusLabels, propertyStatusValues } from './property-schema';
import { useProperties, useSoftDeleteProperty } from './use-properties';
import type { PropertyStatusFilter } from './property-service';

const pageSize = 10;
const propertyStatusTone = { active: 'green', inactive: 'gray', maintenance: 'gold', sold: 'blue' } as const;

function money(value: number | null) {
  if (value === null) return '—';
  return formatCompanyMoney(defaultCompanyLocalSettings, value);
}

export function PropertiesListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PropertyStatusFilter>('all');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ search, status, page, pageSize }), [page, search, status]);
  const propertiesQuery = useProperties(params);
  const deleteMutation = useSoftDeleteProperty();
  const totalPages = Math.max(1, Math.ceil((propertiesQuery.data?.count ?? 0) / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">العقارات</h2>
          <p className="text-sm text-muted-foreground">إدارة العقارات كمصدر بيانات أساسي في Supabase.</p>
        </div>
        <Button asChild><Link to="/properties/new"><Plus className="ml-2 size-4" />إضافة عقار</Link></Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_14rem]">
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="بحث بالاسم أو العنوان أو المالك" />
          <Select value={status} onChange={(event) => { setStatus(event.target.value as PropertyStatusFilter); setPage(1); }}>
            <option value="all">كل الحالات</option>
            {propertyStatusValues.map((item) => <option key={item} value={item}>{propertyStatusLabels[item]}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {propertiesQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}
          </div>
        ) : propertiesQuery.data?.rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العقار</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المالك</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>القيمة الحالية</TableHead>
                  <TableHead className="w-52">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propertiesQuery.data.rows.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div className="font-black">{property.title}</div>
                      <div className="text-xs text-muted-foreground">{property.address}</div>
                    </TableCell>
                    <TableCell>{property.type}</TableCell>
                    <TableCell>{property.owner_name ?? '—'}</TableCell>
                    <TableCell><StatusBadge tone={propertyStatusTone[property.status]}>{propertyStatusLabels[property.status]}</StatusBadge></TableCell>
                    <TableCell dir="ltr" className="font-bold">{money(property.current_value)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/properties/$propertyId" params={{ propertyId: property.id }}><Eye className="size-4" /></Link></Button>
                        <Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/properties/$propertyId/edit" params={{ propertyId: property.id }}><Edit className="size-4" /></Link></Button>
                        <Button variant="danger" className="min-h-9 px-3" onClick={() => { if (window.confirm('هل أنت متأكد من الأرشفة؟')) void deleteMutation.mutate(property.id); }} disabled={deleteMutation.isPending}><Trash2 className="size-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-6"><EmptyState title="لا توجد عقارات" description="غيّر الفلاتر أو أضف أول عقار في النظام." action={<Button asChild><Link to="/properties/new">إضافة عقار</Link></Button>} /></div>
        )}
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>الصفحة {page} من {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>السابق</Button>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>التالي</Button>
        </div>
      </div>
    </div>
  );
}
