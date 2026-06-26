import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronUp, Edit, Eye, Trash2, User } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EntityCell } from '@/components/ui/entity-cell';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { cn } from '@/lib/utils';
import { getContractNumber } from '../contractListExport';
import { formatContractDate, formatContractMoney } from '../contractDisplayFormatters';
import { contractStatusLabels, contractStatusTone, paymentCycleLabels } from '../contractSchema';
import type { ContractListItem } from '../services/contractService';
import { getDaysUntilEnd, isExpiringSoon } from '../hooks/useContractFilters';

function DetailBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="mb-2 text-xs font-black text-muted-foreground">{label}</p>
      <div className="space-y-1 text-sm leading-6">{children}</div>
    </div>
  );
}

export function ContractTable({
  companySettings,
  contracts,
  expandedId,
  onDelete,
  onEdit,
  setExpandedId,
}: {
  companySettings: CompanySettingsContract;
  contracts: ContractListItem[];
  expandedId: string | null;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  setExpandedId: (updater: (value: string | null) => string | null) => void;
}) {
  return (
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
            {contracts.map((contract) => {
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
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="min-h-11 px-3" asChild>
                          <Link to="/contracts/$contractId" params={{ contractId: contract.id }} aria-label={`عرض تفاصيل العقد ${getContractNumber(contract)}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="secondary" className="min-h-11 px-3" onClick={() => onEdit(contract.id)}>
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="danger"
                          className="min-h-11 px-3"
                          aria-label={`حذف العقد ${getContractNumber(contract)}`}
                          onClick={() => onDelete(contract.id)}
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
  );
}
