import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Clock, Edit, Eye, FileText, Plus, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { contractStatusLabels, contractStatusValues } from './contractSchema';
import { useContracts, useSoftDeleteContract } from './useContracts';
import type { ContractStatusFilter } from './services/contractService';

const statusTone = { draft: 'gray', active: 'blue', expired: 'green', terminated: 'red' } as const;
const filterLabels: Record<ContractStatusFilter, string> = { all: 'الكل', draft: 'مسودة', active: 'نشط', expired: 'منتهي', terminated: 'ملغي' };

function money(value: number) { return new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(value); }

export function ContractsListPage() {
  const [status, setStatus] = useState<ContractStatusFilter>('all');
  const params = useMemo(() => ({ status }), [status]);
  const contractsQuery = useContracts(params);
  const deleteMutation = useSoftDeleteContract();
  const filters: ContractStatusFilter[] = ['all', ...contractStatusValues];

  const statsQuery = useQuery({
    queryKey: ['contract-stats'],
    queryFn: async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 86400000);

      const { data: activeContracts, error: activeError } = await supabase
        .from('contracts')
        .select('id,end_date,rent_amount')
        .eq('status', 'active')
        .is('deleted_at', null);
      if (activeError) throw activeError;

      const activeRows = activeContracts ?? [];
      const totalMonthlyRent = activeRows.reduce((sum, contract) => sum + Number(contract.rent_amount ?? 0), 0);
      const expiring = activeRows.filter((contract) => {
        const endDate = new Date(contract.end_date);
        return endDate >= now && endDate <= futureDate;
      }).length;

      const { data: summary, error: summaryError } = await supabase.rpc('rpt_financial_summary', {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      if (summaryError) throw summaryError;

      return {
        active: activeRows.length,
        expiring,
        totalMonthlyRent,
        totalOverdue: Number(summary?.total_overdue_invoices ?? 0),
      };
    },
  });
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-primary">مرحلة 2B</p>
          <h2 className="text-3xl font-black">العقود</h2>
          <p className="text-sm text-muted-foreground">إدارة دورة العقد من مسودة إلى نشط ثم منتهي أو ملغي.</p>
        </div>
        <Button asChild><Link to="/contracts/new"><Plus className="ml-2 size-4" />إنشاء عقد</Link></Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => <Button key={item} variant={status === item ? 'primary' : 'secondary'} onClick={() => setStatus(item)}>{filterLabels[item]}</Button>)}
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <CheckCircle size={18} className="mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-black">{stats.active}</p>
            <p className="text-[10px] text-muted-foreground">عقود نشطة</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <AlertTriangle size={18} className="mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-black text-amber-600">{stats.expiring}</p>
            <p className="text-[10px] text-muted-foreground">تنتهي قريبًا</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Clock size={18} className="mx-auto mb-1 text-red-500" />
            <p className="text-lg font-black text-red-600" dir="ltr">{money(stats.totalOverdue)}</p>
            <p className="text-[10px] text-muted-foreground">إجمالي المتأخرات</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Users size={18} className="mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-black text-blue-700" dir="ltr">{money(stats.totalMonthlyRent)}</p>
            <p className="text-[10px] text-muted-foreground">إجمالي الإيجار الشهري</p>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {contractsQuery.isLoading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}</div>
        ) : contractsQuery.data?.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>العقد رقم</TableHead><TableHead>المستأجر</TableHead><TableHead>الوحدة</TableHead><TableHead>تاريخ البداية</TableHead><TableHead>تاريخ النهاية</TableHead><TableHead>قيمة الإيجار</TableHead><TableHead>الحالة</TableHead><TableHead className="w-52">إجراءات</TableHead></TableRow></TableHeader>
              <TableBody>
                {contractsQuery.data.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-black">#{contract.id.slice(0, 8)}</TableCell>
                    <TableCell>{contract.people?.full_name ?? '—'}</TableCell>
                    <TableCell>{contract.units?.unit_number ?? contract.properties?.title ?? '—'}</TableCell>
                    <TableCell>{new Date(contract.start_date).toLocaleDateString('ar')}</TableCell>
                    <TableCell>{new Date(contract.end_date).toLocaleDateString('ar')}</TableCell>
                    <TableCell>{money(contract.rent_amount)}</TableCell>
                    <TableCell><StatusBadge tone={statusTone[contract.status]}>{contractStatusLabels[contract.status]}</StatusBadge></TableCell>
                    <TableCell><div className="flex flex-wrap gap-2"><Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/contracts/$contractId" params={{ contractId: contract.id }}><Eye className="size-4" /></Link></Button><Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/contracts/$contractId/edit" params={{ contractId: contract.id }}><Edit className="size-4" /></Link></Button><Button variant="danger" className="min-h-9 px-3" onClick={() => void deleteMutation.mutate(contract.id)} disabled={deleteMutation.isPending}><Trash2 className="size-4" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : <div className="p-6"><EmptyState title="لا توجد عقود" description="ابدأ بإنشاء أول عقد وربطه بالعقار والوحدة والمستأجر." action={<Button asChild><Link to="/contracts/new"><FileText className="ml-2 size-4" />إنشاء عقد</Link></Button>} /></div>}
      </Card>
    </div>
  );
}
