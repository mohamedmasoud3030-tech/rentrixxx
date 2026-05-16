import { Link } from '@tanstack/react-router';
import { FileText, Mail, Phone, ReceiptText, Search, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { TenantWorkspaceRow } from './tenantWorkspaceService';
import { useTenantWorkspace } from './useTenantWorkspace';

const pageSize = 10;

function valueOrDash(value: string | number | null | undefined) {
  return value || value === 0 ? String(value) : '—';
}

function InfoPill({ icon: Icon, label, value, dir }: Readonly<{ icon: typeof Phone; label: string; value: string | number | null | undefined; dir?: 'ltr' | 'rtl' }>) {
  return (
    <div className="rounded-2xl border bg-background px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-black" dir={dir}>{valueOrDash(value)}</p>
    </div>
  );
}

function TenantLocation({ tenant }: Readonly<{ tenant: TenantWorkspaceRow }>) {
  const hasLocation = tenant.propertyTitle !== null || tenant.unitNumber !== null;
  return (
    <div className="rounded-2xl border bg-muted/30 p-3">
      <p className="text-xs font-bold text-muted-foreground">الوحدة/العقار</p>
      <p className="mt-1 font-black">{hasLocation ? tenant.propertyTitle ?? 'عقار غير محدد' : '—'}</p>
      {hasLocation ? <p className="text-xs text-muted-foreground">{tenant.unitNumber ? `وحدة ${tenant.unitNumber}` : 'وحدة غير محددة'}</p> : null}
    </div>
  );
}

function TenantSafeLinks({ tenant }: Readonly<{ tenant: TenantWorkspaceRow }>) {
  const hasLinks = tenant.primaryContractId !== null || tenant.hasInvoices || tenant.hasArrears;
  if (hasLinks) {
    return (
      <div className="flex flex-wrap gap-2">
        {tenant.primaryContractId !== null ? (
          <Button variant="secondary" className="min-h-9 px-3" asChild>
            <Link to="/contracts/$contractId" params={{ contractId: tenant.primaryContractId }}><FileText className="ml-1 size-4" />العقد</Link>
          </Button>
        ) : null}
        {tenant.hasInvoices ? <Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/invoices"><ReceiptText className="ml-1 size-4" />الفواتير</Link></Button> : null}
        {tenant.hasArrears ? <Button variant="secondary" className="min-h-9 px-3 text-amber-700" asChild><Link to="/arrears"><TriangleAlert className="ml-1 size-4" />المتأخرات</Link></Button> : null}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">لا توجد روابط متاحة حتى الآن</p>;
}

function TenantCard({ tenant }: Readonly<{ tenant: TenantWorkspaceRow }>) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black text-primary">مستأجر</p>
            <h3 className="mt-1 text-xl font-black">{tenant.person.full_name}</h3>
          </div>
          <div className="rounded-full border bg-card px-3 py-1 text-xs font-black text-muted-foreground">
            عقود نشطة: <span className="text-foreground">{tenant.activeContractCount}</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <InfoPill icon={Phone} label="الهاتف" value={tenant.person.phone} dir="ltr" />
          <InfoPill icon={Mail} label="الإيميل" value={tenant.person.email} dir="ltr" />
          <InfoPill icon={ShieldCheck} label="رقم الهوية" value={tenant.person.national_id} />
        </div>

        <TenantLocation tenant={tenant} />

        <div className="rounded-2xl border border-dashed p-3">
          <p className="mb-2 text-xs font-bold text-muted-foreground">روابط آمنة</p>
          <TenantSafeLinks tenant={tenant} />
        </div>
      </CardContent>
    </Card>
  );
}

function TenantsList({ rows }: Readonly<{ rows: TenantWorkspaceRow[] }>) {
  return <div className="grid gap-4">{rows.map((tenant) => <TenantCard key={tenant.person.id} tenant={tenant} />)}</div>;
}

export function TenantsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ search, page, pageSize }), [page, search]);
  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1);
  }, []);
  const tenantsQuery = useTenantWorkspace(params);
  const rows = tenantsQuery.data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((tenantsQuery.data?.count ?? 0) / pageSize));

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-l from-primary/10 via-background to-background">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary"><Users className="size-4" />مساحة عمل مسترجعة</div>
            <div>
              <h2 className="text-2xl font-black">المستأجرين</h2>
              <p className="text-sm text-muted-foreground">عرض مستقل للمستأجرين مبني بأمان على بيانات الأشخاص والعقود والفواتير الحالية.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-muted-foreground">
            إجمالي النتائج: <span className="text-foreground">{tenantsQuery.data?.count ?? 0}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pr-10" value={search} onChange={handleSearchChange} placeholder="بحث باسم المستأجر أو الهاتف أو الإيميل أو رقم الهوية" />
          </div>
        </CardContent>
      </Card>

      {tenantsQuery.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-48" />)}</div>
      ) : rows.length > 0 ? (
        <TenantsList rows={rows} />
      ) : (
        <Card><CardContent className="p-6"><EmptyState title="لا توجد سجلات مستأجرين" description="سيظهر هنا أي شخص مصنف كمستأجر من نموذج الأشخاص الحالي." /></CardContent></Card>
      )}

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
