import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverdueInvoiceReportRow } from '@/features/financials/reports/financialReportsService';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { formatCompanyDate, formatCompanyMoney } from '@lib/format';

const maxOverdueTenantRows = 5;
export type OverdueTenantRow = { invoiceId: string; tenantName: string; location: string; dueDate: string; daysOverdue: number; remainingAmount: number };

function getInvoiceLocation(row: OverdueInvoiceReportRow) { const propertyTitle = row.propertyTitle ?? 'عقار غير محدد'; return row.unitNumber ? `${propertyTitle} / وحدة ${row.unitNumber}` : propertyTitle; }

export function buildOverdueTenantRows(rows: OverdueInvoiceReportRow[] | undefined): OverdueTenantRow[] {
  return (rows ?? []).map((row) => ({ invoiceId: row.invoiceId, tenantName: row.tenantName ?? 'مستأجر غير محدد', location: getInvoiceLocation(row), dueDate: row.dueDate, daysOverdue: row.daysOverdue, remainingAmount: row.remainingAmount })).sort((a, b) => b.remainingAmount - a.remainingAmount || b.daysOverdue - a.daysOverdue).slice(0, maxOverdueTenantRows);
}

export function OverdueTenantsTable({ rows, isLoading, settings }: Readonly<{ rows: OverdueTenantRow[]; isLoading: boolean; settings: CompanySettingsContract }>) {
  const isLoaded = !isLoading;
  return <Card><CardHeader><CardTitle>مستأجرون متأخرون</CardTitle><CardDescription>أعلى فواتير متأخرة من مسار تقارير المتأخرات الحالي.</CardDescription></CardHeader><CardContent>{isLoading ? <Skeleton className="h-64 w-full" /> : null}{isLoaded && rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-bold text-muted-foreground">لا توجد فواتير متأخرة للعرض.</div> : null}{isLoaded && rows.length > 0 ? <div className="space-y-3">{rows.map((row) => <div key={row.invoiceId} className="rounded-2xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{row.tenantName}</p><p className="mt-1 text-sm font-bold text-muted-foreground">{row.location}</p></div><StatusBadge tone={row.daysOverdue > 90 ? 'red' : 'gold'}>{row.daysOverdue} يوم</StatusBadge></div><div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm font-bold text-muted-foreground">متبقي منذ {formatCompanyDate(settings, `${row.dueDate}T00:00:00`)}</span><span className="font-black" dir="ltr">{formatCompanyMoney(settings, row.remainingAmount)}</span></div></div>)}<Button asChild variant="secondary" className="w-full"><Link to="/arrears">فتح المتأخرات</Link></Button></div> : null}</CardContent></Card>;
}
