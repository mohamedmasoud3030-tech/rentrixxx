import { Link, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Download, Edit, Eye, FileText, Plus, Printer, Trash2, User, WalletCards } from 'lucide-react';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { ContractFormModal } from './contract-form-modal';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ContractCard } from '@/components/ui/contract-card';
import { EntityCell } from '@/components/ui/entity-cell';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { KpiCard } from '@/components/ui/kpi-card';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';
import { buildContractsCsvBlob, buildContractsCsvFilename, getContractNumber } from './contractListExport';
import { formatContractDate, formatContractMoney, getContractRemainingDays, parseContractDisplayDate } from './contractDisplayFormatters';
import { contractStatusLabels, contractStatusTone, contractStatusValues, paymentCycleLabels } from './contractSchema';
import { useCompanySettingsContract } from '../settings/useCompanySettings';
import { useContracts, useSoftDeleteContract } from './useContracts';
import type { ContractListItem, ContractStatusFilter } from './services/contractService';

// ─── pure helpers (no side-effects) ────────────────────────────────────────

const filterLabels: Record<ContractStatusFilter, string> = {
  all: 'الكل',
  draft: 'مسودة',
  active: 'نشط',
  expired: 'منتهي',
  terminated: 'ملغي',
};

function getDaysUntilEnd(contract: ContractListItem) {
  return parseContractDisplayDate(contract.end_date) ? getContractRemainingDays(contract.end_date) : null;
}

function isExpiringSoon(contract: ContractListItem) {
  const days = getDaysUntilEnd(contract);
  return contract.status === 'active' && days !== null && days >= 0 && days <= 30;
}

function summarizeContracts(contracts: ContractListItem[]) {
  return contracts.reduce(
    (s, c) => ({
      total: s.total + 1,
      active: s.active + (c.status === 'active' ? 1 : 0),
      expiringSoon: s.expiringSoon + (isExpiringSoon(c) ? 1 : 0),
      rentTotal: s.rentTotal + (Number.isFinite(c.rent_amount) ? c.rent_amount : 0),
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
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function getSearchText(contract: ContractListItem) {
  return normalizeSearchText(
    [contract.id, getContractNumber(contract), contract.people?.full_name, contract.units?.unit_number, contract.properties?.title]
      .filter(Boolean)
      .join(' '),
  );
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

// ─── sub-components ─────────────────────────────────────────────────────────

function DetailBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="mb-2 text-xs font-black text-muted-foreground">{label}</p>
      <div className="space-y-1 text-sm leading-6">{children}</div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export function ContractsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ContractStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editContractId, setEditContractId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params = useMemo(() => ({ status }), [status]);
  const contractsQuery = useContracts(params);
  const companySettings = useCompanySettingsContract();
  const deleteMutation = useSoftDeleteContract();

  const filters: ContractStatusFilter[] = ['all', ...contractStatusValues];
  const normalizedSearch = normalizeSearchText(searchTerm.trim());

  const filteredContracts = useMemo(() => {
    const contracts = contractsQuery.data ?? [];
    return contracts.filter((c) => {
      const matchesSearch = !normalizedSearch || getSearchText(c).includes(normalizedSearch);
      const matchesExpiry = !expiringOnly || isExpiringSoon(c);
      return matchesSearch && matchesExpiry;
    });
  }, [contractsQuery.data, expiringOnly, normalizedSearch]);

  const listSummary = useMemo(() => summarizeContracts(contractsQuery.data ?? []), [contractsQuery.data]);
  const visibleSummary = useMemo(() => summarizeContracts(filteredContracts), [filteredContracts]);

  const hasContracts = Boolean(contractsQuery.data?.length);
  const hasActiveFilters = status !== 'all' || Boolean(searchTerm.trim()) || expiringOnly;

  const openCreate = () => { setEditContractId(undefined); setModalOpen(true); };
  const openEdit = (id: string) => { setEditContractId(id); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditContractId(undefined); };
  const resetFilters = () => { setStatus('all'); setSearchTerm(''); setExpiringOnly(false); };
  const confirmDelete = () => {
    if (deleteId) deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
  };

  const filterOptions = filters.map((f) => ({ value: f, label: filterLabels[f] }));

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">العقود</h2>
            <p className="text-sm text-muted-foreground">إدارة دورة العقد من مسودة إلى نشط ثم منتهي أو ملغي.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => exportContractsCsv(filteredContracts)} disabled={!filteredContracts.length}>
              <Download className="me-2 size-4" />
              تصدير CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="me-2 size-4" />إنشاء عقد
            </Button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="إجمالي العقود" value={listSummary.total} sub="حسب فلتر الحالة الحالي" icon={FileText} accent="primary" />
          <KpiCard label="العقود النشطة" value={listSummary.active} sub="من إجمالي العقود المحملة" icon={WalletCards} accent="emerald" />
          <KpiCard label="تنتهي قريبًا" value={listSummary.expiringSoon} sub="خلال 30 يومًا" icon={CalendarClock} accent="amber" />
          <KpiCard label="إيجار الظاهرة" value={formatContractMoney(companySettings, visibleSummary.rentTotal)} sub="بعد البحث والفلاتر" icon={WalletCards} accent="sky" />
        </div>

        {/* Filters + search */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs options={filterOptions} value={status} onChange={setStatus} />
            <Button
              variant={expiringOnly ? 'primary' : 'secondary'}
              onClick={() => setExpiringOnly((v) => !v)}
              className="shrink-0"
            >
              <AlertTriangle className="me-2 size-4" />
              تنتهي خلال 30 يوم
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters}>مسح الفلاتر</Button>
            )}
          </div>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="بحث باسم المستأجر، الوحدة، العقار، أو رقم العقد"
            className="w-full lg:max-w-md"
          />
        </div>

        {/* Loading */}
        {contractsQuery.isLoading && (
          <Card className="overflow-hidden">
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          </Card>
        )}

        {/* Error */}
        {!contractsQuery.isLoading && contractsQuery.isError && (
          <Card className="overflow-hidden">
            <div className="p-6">
              <EmptyState
                title="تعذر تحميل العقود"
                description={contractsQuery.error instanceof Error ? contractsQuery.error.message : 'حدث خطأ غير متوقع.'}
                action={<Button onClick={() => contractsQuery.refetch()}>إعادة المحاولة</Button>}
              />
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!contractsQuery.isLoading && !contractsQuery.isError && !filteredContracts.length && (
          <Card className="overflow-hidden">
            <div className="p-6">
              {hasContracts ? (
                <EmptyState title="لا توجد عقود مطابقة" description="جرّب تغيير عبارة البحث أو فلتر الحالة لعرض عقود أخرى." />
              ) : (
                <EmptyState
                  title="لا توجد عقود"
                  description="ابدأ بإنشاء أول عقد وربطه بالعقار والوحدة والمستأجر."
                  action={
                    <Button onClick={openCreate}>
                      <FileText className="me-2 size-4" />إنشاء عقد
                    </Button>
                  }
                />
              )}
            </div>
          </Card>
        )}

        {/* Results */}
        {!contractsQuery.isLoading && !contractsQuery.isError && filteredContracts.length > 0 && (
          <>
            {/* ── Mobile card view ── */}
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
                      formatMoney={(v) => formatContractMoney(companySettings, v)}
                      formatDate={(v) => formatContractDate(companySettings, v)}
                    />
                    {expiringSoon && (
                      <p className="px-1 text-xs font-bold text-amber-700">ينتهي خلال {daysUntilEnd} يوم</p>
                    )}
                    <div className="flex items-center justify-end gap-2 px-1">
                      <Button variant="secondary" size="sm" className="h-9" onClick={() => openEdit(contract.id)}>
                        <Edit className="size-3.5 me-1" />تعديل
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-9"
                        aria-label={`حذف العقد ${getContractNumber(contract)}`}
                        onClick={() => setDeleteId(contract.id)}
                      >
                        <Trash2 className="size-3.5 me-1" />حذف
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table view ── */}
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
                                onClick={() => setExpandedId((cur) => (cur === contract.id ? null : contract.id))}
                              >
                                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <p className="font-black">{getContractNumber(contract)}</p>
                              {expiringSoon && (
                                <p className="mt-1 text-xs font-bold text-amber-700">ينتهي خلال {daysUntilEnd} يوم</p>
                              )}
                            </TableCell>
                            <TableCell><EntityCell icon={User} title={contract.people?.full_name ?? '—'} /></TableCell>
                            <TableCell>{contract.units?.unit_number ?? contract.properties?.title ?? '—'}</TableCell>
                            <TableCell>{formatContractDate(companySettings, contract.start_date)}</TableCell>
                            <TableCell>{formatContractDate(companySettings, contract.end_date)}</TableCell>
                            <TableCell>{formatContractMoney(companySettings, contract.rent_amount)}</TableCell>
                            <TableCell>
                              <StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" className="min-h-11 px-3" asChild>
                                  <Link to="/contracts/$contractId" params={{ contractId: contract.id }} aria-label={`عرض تفاصيل العقد ${getContractNumber(contract)}`}>
                                    <Eye className="size-4" />
                                  </Link>
                                </Button>
                                <Button variant="secondary" className="min-h-11 px-3" onClick={() => openEdit(contract.id)}>
                                  <Edit className="size-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  className="min-h-11 px-3"
                                  aria-label={`حذف العقد ${getContractNumber(contract)}`}
                                  onClick={() => setDeleteId(contract.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
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
                                    {expiringSoon && (
                                      <p className="font-bold text-amber-700">تنبيه: العقد ينتهي خلال {daysUntilEnd} يوم.</p>
                                    )}
                                  </DetailBox>
                                  <DetailBox label="الحالة">
                                    <StatusBadge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
                                    <p className={cn('mt-2 text-muted-foreground', contract.units?.status === 'occupied' && 'text-primary')}>
                                      حالة الوحدة: {contract.units?.status ?? '—'}
                                    </p>
                                  </DetailBox>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Modals */}
      <ContractFormModal open={modalOpen} onClose={closeModal} contractId={editContractId} />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="حذف العقد؟"
        description="سيتم حذف العقد بشكل نهائي ولا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
