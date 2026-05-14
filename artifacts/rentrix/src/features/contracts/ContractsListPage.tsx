import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronUp, Download, Edit, Eye, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { contractStatusLabels, contractStatusValues, paymentCycleLabels } from './contractSchema';
import { useContracts, useSoftDeleteContract } from './useContracts';
import type { ContractListItem, ContractStatusFilter } from './services/contractService';

const statusTone = { draft: 'gray', active: 'blue', expired: 'green', terminated: 'red' } as const;
const filterLabels: Record<ContractStatusFilter, string> = { all: 'الكل', draft: 'مسودة', active: 'نشط', expired: 'منتهي', terminated: 'ملغي' };

function money(value: number) {
  return new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ar');
}

function getContractNumber(contract: ContractListItem) {
  return `#${contract.id.slice(0, 8)}`;
}

function getSearchText(contract: ContractListItem) {
  return [contract.id, getContractNumber(contract), contract.people?.full_name, contract.units?.unit_number, contract.properties?.title].filter(Boolean).join(' ').toLowerCase();
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportContractsCsv(contracts: ContractListItem[]) {
  const headers = ['رقم العقد', 'المستأجر', 'هاتف المستأجر', 'الوحدة', 'العقار', 'عنوان العقار', 'الإيجار', 'دورة السداد', 'تاريخ البداية', 'تاريخ النهاية', 'الحالة'];
  const rows = contracts.map((contract) => [
    getContractNumber(contract),
    contract.people?.full_name ?? '',
    contract.people?.phone ?? '',
    contract.units?.unit_number ?? '',
    contract.properties?.title ?? '',
    contract.properties?.address ?? '',
    contract.rent_amount,
    paymentCycleLabels[contract.payment_cycle],
    contract.start_date,
    contract.end_date,
    contractStatusLabels[contract.status],
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rentrix-contracts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DetailBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="mb-2 text-xs font-black text-muted-foreground">{label}</p>
      <div className="space-y-1 text-sm leading-6">{children}</div>
    </div>
  );
}

export function ContractsListPage() {
  const [status, setStatus] = useState<ContractStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const params = useMemo(() => ({ status }), [status]);
  const contractsQuery = useContracts(params);
  const deleteMutation = useSoftDeleteContract();
  const filters: ContractStatusFilter[] = ['all', ...contractStatusValues];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredContracts = useMemo(() => {
    const contracts = contractsQuery.data ?? [];
    if (!normalizedSearch) return contracts;
    return contracts.filter((contract) => getSearchText(contract).includes(normalizedSearch));
  }, [contractsQuery.data, normalizedSearch]);
  const hasContracts = Boolean(contractsQuery.data?.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-primary">مرحلة 2B</p>
          <h2 className="text-3xl font-black">العقود</h2>
          <p className="text-sm text-muted-foreground">إدارة دورة العقد من مسودة إلى نشط ثم منتهي أو ملغي.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportContractsCsv(filteredContracts)} disabled={!filteredContracts.length}>
            <Download className="ml-2 size-4" />
            تصدير CSV
          </Button>
          <Button asChild>
            <Link to="/contracts/new">
              <Plus className="ml-2 size-4" />إنشاء عقد
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button key={item} variant={status === item ? 'primary' : 'secondary'} onClick={() => setStatus(item)}>
              {filterLabels[item]}
            </Button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث باسم المستأجر، الوحدة، العقار، أو رقم العقد"
            className="pr-10"
            aria-label="بحث العقود"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {contractsQuery.isLoading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}</div>
        ) : filteredContracts.length ? (
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
                  return (
                    <Fragment key={contract.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpandedId((current) => (current === contract.id ? null : contract.id))}>
                        <TableCell>
                          <Button variant="ghost" className="min-h-9 px-3" aria-label={isExpanded ? 'إخفاء تفاصيل العقد' : 'عرض تفاصيل العقد'}>
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-black">{getContractNumber(contract)}</TableCell>
                        <TableCell>{contract.people?.full_name ?? '—'}</TableCell>
                        <TableCell>{contract.units?.unit_number ?? contract.properties?.title ?? '—'}</TableCell>
                        <TableCell>{formatDate(contract.start_date)}</TableCell>
                        <TableCell>{formatDate(contract.end_date)}</TableCell>
                        <TableCell>{money(contract.rent_amount)}</TableCell>
                        <TableCell>
                          <StatusBadge tone={statusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" className="min-h-9 px-3" asChild>
                              <Link to="/contracts/$contractId" params={{ contractId: contract.id }}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                            <Button variant="secondary" className="min-h-9 px-3" asChild>
                              <Link to="/contracts/$contractId/edit" params={{ contractId: contract.id }}>
                                <Edit className="size-4" />
                              </Link>
                            </Button>
                            <Button variant="danger" className="min-h-9 px-3" onClick={() => void deleteMutation.mutate(contract.id)} disabled={deleteMutation.isPending}>
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
                                <p className="text-lg font-black" dir="ltr">{money(contract.rent_amount)}</p>
                                <p className="text-muted-foreground">دورة السداد: {paymentCycleLabels[contract.payment_cycle]}</p>
                              </DetailBox>
                              <DetailBox label="فترة العقد">
                                <p>{formatDate(contract.start_date)} ← {formatDate(contract.end_date)}</p>
                                <p className="text-muted-foreground">رقم العقد: {getContractNumber(contract)}</p>
                              </DetailBox>
                              <DetailBox label="الحالة">
                                <StatusBadge tone={statusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge>
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
        ) : (
          <div className="p-6">
            {hasContracts ? (
              <EmptyState title="لا توجد عقود مطابقة" description="جرّب تغيير عبارة البحث أو فلتر الحالة لعرض عقود أخرى." />
            ) : (
              <EmptyState
                title="لا توجد عقود"
                description="ابدأ بإنشاء أول عقد وربطه بالعقار والوحدة والمستأجر."
                action={
                  <Button asChild>
                    <Link to="/contracts/new">
                      <FileText className="ml-2 size-4" />إنشاء عقد
                    </Link>
                  </Button>
                }
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
