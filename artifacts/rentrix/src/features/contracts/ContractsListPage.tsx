import { Link, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Download, Edit, Eye, FileText, Plus, Search, Trash2, WalletCards } from 'lucide-react';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { ContractFormModal } from './contract-form-modal';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ContractCard } from '@/components/ui/contract-card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { buildContractsCsvBlob, buildContractsCsvFilename, getContractNumber } from './contractListExport';
import { formatContractDate, formatContractMoney, getContractRemainingDays, parseContractDisplayDate } from './contractDisplayFormatters';
import { contractStatusLabels, contractStatusTone, contractStatusValues, paymentCycleLabels } from './contractSchema';
import { useCompanySettingsContract } from '../settings/useCompanySettings';
import { useContracts, useSoftDeleteContract } from './useContracts';
import type { ContractListItem, ContractStatusFilter } from './services/contractService';

const filterLabels: Record<ContractStatusFilter, string> = { all: 'الكل', draft: 'مسودة', active: 'نشط', expired: 'منتهي', terminated: 'ملغي' };

function getDaysUntilEnd(contract: ContractListItem) {
  return parseContractDisplayDate(contract.end_date) ? getContractRemainingDays(contract.end_date) : null;
}

function isExpiringSoon(contract: ContractListItem) {
  const days = getDaysUntilEnd(contract);
  return contract.status === 'active' && days !== null && days >= 0 && days <= 30;
}

function summarizeContracts(contracts: ContractListItem[]) {
  return contracts.reduce(
    (summary, contract) => ({
      total: summary.total + 1,
      active: summary.active + (contract.status === 'active' ? 1 : 0),
      expiringSoon: summary.expiringSoon + (isExpiringSoon(contract) ? 1 : 0),
      rentTotal: summary.rentTotal + (Number.isFinite(contract.rent_amount) ? contract.rent_amount : 0),
    }),
    { total: 0, active: 0, expiringSoon: 0, rentTotal: 0 },
  );
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

function getSearchText(contract: ContractListItem) {
  return normalizeSearchText([contract.id, getContractNumber(contract), contract.people?.full_name, contract.units?.unit_number, contract.properties?.title].filter(Boolean).join(' '));
}

function exportContractsCsv(contracts: ContractListItem[]) {
  const url = URL.createObjectURL(buildContractsCsvBlob(contracts));
  const link = document.createElement('a');
  link.href = url;
  link.download = buildContractsCsvFilename(new Date());
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DetailBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="mb-2 text-xs font-black text-muted-foreground">{label}</p>
      <div className="space-y-1 text-sm leading-6">{children}</div>
    </div>
  );
}

function getContractsLoadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل العقود.';
}

function SummaryCard({ label, value, description, icon: Icon }: { label: string; value: string; description: string; icon: typeof FileText }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

export function ContractsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ContractStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editContractId, setEditContractId] = useState<string | undefined>();
  const params = useMemo(() => ({ status }), [status]);
  const contractsQuery = useContracts(params);
  const companySettings = useCompanySettingsContract();
  const deleteMutation = useSoftDeleteContract();
  const filters: ContractStatusFilter[] = ['all', ...contractStatusValues];
  const normalizedSearch = normalizeSearchText(searchTerm.trim());
  const filteredContracts = useMemo(() => {
    const contracts = contractsQuery.data ?? [];
    return contracts.filter((contract) => {
      const matchesSearch = !normalizedSearch || getSearchText(contract).includes(normalizedSearch);
      const matchesExpiry = !expiringOnly || isExpiringSoon(contract);
      return matchesSearch && matchesExpiry;
    });
  }, [contractsQuery.data, expiringOnly, normalizedSearch]);
  const listSummary = useMemo(() => summarizeContracts(contractsQuery.data ?? []), [contractsQuery.data]);
  const visibleSummary = useMemo(() => summarizeContracts(filteredContracts), [filteredContracts]);
  const hasContracts = Boolean(contractsQuery.data?.length);
  const hasActiveFilters = status !== 'all' || Boolean(searchTerm.trim()) || expiringOnly;
  const retryContracts = async () => {
    await contractsQuery.refetch();
  };
  const resetFilters = () => {
    setStatus('all');
    setSearchTerm('');
    setExpiringOnly(false);
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-primary">مرحلة 2B</p>
          <h2 className="text-3xl font-black">العقود</h2>
          <p className="text-sm text-muted-foreground">إدارة دورة العقد من مسودة إلى نشط ثم منتهي أو ملغي.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportContractsCsv(filteredContracts)} disabled={!filteredContracts.length}>
            <Download className="me-2 size-4" />
            تصدير CSV
          </Button>
          <Button onClick={() => { setEditContractId(undefined); setModalOpen(true); }}>
            <Plus className="me-2 size-4" />إنشاء عقد
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="إجمالي العقود" value={String(listSummary.total)} description="كل العقود المحملة حسب فلتر الحالة الحالي." icon={FileText} />
        <SummaryCard label="العقود النشطة" value={String(listSummary.active)} description="العقود التي حالتها نشطة ضمن النتيجة الحالية." icon={WalletCards} />
        <SummaryCard label="تنتهي قريبًا" value={String(listSummary.expiringSoon)} description="عقود نشطة تنتهي خلال 30 يومًا." icon={CalendarClock} />
        <SummaryCard label="إيجار النتائج الظاهرة" value={formatContractMoney(companySettings, visibleSummary.rentTotal)} description="إجمالي قيمة الإيجار للعقود الظاهرة بعد البحث والفلاتر." icon={WalletCards} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button key={item} variant={status === item ? 'primary' : 'secondary'} onClick={() => setStatus(item)}>
              {filterLabels[item]}
            </Button>
          ))}
          <Button variant={expiringOnly ? 'primary' : 'secondary'} onClick={() => setExpiringOnly((current) => !current)}>
            <AlertTriangle className="me-2 size-4" />
            تنتهي خلال 30 يوم
          </Button>
          {hasActiveFilters ? <Button variant="ghost" onClick={resetFilters}>مسح الفلاتر</Button> : null}
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث باسم المستأجر، الوحدة، العقار، أو رقم العقد"
            className="ps-10"
            aria-label="بحث العقود"
          />
        </div>
      </div>

      {contractsQuery.isLoading ? (
        <Card className="overflow-hidden">
          <div className="space-y-3 p-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}</div>
        </Card>
      ) : null}

      {!contractsQuery.isLoading && contractsQuery.isError ? (
        <Card className="overflow-hidden">
          <div className="p-6">
            <EmptyState
              title="تعذر تحميل العقود"
              description={getContractsLoadErrorMessage(contractsQuery.error)}
              action={<Button type="button" onClick={retryContracts}>إعادة المحاولة</Button>}
            />
          </div>
        </Card>
      ) : null}

      {!contractsQuery.isLoading && !contractsQuery.isError && !filteredContracts.length ? (
        <Card className="overflow-hidden">
          <div className="p-6">
            {hasContracts ? (
              <EmptyState title="لا توجد عقود مطابقة" description="جرّب تغيير عبارة البحث أو فلتر الحالة لعرض عقود أخرى." />
            ) : (
              <EmptyState
                title="لا توجد عقود"
                description="ابدأ بإنشاء أول عقد وربطه بالعقار والوحدة والمستأجر."
                action={
                  <Button onClick={() => { setEditContractId(undefined); setModalOpen(true); }}>
                    <FileText className="me-2 size-4" />إنشاء عقد
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      ) : null}

      {!contractsQuery.isLoading && !contractsQuery.isError && filteredContracts.length ? (
        <>
          {/* Mobile card view */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {filteredContracts.map((contract) => {
              const expiringSoon = isExpiringSoon(contract);
              const daysUntilEnd = getDaysUntilEnd(contract);
              return (
                <div key={contract.id} className="space-y-1.5">
                  <ContractCard
                    id={contract.id}
                    contractNumber={getContractNumber(contract)}
                    tenantName={contract.people?.full_name ?? '—'}
                    location={contract.units?.unit_number ?? contract.properties?.title ?? '—'}
                    endDate={contract.end_date}
                    daysRemaining={daysUntilEnd ?? 0}
                    monthlyRent={contract.rent_amount}
                    status={contract.status.toUpperCase()}
                    onClick={() => navigate({ to: '/contracts/$contractId', params: { contractId: contract.id } })}
                    formatMoney={(value) => formatContractMoney(companySettings, value)}
                    formatDate={(value) => formatContractDate(companySettings, value)}
                  />
                  {expiringSoon ? (
                    <p className="px-1 text-xs font-bold text-amber-700">ينتهي خلال {daysUntilEnd} يوم</p>
                  ) : null}
                  <div className="flex items-center justify-end gap-2 px-1">
                    <Button variant="secondary" className="h-9 rounded-xl px-3 text-xs gap-1.5" onClick={() => { setEditContractId(contract.id); setModalOpen(true); }}>
                      <Edit className="size-3.5" />تعديل
                    </Button>
                    <Button
                      variant="danger"
                      className="h-9 rounded-xl px-3 text-xs gap-1.5"
                      aria-label={`حذف العقد ${getContractNumber(contract)}`}
                      onClick={() => deleteMutation.mutate(contract.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />حذف
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">تفاصيل</TableHead>
                  <TableHead>العقد رقم</TableHead>
                  <TableHead>المستأجر</TableHead>
                  <TableHead>الوحدة</TableHead>
                  <TableHead>تاريخ البداية</TableHead>
                  <TableHead>تاريخ النهاية</TableHead>
                  <TableHead>قيمة الإيجار</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-52">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const isExpanded = expandedId === contract.id;
                  const expiringSoon = isExpiringSoon(contract);
                  const daysUntilEnd = getDaysUntilEnd(contract);
                  return (
                    <Fragment key={contract.id}>
                      <TableRow className={cn(expiringSoon && 'bg-amber-50/60 dark:bg-amber-950/20')}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="min-h-9 px-3"
                            aria-label={isExpanded ? 'إخفاء تفاصيل العقد' : 'عرض تفاصيل العقد'}
                            onClick={() => setExpandedId((current) => (current === contract.id ? null : contract.id))}
                          >
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <p className="font-black">{getContractNumber(contract)}</p>
                          {expiringSoon ? <p className="mt-1 text-xs font-bold text-amber-700">ينتهي خلال {daysUntilEnd} يوم</p> : null}
                        </TableCell>
                        <TableCell>{contract.people?.full_name ?? '—'}</TableCell>
                        <TableCell>{contract.units?.unit_number ?? contract.properties?.title ?? '—'}</TableCell>
                        <TableCell>{formatContractDate(companySettings, contract.start_date)}</TableCell>
                        <TableCell>{formatContractDate(companySettings, contract.end_date)}</TableCell>
                        <TableCell>{formatContractMoney(companySettings, contract.rent_amount)}</TableCell>
                        <TableCell>
                          <StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" className="min-h-11 px-3" asChild>
                              <Link to="/contracts/$contractId" params={{ contractId: contract.id }} aria-label={`عرض تفاصيل العقد ${getContractNumber(contract)}`}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                            <Button variant="secondary" className="min-h-11 px-3" onClick={() => { setEditContractId(contract.id); setModalOpen(true); }}>
                              <Edit className="size-4" />
                            </Button>
                            <Button variant="danger" className="min-h-11 px-3" aria-label={`حذف العقد ${getContractNumber(contract)}`} onClick={() => deleteMutation.mutate(contract.id)} disabled={deleteMutation.isPending}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded ? (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                              <DetailBox label="بيانات المستأجر">
                                <p className="font-bold">{contract.people?.full_name ?? '—'}</p>
                                <p className="text-muted-foreground">هاتف: {contract.people?.phone ?? '—'}</p>
                                <p className="text-muted-foreground">بريد: {contract.people?.email ?? '—'}</p>
                                <p className="text-muted-foreground">هوية: {contract.people?.national_id ?? '—'}</p>
                              </DetailBox>
                              <DetailBox label="بيانات الوحدة والعقار">
                                <p className="font-bold">{contract.units?.unit_number ?? '—'} / {contract.properties?.title ?? '—'}</p>
                                <p className="text-muted-foreground">الدور: {contract.units?.floor ?? '—'}</p>
                                <p className="text-muted-foreground">العنوان: {contract.properties?.address ?? '—'}</p>
                              </DetailBox>
                              <DetailBox label="قيمة الإيجار">
                                <p className="text-lg font-black" dir="ltr">{formatContractMoney(companySettings, contract.rent_amount)}</p>
                                <p className="text-muted-foreground">دورة السداد: {paymentCycleLabels[contract.payment_cycle]}</p>
                              </DetailBox>
                              <DetailBox label="فترة العقد">
                                <p>{formatContractDate(companySettings, contract.start_date)} ← {formatContractDate(companySettings, contract.end_date)}</p>
                                <p className="text-muted-foreground">رقم العقد: {getContractNumber(contract)}</p>
                                {expiringSoon ? <p className="font-bold text-amber-700">تنبيه: العقد ينتهي خلال {daysUntilEnd} يوم.</p> : null}
                              </DetailBox>
                              <DetailBox label="الحالة">
                                <StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
                                <p className={cn('mt-2 text-muted-foreground', contract.units?.status === 'occupied' && 'text-primary')}>حالة الوحدة: {contract.units?.status ?? '—'}</p>
                              </DetailBox>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
    <ContractFormModal
      open={modalOpen}
      onClose={() => { setModalOpen(false); setEditContractId(undefined); }}
      contractId={editContractId}
    />
    </>
  );
}
