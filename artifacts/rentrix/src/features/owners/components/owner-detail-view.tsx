import { ArrowRight, Building2, DoorOpen, FileText, UserRoundCog, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/features/financials/components/financials-formatters';
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

  const { owner, properties, units, contracts, financialSummary } = state.snapshot;
  const activeContractsCount = contracts.filter((contract) => contract.status === 'active').length;

  return (
    <section className="space-y-6">
      <Button asChild variant="ghost" className="gap-2"><a href="/owners"><ArrowRight className="size-4" />عودة إلى إدارة الملاك</a></Button>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm font-bold text-muted-foreground">العقارات</p><p className="text-3xl font-black">{properties.length.toLocaleString('ar')}</p></div><Building2 className="size-7 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm font-bold text-muted-foreground">الوحدات</p><p className="text-3xl font-black">{units.length.toLocaleString('ar')}</p></div><DoorOpen className="size-7 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm font-bold text-muted-foreground">العقود النشطة</p><p className="text-3xl font-black">{activeContractsCount.toLocaleString('ar')}</p><p className="text-xs text-muted-foreground">من أصل {contracts.length.toLocaleString('ar')} عقود</p></div><FileText className="size-7 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm font-bold text-muted-foreground">الرصيد المستحق</p><p className="text-2xl font-black" dir="ltr">{formatMoney(financialSummary.outstandingBalance)}</p><p className="text-xs text-muted-foreground">{financialSummary.outstandingInvoicesCount.toLocaleString('ar')} فواتير مفتوحة</p></div><WalletCards className="size-7 text-primary" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>العقارات المرتبطة</CardTitle><CardDescription>تظهر فقط العلاقات النشطة الموجودة في `property_owners` مع عدد الوحدات والعقود لكل عقار.</CardDescription></CardHeader>
        <CardContent>
          {properties.length === 0 ? <EmptyState title="لا توجد عقارات مرتبطة" description="لا توجد علاقة ملكية نشطة موثقة لهذا المالك." /> : (
            <Table><TableHeader><TableRow><TableHead>العقار</TableHead><TableHead>العنوان</TableHead><TableHead>نسبة الملكية</TableHead><TableHead>الوحدات</TableHead><TableHead>العقود النشطة</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader><TableBody>{properties.map((property) => {
              const ownershipPercentage = property.property_owners.find((link) => link.owner_id === owner.id && !link.ends_on)?.ownership_percentage ?? 100;
              const propertyUnitsCount = units.filter((unit) => unit.property_id === property.id).length;
              const propertyActiveContractsCount = contracts.filter((contract) => contract.property_id === property.id && contract.status === 'active').length;

              return (
                <TableRow key={property.id}>
                  <TableCell className="font-black">{property.title}</TableCell>
                  <TableCell>{property.address}</TableCell>
                  <TableCell>{ownershipPercentage.toLocaleString('ar')}%</TableCell>
                  <TableCell>{propertyUnitsCount.toLocaleString('ar')}</TableCell>
                  <TableCell>{propertyActiveContractsCount.toLocaleString('ar')}</TableCell>
                  <TableCell>{property.status}</TableCell>
                </TableRow>
              );
            })}</TableBody></Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
