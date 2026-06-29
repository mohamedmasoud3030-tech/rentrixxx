import { BarChart3, Download, FileSpreadsheet, PieChart, Printer, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable, type ColumnDef } from '@/components/ui/entity-table';
import { KpiCard } from '@/components/ui/kpi-card';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { buildCsv, withUtf8Bom } from '@/lib/csvExport';
import { useMockAgreements, useMockContracts, useMockExpenses, useMockInvoices, useMockOwners, useMockProperties, useMockReceipts, useMockTenants, useMockUnits } from '@/hooks/use-mock-repositories';
import { calculateOfficeProfitability, calculateOwnerSettlement, getReceiptPropertyId } from '@/domain/financial-settlements';
import type { Invoice, Owner, OwnerAgreement, Tenant } from '@/domain/types';

function formatArabicNumber(value: number): string {
  return value.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Phase7ReportsHubPage() {
  const unitsQuery = useMockUnits();
  const invoicesQuery = useMockInvoices();
  const receiptsQuery = useMockReceipts();
  const agreementsQuery = useMockAgreements();
  const contractsQuery = useMockContracts();
  const expensesQuery = useMockExpenses();
  const tenantsQuery = useMockTenants();
  const ownersQuery = useMockOwners();
  const propertiesQuery = useMockProperties();

  const [printOwnerStatement, setPrintOwnerStatement] = useState<Owner | null>(null);
  const [printTenantStatement, setPrintTenantStatement] = useState<Tenant | null>(null);

  const units = unitsQuery.data;
  const invoices = invoicesQuery.data;
  const receipts = receiptsQuery.data;
  const agreements = agreementsQuery.data;
  const contracts = contractsQuery.data;
  const expenses = expensesQuery.data;

  const totalUnits = units.length || 1;
  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
  const occupancyRate = (occupiedUnits / totalUnits) * 100;

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0) || 1;
  const totalCollected = receipts.reduce((sum, r) => sum + r.amount, 0);
  const collectionRate = Math.min(100, (totalCollected / totalInvoiced) * 100);

  const arrearsInvoices = invoices.filter((i) => i.status === 'unpaid' || i.status === 'partially_paid' || i.status === 'overdue');
  const totalArrears = arrearsInvoices.reduce((sum, i) => {
    const paid = receipts.filter((r) => r.invoiceId === i.id).reduce((s, r) => s + r.amount, 0);
    return sum + Math.max(0, i.amount - paid);
  }, 0);

  const profitability = calculateOfficeProfitability(agreements, receipts, invoices, contracts, expenses);

  const downloadCsvFile = (filename: string, content: string) => {
    const blob = new Blob([withUtf8Bom(content)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const exportArrearsCsv = () => {
    const rows = arrearsInvoices.map((inv) => {
      const paid = receipts.filter((r) => r.invoiceId === inv.id).reduce((s, r) => s + r.amount, 0);
      const contract = contracts.find((c) => c.id === inv.contractId);
      const tenant = tenantsQuery.data.find((t) => t.id === contract?.tenantId);
      return {
        رقم_الفاتورة: inv.id,
        المستأجر: tenant?.name ?? '—',
        العقد: inv.contractId,
        المبلغ_الإجمالي: inv.amount,
        المبلغ_المسدد: paid,
        المتأخرات_المتبقية: inv.amount - paid,
        تاريخ_الاستحقاق: inv.dueDate,
        الحالة: inv.status,
      };
    });
    if (!rows.length) return;
    downloadCsvFile(`rentrix_arrears_report_${new Date().toISOString().split('T')[0]}.csv`, buildCsv(rows));
  };

  const exportSettlementsCsv = () => {
    const rows = agreements.map((agr) => {
      const propReceipts = receipts.filter((r) => getReceiptPropertyId(r, invoices, contracts) === agr.propertyId);
      const propExpenses = expenses.filter((e) => e.propertyId === agr.propertyId);
      const s = calculateOwnerSettlement(agr, propReceipts, propExpenses);
      const owner = ownersQuery.data.find((o) => o.id === s.ownerId);
      const prop = propertiesQuery.data.find((p) => p.id === s.propertyId);
      return {
        المالك: owner?.name ?? agr.ownerId,
        العقار: prop?.name ?? agr.propertyId,
        نوع_الاتفاقية: agr.agreementType,
        الإيراد_الإجمالي: s.grossRevenue,
        الخصومات: s.feesDeducted + s.expensesDeducted,
        صافي_المستحقات: s.netPayout,
      };
    });
    if (!rows.length) return;
    downloadCsvFile(`rentrix_owners_settlements_${new Date().toISOString().split('T')[0]}.csv`, buildCsv(rows));
  };

  const arrearsCols: ColumnDef<Invoice>[] = [
    {
      key: 'inv',
      header: 'الفاتورة والمستأجر',
      render: (i: Invoice) => {
        const c = contracts.find((item) => item.id === i.contractId);
        const t = tenantsQuery.data.find((item) => item.id === c?.tenantId);
        return <EntityCell icon={FileSpreadsheet} title={t?.name ?? 'مستأجر'} subtitle={`فاتورة #${i.id}`} />;
      },
    },
    {
      key: 'amount',
      header: 'المبلغ المتأخر',
      render: (i: Invoice) => {
        const paid = receipts.filter((r) => r.invoiceId === i.id).reduce((s, r) => s + r.amount, 0);
        return <span className="font-bold text-rose-700 dark:text-rose-300">{formatArabicNumber(i.amount - paid)} ر.س</span>;
      },
    },
    {
      key: 'due',
      header: 'تاريخ الاستحقاق',
      render: (i: Invoice) => <span dir="ltr" className="text-sm font-mono">{i.dueDate}</span>,
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (i: Invoice) => <StatusBadge tone="danger">{i.status}</StatusBadge>,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <BarChart3 className="size-4" />
            المرحلة 7: لوحات مؤشرات الأداء، التصدير العالمي وقوالب الطباعة
          </div>
          <h1 className="mt-2 text-3xl font-black">مركز التقارير التشغيلية المتقدمة (Phase 7 Reports Hub)</h1>
          <p className="text-sm text-muted-foreground">عرض معدلات الإشغال والتحصيل، تصدير الجداول لـ CSV وتجهيز قوالب الطباعة لكشوف الحسابات.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportArrearsCsv} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Download className="size-4" /> تصدير تقرير المتأخرات CSV
          </Button>
          <Button variant="secondary" onClick={exportSettlementsCsv} className="gap-2">
            <Download className="size-4" /> تصدير تسويات الملاك CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="معدل إشغال العقارات" value={`${occupancyRate.toFixed(1)}%`} sub={`${occupiedUnits} من أصل ${units.length} وحدة مؤجرة`} accent="primary" icon={PieChart} />
        <KpiCard label="معدل تحصيل الإيجارات" value={`${collectionRate.toFixed(1)}%`} sub={`${formatArabicNumber(totalCollected)} ر.س محصّلة`} accent="emerald" icon={TrendingUp} />
        <KpiCard label="إجمالي المتأخرات المالية" value={`${formatArabicNumber(totalArrears)} ر.س`} sub={`${arrearsInvoices.length} فاتورة غير مدفوعة`} accent="rose" icon={FileSpreadsheet} />
        <KpiCard label="صافي أرباح المكتب" value={`${formatArabicNumber(profitability.netRevenue)} ر.س`} sub="العائد التشغيلي الصافي" accent="sky" icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-black">طباعة كشوف الحسابات المالية (Statements Print Engine)</CardTitle>
            <CardDescription>إصدار كشوف حساب تفصيلية للملاك والمستأجرين مهيأة للطباعة ومشاركة PDF</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select onChange={(e) => { const o = ownersQuery.data.find((item) => item.id === e.target.value); if (o) setPrintOwnerStatement(o); }} value="" className="w-48">
              <option value="">طباعة كشف حساب مالك...</option>
              {ownersQuery.data.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
            <Select onChange={(e) => { const t = tenantsQuery.data.find((item) => item.id === e.target.value); if (t) setPrintTenantStatement(t); }} value="" className="w-52">
              <option value="">طباعة كشف حساب مستأجر...</option>
              {tenantsQuery.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm font-semibold text-muted-foreground">
            اختر مالكاً أو مستأجراً من القوائم أعلاه لمعاينة وطابعتة كشف الحساب المالي المعتمد.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-black">قائمة الفواتير المتأخرة وغير المدفوعة (Arrears & Aging List)</CardTitle>
          <CardDescription>الفواتير المستحقة بانتظار المتابعة والتحصيل</CardDescription>
        </CardHeader>
        <CardContent>
          <EntityTable<Invoice>
            aria-label="جدول المتأخرات"
            rows={arrearsInvoices}
            keyOf={(i) => i.id}
            emptyTitle="لا توجد متأخرات مالية"
            emptyDescription="كافة المطالبات المالية محصّلة بنجاح."
            columns={arrearsCols}
          />
        </CardContent>
      </Card>

      {/* Owner Statement Print Dialog */}
      <Dialog open={Boolean(printOwnerStatement)} onOpenChange={(open) => { if (!open) setPrintOwnerStatement(null); }}>
        <DialogContent className="max-w-3xl print:max-w-none print:border-none print:shadow-none print:p-0" dir="rtl">
          {printOwnerStatement && (
            <div className="space-y-6 bg-white p-6 text-slate-900 print:p-8">
              <div className="border-b border-slate-200 pb-4 text-center">
                <p className="text-xs font-black tracking-widest text-slate-500 uppercase">كشف حساب مالك عقارات رسمى</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{printOwnerStatement.name}</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">الهاتف: <span dir="ltr">{printOwnerStatement.phone}</span> {printOwnerStatement.email ? `· ${printOwnerStatement.email}` : ''}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-black border-b pb-2">التسويات المالية المستحقة</h3>
                {agreements.filter((a) => a.ownerId === printOwnerStatement.id).map((agr) => {
                  const propReceipts = receipts.filter((r) => getReceiptPropertyId(r, invoices, contracts) === agr.propertyId);
                  const propExpenses = expenses.filter((e) => e.propertyId === agr.propertyId);
                  const s = calculateOwnerSettlement(agr, propReceipts, propExpenses);
                  const prop = propertiesQuery.data.find((p) => p.id === agr.propertyId);
                  return (
                    <div key={agr.id} className="rounded-xl border bg-slate-50 p-4 text-sm">
                      <div className="flex justify-between font-black text-base mb-2">
                        <span>العقار: {prop?.name ?? agr.propertyId}</span>
                        <span className="text-emerald-700">صافي المستحق: {formatArabicNumber(s.netPayout)} ر.س</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                        <div>إجمالي الإيرادات: {formatArabicNumber(s.grossRevenue)} ر.س</div>
                        <div>الخصومات والأتعاب: {formatArabicNumber(s.feesDeducted)} ر.س</div>
                        <div>المصروفات: {formatArabicNumber(s.expensesDeducted)} ر.س</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-4 print:hidden">
                <Button variant="secondary" onClick={() => setPrintOwnerStatement(null)}>إغلاق</Button>
                <Button onClick={() => window.print()} className="gap-2"><Printer className="size-4" /> طباعة كشف الحساب</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tenant Statement Print Dialog */}
      <Dialog open={Boolean(printTenantStatement)} onOpenChange={(open) => { if (!open) setPrintTenantStatement(null); }}>
        <DialogContent className="max-w-2xl print:max-w-none print:border-none print:shadow-none print:p-0" dir="rtl">
          {printTenantStatement && (
            <div className="space-y-6 bg-white p-6 text-slate-900 print:p-8">
              <div className="border-b border-slate-200 pb-4 text-center">
                <p className="text-xs font-black tracking-widest text-slate-500 uppercase">كشف حساب مستأجر عقارى</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{printTenantStatement.name}</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">الهاتف: <span dir="ltr">{printTenantStatement.phone}</span></p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-black border-b pb-2">سجل الفواتير والدفعات</h3>
                {contracts.filter((c) => c.tenantId === printTenantStatement.id).map((contract) => {
                  const invs = invoices.filter((i) => i.contractId === contract.id);
                  const unit = unitsQuery.data.find((u) => u.id === contract.unitId);
                  return (
                    <div key={contract.id} className="space-y-2 rounded-xl border bg-slate-50 p-4 text-sm">
                      <p className="font-black text-base text-primary">العقد #{contract.id} · الوحدة: {unit?.name ?? contract.unitId}</p>
                      {invs.map((inv) => {
                        const paid = receipts.filter((r) => r.invoiceId === inv.id).reduce((s, r) => s + r.amount, 0);
                        return (
                          <div key={inv.id} className="flex justify-between items-center border-b border-slate-200/60 py-1.5 text-xs">
                            <span>فاتورة #{inv.id} ({inv.dueDate})</span>
                            <span>إجمالي: {formatArabicNumber(inv.amount)} ر.س | مسدد: {formatArabicNumber(paid)} | متبقي: <strong className="text-rose-600">{formatArabicNumber(inv.amount - paid)} ر.س</strong></span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-4 print:hidden">
                <Button variant="secondary" onClick={() => setPrintTenantStatement(null)}>إغلاق</Button>
                <Button onClick={() => window.print()} className="gap-2"><Printer className="size-4" /> طباعة كشف المستأجر</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
