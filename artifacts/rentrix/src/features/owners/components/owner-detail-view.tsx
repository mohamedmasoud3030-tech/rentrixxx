import { ArrowRight, Building2, DoorOpen, FileText, UserRoundCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getOwnerDisplayName } from '../ownerService';
import type { OwnerDetailState } from '../types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'تعذر تحميل ملف المالك.';
}

export function OwnerDetailView({ state }: Readonly<{ state: OwnerDetailState }>) {
  if (state.status === 'loading') {
    return <section aria-label="جار تحميل ملف المالك" className="space-y-4"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></section>;
  }

  if (state.status === 'error') {
    return <Card role="alert" className="border-destructive/30 bg-destructive/5"><CardHeader><CardTitle>تعذر تحميل ملف المالك</CardTitle><CardDescription>{getErrorMessage(state.error)}</CardDescription></CardHeader><CardContent><Button type="button" onClick={() => globalThis.location.reload()}>إعادة المحاولة</Button></CardContent></Card>;
  }

  if (state.status === 'unavailable') {
    return <Card role="alert"><CardHeader><CardTitle>ملف المالك غير متاح بأمان</CardTitle><CardDescription>{state.reason}</CardDescription></CardHeader></Card>;
  }

  const { owner, properties, units, contracts } = state.snapshot;

  return (
    <section className="space-y-6">
      <Button asChild variant="ghost" className="gap-2"><a href="/owners-hub"><ArrowRight className="size-4" />عودة إلى مركز الملاك</a></Button>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRoundCog className="size-6" /></div>
          <div><CardTitle>{getOwnerDisplayName(owner)}</CardTitle><CardDescription>ملف تعريف قراءة فقط للمالك، دون أرصدة مالية أو إجراءات تسوية.</CardDescription></div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div><p className="text-xs font-bold text-muted-foreground">الهاتف</p><p className="font-black">{owner.phone || 'غير موثق'}</p></div>
          <div><p className="text-xs font-bold text-muted-foreground">البريد الإلكتروني</p><p className="font-black">{owner.email || 'غير موثق'}</p></div>
          <div><p className="text-xs font-bold text-muted-foreground">الحالة</p><p className="font-black">{owner.is_active ? 'نشط' : 'غير نشط'}</p></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm font-bold text-muted-foreground">العقارات</p><p className="text-3xl font-black">{properties.length.toLocaleString('ar')}</p></div><Building2 className="size-7 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm font-bold text-muted-foreground">الوحدات</p><p className="text-3xl font-black">{units.length.toLocaleString('ar')}</p></div><DoorOpen className="size-7 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm font-bold text-muted-foreground">العقود</p><p className="text-3xl font-black">{contracts.length.toLocaleString('ar')}</p></div><FileText className="size-7 text-primary" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>العقارات المرتبطة</CardTitle><CardDescription>تظهر فقط العلاقات النشطة الموجودة في `property_owners`.</CardDescription></CardHeader>
        <CardContent>
          {properties.length === 0 ? <EmptyState title="لا توجد عقارات مرتبطة" description="لا توجد علاقة ملكية نشطة موثقة لهذا المالك." /> : (
            <Table><TableHeader><TableRow><TableHead>العقار</TableHead><TableHead>العنوان</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader><TableBody>{properties.map((property) => <TableRow key={property.id}><TableCell className="font-black">{property.title}</TableCell><TableCell>{property.address}</TableCell><TableCell>{property.status}</TableCell></TableRow>)}</TableBody></Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
