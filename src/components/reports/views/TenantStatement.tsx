import React, { useMemo, useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import Card from '../../ui/Card';
import {
  FileText, BarChart3, TrendingUp, Wallet, TrendingDown, Users,
  PieChart, ArrowUp, ArrowDown, Banknote, Percent,
  Building2, CalendarRange, Filter, Zap
} from 'lucide-react';
import { UtilityRecord, UtilityType, UTILITY_TYPE_AR, UTILITY_ICON } from '../../../types';
import { ActionBar, CHART_COLORS, MiniKpi, ReportPrintableContent, SectionHeader } from '../ReportPrimitives';
import {
  exportRentRollToPdf, exportOwnerLedgerToPdf, exportTenantStatementToPdf,
  exportIncomeStatementToPdf, exportTrialBalanceToPdf, exportBalanceSheetToPdf,
  exportAgedReceivablesToPdf, exportDailyCollectionToPdf, exportExpensesReportToPdf,
  exportDepositsReportToPdf, exportMaintenanceReportToPdf, exportOverdueTenantsToPdf,
  exportVacantUnitsToPdf, exportUtilitiesReportToPdf, exportPropertyReportToPdf
} from '../../../services/pdfService';
import { calculateBalanceSheetData, calculateIncomeStatementData, calculateAgedReceivables } from '../../../services/accountingService';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval, format, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart as RechartsPie, Pie, Cell, Legend, AreaChart, Area,
  LineChart, Line
} from 'recharts';
import { ReportTab } from '../ReportsSidebar';

interface OwnerLedgerTransaction {
  date: string;
  details: string;
  type: 'receipt' | 'expense' | 'settlement';
  gross: number;
  officeShare: number;
  net: number;
}

interface BalanceSheetLine {
  no: string;
  name: string;
  isParent: boolean;
  balance: number;
  children: BalanceSheetLine[];
}


const TenantStatement: React.FC = () => {
  const { db, settings, tenantBalances } = useApp();
  const [selectedTenantId, setSelectedTenantId] = useState<string>(db.tenants[0]?.id || '');

  const statementData = useMemo(() => {
    if (!selectedTenantId) return null;
    const tenant = db.tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return null;
    const tenantContracts = db.contracts.filter(c => c.tenantId === tenant.id);
    const contractIds = new Set(tenantContracts.map(c => c.id));
    const invoices = db.invoices.filter(inv => contractIds.has(inv.contractId));
    const receipts = db.receipts.filter(r => contractIds.has(r.contractId) && r.status !== 'VOID');

    let transactions: { date: string; description: string; debit: number; credit: number }[] = [];
    invoices.forEach(inv => transactions.push({
      date: inv.dueDate,
      description: inv.notes || `فاتورة رقم ${inv.no}`,
      debit: inv.amount + (inv.taxAmount || 0),
      credit: 0
    }));
    const channelLabels: Record<string, string> = { CASH: 'نقدي', BANK: 'تحويل بنكي', POS: 'شبكة', OTHER: 'أخرى' };
    receipts.forEach(r => transactions.push({ date: r.dateTime, description: `دفعة (${channelLabels[r.channel] || r.channel}) - سند ${r.no}`, debit: 0, credit: r.amount }));
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    const statement = transactions.map(tx => { balance += tx.debit - tx.credit; return { ...tx, balance }; });
    const finalBalance = tenantBalances[tenant.id]?.balance ?? balance;
    return { tenant, statement, finalBalance };
  }, [selectedTenantId, db, tenantBalances]);

  const handleExportPdf = () => { if (statementData) exportTenantStatementToPdf(statementData, settings); };
  const handlePrint = () => window.print();
  const formatStatementAmount = (amount: number) => `${amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ر.ع`;
  const formatStatementDate = (dateValue: string) => {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return dateValue;
    return format(d, 'dd/MM/yyyy');
  };

  const reportContent = statementData && (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 border rounded-lg border-border mb-6 bg-background">
        <div><span className="text-text-muted text-xs">المستأجر:</span> <span className="font-bold block">{statementData.tenant?.name}</span></div>
        <div><span className="text-text-muted text-xs">العقود:</span> <span className="font-bold block">{db.contracts.filter(c => c.tenantId === statementData.tenant?.id).length}</span></div>
        <div><span className="text-text-muted text-xs">الهاتف:</span> <span className="font-bold block">{statementData.tenant?.phone}</span></div>
        <div><span className="text-text-muted text-xs">إجمالي الحركات:</span> <span className="font-bold block">{statementData.statement.length}</span></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right border-collapse">
          <thead>
            <tr className="bg-background text-text-muted text-xs uppercase">
              <th className="px-4 py-3 border border-border">التاريخ</th>
              <th className="px-4 py-3 border border-border">البيان</th>
              <th className="px-4 py-3 border border-border">مدين</th>
              <th className="px-4 py-3 border border-border">دائن</th>
              <th className="px-4 py-3 border border-border">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {statementData.statement.map((tx, i) => (
              <tr key={i} className="bg-card hover:bg-background/50">
                <td className="px-4 py-3 border border-border">{formatStatementDate(tx.date)}</td>
                <td className="px-4 py-3 border border-border">{tx.description}</td>
                <td className="px-4 py-3 text-red-500 border border-border font-mono">{tx.debit > 0 ? formatStatementAmount(tx.debit) : '-'}</td>
                <td className="px-4 py-3 text-green-500 border border-border font-mono">{tx.credit > 0 ? formatStatementAmount(tx.credit) : '-'}</td>
                <td className="px-4 py-3 font-bold border border-border font-mono">{formatStatementAmount(tx.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-primary/5 text-text">
              <td colSpan={4} className="px-4 py-3 text-left border border-border">الرصيد النهائي المستحق</td>
              <td className="px-4 py-3 border border-border font-mono">{formatStatementAmount(statementData.finalBalance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="كشف حساب المستأجر" icon={<Users size={20} className="text-primary" />} />
      {statementData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <MiniKpi label="إجمالي الفواتير" value={formatStatementAmount(statementData.statement.reduce((s, tx) => s + tx.debit, 0))} icon={<FileText size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
          <MiniKpi label="إجمالي المدفوع" value={formatStatementAmount(statementData.statement.reduce((s, tx) => s + tx.credit, 0))} icon={<ArrowDown size={16} />} color="bg-green-100 dark:bg-green-900/40 text-green-600" />
          <MiniKpi label="الرصيد المستحق" value={formatStatementAmount(statementData.finalBalance)} icon={<Wallet size={16} />} color={statementData.finalBalance > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-green-100 dark:bg-green-900/40 text-green-600'} />
        </div>
      )}
      <ActionBar onPrint={handlePrint} onExport={handleExportPdf}>
        <div className="flex-grow max-w-md">
          <label className="block text-xs font-medium text-text-muted mb-1">اختر المستأجر</label>
          <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)} className="w-full text-sm">
            <option value="">-- اختر --</option>
            {db.tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.phone || 'بدون هاتف'})</option>)}
          </select>
        </div>
      </ActionBar>
      {reportContent && <ReportPrintableContent title="كشف حساب مستأجر" date={`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`}>{reportContent}</ReportPrintableContent>}
    </Card>
  );
};

export default TenantStatement;
