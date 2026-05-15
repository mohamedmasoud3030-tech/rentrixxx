import { Link } from '@tanstack/react-router';
import { FileText, ReceiptText, Search, TriangleAlert, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TenantWorkspaceRow } from './tenantWorkspaceService';
import { useTenantWorkspace } from './useTenantWorkspace';

const pageSize = 10;
const tenantHeaders = ['الاسم', 'الهاتف', 'الإيميل', 'رقم الهوية', 'العقود النشطة', 'الوحدة/العقار', 'روابط آمنة'];

function valueOrDash(value: string | number | null | undefined) {
  return value || value === 0 ? String(value) : '—';
}

function ContactValue({ value, dir }: Readonly<{ value: string | null; dir?: 'ltr' | 'rtl' }>) {
  return <span dir={dir} className={dir === 'ltr' ? 'inline-block text-right' : undefined}>{valueOrDash(value)}</span>;
}

function TenantLocation({ tenant }: Readonly<{ tenant: TenantWorkspaceRow }>) {
  const title = tenant.propertyTitle ?? 'عقار غير محدد';
  const unit = tenant.unitNumber ? `وحدة ${tenant.unitNumber}` : 'وحدة غير محددة';
  return tenant.propertyTitle || tenant.unitNumber ? (
    <div className="space-y-1">
      <div className="font-bold">{title}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
    </div>
  ) : <span>—</span>;
}

function TenantSafeLinks({ tenant }: Readonly<{ tenant: TenantWorkspaceRow }>) {
  const hasLinks = tenant.primaryContractId || tenant.hasInvoices || tenant.hasArrears;
  if (!hasLinks) return <span className="text-sm text-muted-foreground">لا توجد روابط متاحة</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {tenant.primaryContractId ? (
        <Button variant="secondary" className="min-h-9 px-3" asChild>
          <Link to="/contracts/$contractId" params={{ contractId: tenant.primaryContractId }}><FileText className="ml-1 size-4" />العقد</Link>
        </Button>
      ) : null}
      {tenant.hasInvoices ? (
        <Button variant="secondary" className="min-h-9 px-3" asChild>
          <Link to="/invoices"><ReceiptText className="ml-1 size-4" />الفواتير</Link>
        </Button>
      ) : null}
      {tenant.hasArrears ? (
        <Button variant="secondary" className="min-h-9 px-3 text-amber-700" asChild>
          <Link to="/arrears"><TriangleAlert className="ml-1 size-4" />المتأخرات</Link>
        </Button>
      ) : null}
    </div>
  );
}

function TenantRows({ rows }: Readonly<{ rows: TenantWorkspaceRow[] }>) {
  return rows.map((tenant) => {
    const cells = [
      <div key="name"><div className="font-black">{tenant.person.full_name}</div><div className="text-xs text-muted-foreground">مستأجر</div></div>,
      <ContactValue key="phone" value={tenant.person.phone} dir="ltr" />,
      <ContactValue key="email" value={tenant.person.email} dir="ltr" />,
      <ContactValue key="national-id" value={tenant.person.national_id} />,
      valueOrDash(tenant.activeContractCount || null),
      <TenantLocation key="location" tenant={tenant} />,
      <TenantSafeLinks key="links" tenant={tenant} />,
    ];

    return <TableRow key={tenant.person.id}>{cells.map((cell, index) => <TableCell key={`${tenant.person.id}-${tenantHeaders[index]}`}>{cell}</TableCell>)}</TableRow>;
  });
}

function TenantTable({ rows }: Readonly<{ rows: TenantWorkspaceRow[] }>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow>{tenantHeaders.map((header) => <TableHead key={header} className={header === 'روابط آمنة' ? 'min-w-64' : undefined}>{header}</TableHead>)}</TableRow></TableHeader>
        <TableBody><TenantRows rows={rows} /></TableBody>
      </Table>
    </div>
  );
}

export function TenantsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ search, page, pageSize }), [page, search]);
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
            <Input className="pr-10" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="بحث باسم المستأجر أو الهاتف أو الإيميل أو رقم الهوية" />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {tenantsQuery.isLoading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}</div>
        ) : rows.length ? (
          <TenantTable rows={rows} />
        ) : (
          <div className="p-6"><EmptyState title="لا توجد سجلات مستأجرين" description="سيظهر هنا أي شخص مصنف كمستأجر من نموذج الأشخاص الحالي." /></div>
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
