import { Building2, Eye, UserRoundCog, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getOwnerActivePropertyCount, getOwnerDisplayName } from '../ownerService';
import type { OwnersHubState } from '../types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'تعذر تحميل مركز الملاك.';
}

export function OwnersHubView({ state }: Readonly<{ state: OwnersHubState }>) {
  if (state.status === 'loading') {
    return (
      <section className="space-y-4" aria-label="جار تحميل مركز الملاك">
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div>
        <Skeleton className="h-72 rounded-3xl" />
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <Card role="alert" className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>تعذر تحميل مركز الملاك</CardTitle>
          <CardDescription>{getErrorMessage(state.error)}</CardDescription>
        </CardHeader>
        <CardContent><Button type="button" onClick={() => globalThis.location.reload()}>إعادة المحاولة</Button></CardContent>
      </Card>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <Card role="alert">
        <CardHeader>
          <CardTitle>مركز الملاك غير متاح بأمان</CardTitle>
          <CardDescription>{state.reason}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { owners, properties } = state.snapshot;
  const activeOwners = owners.filter((owner) => owner.is_active).length;
  const linkedOwners = owners.filter((owner) => getOwnerActivePropertyCount(owner.id, properties) > 0).length;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-black text-primary">Owners & CRM</p>
        <h2 className="text-2xl font-black tracking-tight">مركز الملاك</h2>
        <p className="mt-1 text-sm font-bold text-muted-foreground">قراءة آمنة لملفات الملاك وعلاقات العقارات دون أرصدة أو تسويات مالية تخمينية.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between gap-4 pt-6"><div><p className="text-sm font-bold text-muted-foreground">إجمالي الملاك</p><p className="mt-2 text-3xl font-black">{owners.length.toLocaleString('ar')}</p></div><Users className="size-8 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between gap-4 pt-6"><div><p className="text-sm font-bold text-muted-foreground">ملاك نشطون</p><p className="mt-2 text-3xl font-black">{activeOwners.toLocaleString('ar')}</p></div><UserRoundCog className="size-8 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between gap-4 pt-6"><div><p className="text-sm font-bold text-muted-foreground">مرتبطون بعقارات</p><p className="mt-2 text-3xl font-black">{linkedOwners.toLocaleString('ar')}</p></div><Building2 className="size-8 text-primary" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>دليل الملاك</CardTitle>
          <CardDescription>تعرض هذه القائمة بيانات تعريفية وروابط عقارية موثقة فقط.</CardDescription>
        </CardHeader>
        <CardContent>
          {owners.length === 0 ? (
            <EmptyState title="لا يوجد ملاك" description="لم تُرجع القراءة الحالية أي سجلات ملاك عبر سياسات RLS." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>المالك</TableHead><TableHead>التواصل</TableHead><TableHead>العقارات المرتبطة</TableHead><TableHead>الحالة</TableHead><TableHead>عرض</TableHead></TableRow></TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-black">{getOwnerDisplayName(owner)}</TableCell>
                    <TableCell className="text-muted-foreground">{owner.phone || owner.email || 'غير موثق'}</TableCell>
                    <TableCell>{getOwnerActivePropertyCount(owner.id, properties).toLocaleString('ar')}</TableCell>
                    <TableCell>{owner.is_active ? 'نشط' : 'غير نشط'}</TableCell>
                    <TableCell><Button asChild variant="secondary"><a href={`/owners/${owner.id}`}><Eye className="ml-1 size-4" />تفاصيل</a></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
