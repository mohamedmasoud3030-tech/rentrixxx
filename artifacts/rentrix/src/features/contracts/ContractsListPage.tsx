import { Link } from '@tanstack/react-router';
import { AlertTriangle, CheckSquare, ChevronDown, ChevronUp, Download, Edit, Eye, Plus, Search, Square, Trash2 } from 'lucide-react';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/empty-state';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { documentEngine } from '@/services/documents/documentEngine';
import { formatContractDate, formatContractMoney, getContractRemainingDays, parseContractDisplayDate } from '@lib/format';
import { useCompanySettingsContract } from '../settings/useCompanySettings';
import { contractStatusLabels, contractStatusTone, contractStatusValues, paymentCycleLabels, type RenewalPayload } from './contractSchema';
import { getContractNumber } from './contractListExport';
import { renewContract, type ContractListItem, type ContractStatusFilter } from './services/contractService';
import { contractKeys, useContracts, useSoftDeleteContract } from './useContracts';

const filterLabels: Record<ContractStatusFilter, string> = { all: 'الكل', draft: 'مسودة', active: 'نشط', expired: 'منتهي', terminated: 'ملغي' };
const dateFilterLabels = { all: 'كل الفترات', thisMonth: 'تنتهي هذا الشهر', next3Months: 'تنتهي خلال 90 يومًا' } as const;
type DateRangeFilter = keyof typeof dateFilterLabels;

function getDaysUntilEnd(contract: ContractListItem) {
  return parseContractDisplayDate(contract.end_date) ? getContractRemainingDays(contract.end_date) : null;
}
function isExpiringWithin(contract: ContractListItem, maxDays: number) {
  const days = getDaysUntilEnd(contract);
  return contract.status === 'active' && days !== null && days >= 0 && days <= maxDays;
}
function summarizeContracts(contracts: ContractListItem[]) {
  return contracts.reduce((s, c) => ({
    total: s.total + 1,
    active: s.active + (c.status === 'active' ? 1 : 0),
    expiring30: s.expiring30 + (isExpiringWithin(c, 30) ? 1 : 0),
    expiring90: s.expiring90 + (isExpiringWithin(c, 90) ? 1 : 0),
    ended: s.ended + (c.status === 'expired' || c.status === 'terminated' ? 1 : 0),
  }), { total: 0, active: 0, expiring30: 0, expiring90: 0, ended: 0 });
}
function normalizeSearchText(value: string) { return value.toLowerCase().replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[أإآ]/g, 'ا').replaceAll('ى', 'ي'); }
function getSearchText(contract: ContractListItem) { return normalizeSearchText([contract.id, getContractNumber(contract), contract.people?.full_name, contract.units?.unit_number, contract.properties?.title].filter(Boolean).join(' ')); }

function DetailBox({ label, children }: Readonly<{ label: string; children: ReactNode }>) { return <div className="rounded-2xl border border-border bg-background p-4"><p className="mb-2 text-xs font-black text-muted-foreground">{label}</p><div className="space-y-1 text-sm leading-6">{children}</div></div>; }

export function ContractsListPage() {
  const [status, setStatus] = useState<ContractStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const contractsQuery = useContracts(useMemo(() => ({ status }), [status]));
  const companySettings = useCompanySettingsContract();
  const deleteMutation = useSoftDeleteContract();
  const queryClient = useQueryClient();
  const renewMutation = useMutation({
    mutationFn: ({ contractId, payload }: { contractId: string; payload: RenewalPayload }) => renewContract(contractId, payload),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: contractKeys.all }); },
  });

  const normalizedSearch = normalizeSearchText(searchTerm.trim());
  const filteredContracts = useMemo(() => (contractsQuery.data ?? []).filter((contract) => {
    const matchesSearch = !normalizedSearch || getSearchText(contract).includes(normalizedSearch);
    const matchesExpiry = !expiringOnly || isExpiringWithin(contract, 30);
    const days = getDaysUntilEnd(contract);
    const matchesDateRange = dateRangeFilter === 'all' || (days !== null && days >= 0 && ((dateRangeFilter === 'thisMonth' && days <= 30) || (dateRangeFilter === 'next3Months' && days <= 90)));
    return matchesSearch && matchesExpiry && matchesDateRange;
  }), [contractsQuery.data, dateRangeFilter, expiringOnly, normalizedSearch]);

  const summary = useMemo(() => summarizeContracts(filteredContracts), [filteredContracts]);
  const hasContracts = Boolean(contractsQuery.data?.length);
  const bulk = useBulkSelection(filteredContracts.map((contract) => contract.id));
  const selectedContracts = useMemo(() => filteredContracts.filter((contract) => bulk.selectedIds.has(contract.id)), [bulk.selectedIds, filteredContracts]);
  const exportRows = selectedContracts.length ? selectedContracts : filteredContracts;

  const exportCsv = () => {
    documentEngine.exportCsv('contracts-report', { fileName: `contracts-${new Date().toISOString().slice(0, 10)}`, rows: exportRows.map((c) => ({
      contractNumber: getContractNumber(c), tenant: c.people?.full_name ?? '', property: c.properties?.title ?? '', unit: c.units?.unit_number ?? '', status: contractStatusLabels[c.status],
      startDate: c.start_date, endDate: c.end_date, amount: c.rent_amount,
    })), headers: ['contractNumber', 'tenant', 'property', 'unit', 'status', 'startDate', 'endDate', 'amount'] });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-3xl font-black">العقود</h2><p className="text-sm text-muted-foreground">تحسينات واجهة العقود مع إحصاءات وبحث وفلاتر وتصدير.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { exportCsv(); const result = documentEngine.previewDocument('contracts-report', { generatedAt: new Date().toLocaleDateString('ar-OM'), companyName: companySettings.companyName, contracts: exportRows.map((c) => ({ contractNumber: getContractNumber(c), tenant: c.people?.full_name ?? '—', property: c.properties?.title ?? '—', unit: c.units?.unit_number ?? '—', status: contractStatusLabels[c.status], startDate: formatContractDate(companySettings, c.start_date), endDate: formatContractDate(companySettings, c.end_date), amount: formatContractMoney(companySettings, c.rent_amount) })) }); if (!result.success) globalThis.alert(result.errorMessage ?? 'تعذر فتح المعاينة'); }} disabled={!exportRows.length}><Download className="me-2 size-4" />{selectedContracts.length ? 'تصدير المحدد CSV' : 'تصدير النتائج CSV'}</Button><Button asChild><Link to="/contracts/new"><Plus className="me-2 size-4" />إنشاء عقد</Link></Button></div></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Card variant="kpi" className="p-4"><p className="text-xs">العقود النشطة</p><p className="text-2xl font-black">{summary.active}</p></Card><Card variant="kpi" className="p-4"><p className="text-xs">تنتهي خلال 30 يوم</p><p className="text-2xl font-black">{summary.expiring30}</p></Card><Card variant="kpi" className="p-4"><p className="text-xs">تنتهي خلال 90 يوم</p><p className="text-2xl font-black">{summary.expiring90}</p></Card><Card variant="kpi" className="p-4"><p className="text-xs">منتهية/ملغاة</p><p className="text-2xl font-black">{summary.ended}</p></Card></div>
      <div className="flex flex-col gap-3"><div className="flex flex-wrap gap-2">{(['all', ...contractStatusValues] as ContractStatusFilter[]).map((item) => <Button key={item} variant={status === item ? 'primary' : 'secondary'} onClick={() => setStatus(item)}>{filterLabels[item]}</Button>)}<Button variant={expiringOnly ? 'primary' : 'secondary'} onClick={() => setExpiringOnly((v) => !v)}><AlertTriangle className="me-2 size-4" />تنتهي خلال 30 يوم</Button>{(Object.keys(dateFilterLabels) as DateRangeFilter[]).map((item) => <Button key={item} variant={dateRangeFilter === item ? 'primary' : 'secondary'} onClick={() => setDateRangeFilter(item)}>{dateFilterLabels[item]}</Button>)}</div><div className="relative w-full lg:max-w-md"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث باسم المستأجر، العقار، الوحدة أو رقم العقد" className="ps-10" /></div></div>

      <Card className="overflow-hidden">{contractsQuery.isLoading ? <div className="space-y-3 p-6">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div> : null}
      {!contractsQuery.isLoading && !contractsQuery.isError && filteredContracts.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-12"><button onClick={bulk.toggleAll} aria-label="تحديد كل العقود">{bulk.allSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}</button></TableHead><TableHead>تفاصيل</TableHead><TableHead>رقم العقد</TableHead><TableHead>المستأجر</TableHead><TableHead>الوحدة</TableHead><TableHead>البداية</TableHead><TableHead>النهاية</TableHead><TableHead>الإيجار</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>
      {filteredContracts.map((contract) => { const isExpanded = expandedId === contract.id; const daysUntilEnd = getDaysUntilEnd(contract); return <Fragment key={contract.id}><TableRow><TableCell><button onClick={() => bulk.toggleOne(contract.id)} aria-label={`تحديد ${getContractNumber(contract)}`}>{bulk.isSelected(contract.id) ? <CheckSquare className="size-4" /> : <Square className="size-4" />}</button></TableCell><TableCell><Button variant="ghost" className="min-h-9 px-3" onClick={() => setExpandedId((current) => (current === contract.id ? null : contract.id))} aria-label={isExpanded ? "إخفاء تفاصيل العقد" : "توسيع تفاصيل العقد"}>{isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button></TableCell><TableCell>{getContractNumber(contract)}</TableCell><TableCell>{contract.people?.full_name ?? '—'}</TableCell><TableCell>{contract.units?.unit_number ?? contract.properties?.title ?? '—'}</TableCell><TableCell>{formatContractDate(companySettings, contract.start_date)}</TableCell><TableCell>{formatContractDate(companySettings, contract.end_date)}</TableCell><TableCell>{formatContractMoney(companySettings, contract.rent_amount)}</TableCell><TableCell><StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge></TableCell><TableCell><div className="flex gap-2"><Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/contracts/$contractId" params={{ contractId: contract.id }} aria-label="عرض تفاصيل العقد"><Eye className="size-4" /></Link></Button><Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/contracts/$contractId/edit" params={{ contractId: contract.id }} aria-label="تعديل العقد"><Edit className="size-4" /></Link></Button><Button variant="danger" className="min-h-9 px-3" onClick={() => deleteMutation.mutate(contract.id)} disabled={deleteMutation.isPending} aria-label="حذف العقد"><Trash2 className="size-4" /></Button></div></TableCell></TableRow>{isExpanded ? <TableRow><TableCell colSpan={10} className="bg-muted/30 p-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><DetailBox label="قيمة الإيجار"><p className="text-lg font-black" dir="ltr">{formatContractMoney(companySettings, contract.rent_amount)}</p><p className="text-muted-foreground">دورة السداد: {paymentCycleLabels[contract.payment_cycle]}</p><p className="text-xs text-muted-foreground">لا يتوفر حاليًا رصيد مدفوع/مستحق دقيق على مستوى العقد من البيانات المحملة.</p></DetailBox><DetailBox label="الفترة"><p>{formatContractDate(companySettings, contract.start_date)} ← {formatContractDate(companySettings, contract.end_date)}</p>{daysUntilEnd !== null && daysUntilEnd >= 0 ? <p className="text-amber-700">ينتهي خلال {daysUntilEnd} يوم</p> : null}</DetailBox><DetailBox label="إجراءات إضافية"><Button variant="secondary" disabled={renewMutation.isPending} onClick={() => { const start = parseContractDisplayDate(contract.end_date); if (!start) { return; } const nextStart = new Date(start); nextStart.setDate(nextStart.getDate() + 1); const nextEnd = new Date(nextStart); nextEnd.setFullYear(nextEnd.getFullYear() + 1); renewMutation.mutate({ contractId: contract.id, payload: { new_start: nextStart.toISOString().slice(0, 10), new_end: nextEnd.toISOString().slice(0, 10), new_amount: contract.rent_amount } }); }}>تجديد العقد (سنة)</Button></DetailBox></div></TableCell></TableRow> : null}</Fragment>; })}
      </TableBody></Table></div> : null}
      {!contractsQuery.isLoading && !contractsQuery.isError && !filteredContracts.length ? <div className="p-6"><EmptyState title={hasContracts ? 'لا توجد عقود مطابقة' : 'لا توجد عقود'} description={hasContracts ? 'جرّب تعديل الفلاتر أو البحث.' : 'ابدأ بإنشاء أول عقد.'} /></div> : null}</Card>

      <BulkActionsBar selectedCount={bulk.selectedCount} selectionLabel={`تم تحديد ${bulk.selectedCount} عقد`} onClear={bulk.clear} actions={<Button variant="secondary" onClick={() => { exportCsv(); const result = documentEngine.previewDocument('contracts-report', { generatedAt: new Date().toLocaleDateString('ar-OM'), companyName: companySettings.companyName, contracts: exportRows.map((c) => ({ contractNumber: getContractNumber(c), tenant: c.people?.full_name ?? '—', property: c.properties?.title ?? '—', unit: c.units?.unit_number ?? '—', status: contractStatusLabels[c.status], startDate: formatContractDate(companySettings, c.start_date), endDate: formatContractDate(companySettings, c.end_date), amount: formatContractMoney(companySettings, c.rent_amount) })) }); if (!result.success) globalThis.alert(result.errorMessage ?? 'تعذر فتح المعاينة'); }} disabled={!exportRows.length}><Download className="me-2 size-4" />تصدير</Button>} />
    </div>
  );
}
