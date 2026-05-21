import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { formatCompanyDate } from '@lib/format';
import type { ContractListItem } from '@/features/contracts/services/contractService';

const dashboardWindowDays = 30;
const maxExpiringContracts = 5;

export type ExpiringContractRow = { id: string; contractNumber: string; tenantName: string; location: string; endDate: string; daysRemaining: number };

function toDateInputValue(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function addDays(date: Date, days: number) { const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + days); return nextDate; }
function calculateDaysRemaining(endDate: string, today: Date) { const todayTimestamp = Date.parse(`${toDateInputValue(today)}T00:00:00.000Z`); const endTimestamp = Date.parse(`${endDate}T00:00:00.000Z`); if (!Number.isFinite(todayTimestamp) || !Number.isFinite(endTimestamp)) return 0; return Math.max(0, Math.ceil((endTimestamp - todayTimestamp) / (24 * 60 * 60 * 1000))); }
function getContractLocation(contract: ContractListItem) { const propertyTitle = contract.properties?.title ?? 'عقار غير محدد'; const unitNumber = contract.units?.unit_number; return unitNumber ? `${propertyTitle} / وحدة ${unitNumber}` : propertyTitle; }

export function buildExpiringContracts(contracts: ContractListItem[] | undefined, today: Date): ExpiringContractRow[] {
  const todayValue = toDateInputValue(today);
  const windowEnd = toDateInputValue(addDays(today, dashboardWindowDays));
  return (contracts ?? []).filter((c) => c.end_date >= todayValue && c.end_date <= windowEnd).map((c) => ({ id: c.id, contractNumber: c.id.slice(0, 8), tenantName: c.people?.full_name ?? 'مستأجر غير محدد', location: getContractLocation(c), endDate: c.end_date, daysRemaining: calculateDaysRemaining(c.end_date, today) })).sort((a, b) => a.daysRemaining - b.daysRemaining || a.contractNumber.localeCompare(b.contractNumber, 'ar')).slice(0, maxExpiringContracts);
}

export function ExpiringContractsTable({ rows, isLoading, settings }: Readonly<{ rows: ExpiringContractRow[]; isLoading: boolean; settings: CompanySettingsContract }>) {
  const isLoaded = !isLoading;
  return <Card className="xl:col-span-2"><CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle>العقود التي تنتهي قريبًا</CardTitle><CardDescription>عقود نشطة ينتهي تاريخها خلال {dashboardWindowDays} يومًا.</CardDescription></div><StatusBadge tone="gold">{rows.length} عقود</StatusBadge></CardHeader><CardContent>{isLoading ? <Skeleton className="h-52 w-full" /> : null}{isLoaded && rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-bold text-muted-foreground">لا توجد عقود نشطة تنتهي خلال 30 يومًا.</div> : null}{isLoaded && rows.length > 0 ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>رقم العقد</TableHead><TableHead>اسم المستأجر</TableHead><TableHead>الوحدة/العقار</TableHead><TableHead>تاريخ النهاية</TableHead><TableHead>الأيام المتبقية</TableHead><TableHead>التفاصيل</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-black" dir="ltr">#{row.contractNumber}</TableCell><TableCell>{row.tenantName}</TableCell><TableCell>{row.location}</TableCell><TableCell>{formatCompanyDate(settings, `${row.endDate}T00:00:00`)}</TableCell><TableCell><StatusBadge tone={row.daysRemaining <= 7 ? 'red' : 'gold'}>{row.daysRemaining} يوم</StatusBadge></TableCell><TableCell><Button asChild variant="secondary" className="min-h-9 px-3"><Link to="/contracts/$contractId" params={{ contractId: row.id }}>فتح<ArrowLeft className="ms-2 size-4" /></Link></Button></TableCell></TableRow>)}</TableBody></Table></div> : null}</CardContent></Card>;
}
