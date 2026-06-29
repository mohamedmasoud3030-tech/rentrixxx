import { Building2, Calculator, CheckCircle2, DollarSign, PieChart, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable, type ColumnDef } from '@/components/ui/entity-table';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMockAgreements, useMockContracts, useMockExpenses, useMockInvoices, useMockOwners, useMockProperties, useMockReceipts } from '@/hooks/use-mock-repositories';
import { calculateOfficeProfitability, calculateOwnerSettlement, getReceiptPropertyId, type OwnerSettlementSummary } from '@/domain/financial-settlements';
import type { OwnerAgreement } from '@/domain/types';

function formatArabicNumber(value: number): string {
  return value.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Phase5FinancialsHubPage() {
  const agreementsQuery = useMockAgreements();
  const receiptsQuery = useMockReceipts();
  const expensesQuery = useMockExpenses();
  const invoicesQuery = useMockInvoices();
  const contractsQuery = useMockContracts();
  const ownersQuery = useMockOwners();
  const propertiesQuery = useMockProperties();

  const agreements = agreementsQuery.data;
  const receipts = receiptsQuery.data;
  const expenses = expensesQuery.data;
  const invoices = invoicesQuery.data;
  const contracts = contractsQuery.data;

  const officeProfitability = calculateOfficeProfitability(agreements, receipts, invoices, contracts, expenses);

  const ownerSettlements: OwnerSettlementSummary[] = agreements.map((agr: OwnerAgreement) => {
    const propReceipts = receipts.filter((r) => getReceiptPropertyId(r, invoices, contracts) === agr.propertyId);
    const propExpenses = expenses.filter((e) => e.propertyId === agr.propertyId);
    return calculateOwnerSettlement(agr, propReceipts, propExpenses);
  });

  const columns: ColumnDef<OwnerSettlementSummary>[] = [
    {
      key: 'owner',
      header: 'المالك / العقار',
      render: (s: OwnerSettlementSummary) => {
        const owner = ownersQuery.data.find((o) => o.id === s.ownerId);
        const prop = propertiesQuery.data.find((p) => p.id === s.propertyId);
        return <EntityCell icon={Users} title={owner?.name ?? s.ownerId} subtitle={prop?.name ?? s.propertyId} />;
      },
    },
    {
      key: 'type',
      header: 'نموذج الاتفاقية',
      render: (s: OwnerSettlementSummary) => {
        const agr = agreements.find((a) => a.id === s.agreementId);
        const isMaster = agr?.agreementType === 'master_lease';
        return <StatusBadge tone={isMaster ? 'info' : 'primary'}>{isMaster ? 'استئجار رئيسي' : 'إدارة أملاك'}</StatusBadge>;
      },
    },
    {
      key: 'gross',
      header: 'الإيراد الإجمالي',
      render: (s: OwnerSettlementSummary) => <span className="font-bold">{formatArabicNumber(s.grossRevenue)} ر.س</span>,
    },
    {
      key: 'deductions',
      header: 'الخصومات (أتعاب + مصروفات)',
      render: (s: OwnerSettlementSummary) => (
        <span className="text-rose-700 dark:text-rose-300 font-bold">
          {formatArabicNumber(s.feesDeducted + s.expensesDeducted)} ر.س
        </span>
      ),
    },
    {
      key: 'net',
      header: 'صافي مستحقات المالك',
      render: (s: OwnerSettlementSummary) => (
        <span className="text-emerald-700 dark:text-emerald-300 font-black text-base">
          {formatArabicNumber(s.netPayout)} ر.س
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
          <TrendingUp className="size-4" />
          المالية الشاملة — أرباح المكتب وتسويات الملاك
        </div>
        <h1 className="mt-2 text-3xl font-black">مركز الإدارة المالية الشاملة</h1>
        <p className="text-sm text-muted-foreground">حساب أرباح المكتب التشغيلية وتسويات الملاك آلياً وفق اتفاقيات إدارة الأملاك والاستئجار الرئيسي.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="إيرادات المكتب (أتعاب وهوامش)" value={`${formatArabicNumber(officeProfitability.totalManagementFees + officeProfitability.totalMasterLeaseMargins)} ر.س`} sub="إجمالي إيرادات التشغيل" accent="primary" icon={DollarSign} />
        <KpiCard label="مصروفات المكتب التشغيلية" value={`${formatArabicNumber(officeProfitability.totalOperationalExpenses)} ر.س`} sub="التكاليف المحمّلة على المكتب" accent="rose" icon={PieChart} />
        <KpiCard label="صافي أرباح المكتب" value={`${formatArabicNumber(officeProfitability.netRevenue)} ر.س`} sub="الربح التشغيلي الصافي" accent="emerald" icon={TrendingUp} />
        <KpiCard label="اتفاقيات ملاك نشطة" value={formatArabicNumber(agreements.length)} sub="عدد قوالب التسوية" accent="sky" icon={Calculator} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-black">حاسبة تسويات الملاك (Owner Settlement Engine)</CardTitle>
          <CardDescription>التسويات المستحقة للملاك بعد خصم العمولة والرسوم والمصروفات المعتمدة</CardDescription>
        </CardHeader>
        <CardContent>
          <EntityTable<OwnerSettlementSummary>
            aria-label="جدول تسويات الملاك"
            rows={ownerSettlements}
            keyOf={(s) => s.agreementId}
            emptyTitle="لا توجد اتفاقيات ملاك نشطة"
            emptyDescription="قم بإنشاء اتفاقية تشغيل لعقار."
            columns={columns}
          />
        </CardContent>
      </Card>
    </div>
  );
}
