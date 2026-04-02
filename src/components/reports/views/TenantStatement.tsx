import React, { useMemo, useEffect, useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import Card from '../../ui/Card';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import {
  FileText, BarChart3, TrendingUp, Wallet, TrendingDown, Users,
  PieChart, ArrowUp, ArrowDown, Banknote, Percent,
  Building2, CalendarRange, Filter, Zap
} from 'lucide-react';
import { UtilityRecord, UtilityType, UTILITY_TYPE_AR, UTILITY_ICON } from '../../../types';
import PrintPreviewModal from '../../shared/PrintPreviewModal';
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
  const { db, settings, contractBalances } = useApp();
  const [selectedContractId, setSelectedContractId] = useState<string>(db.contracts[0]?.id || '');
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';

  const statementData = useMemo(() => {
    if (!selectedContractId) return null;
    const contract = db.contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;
    const tenant = db.tenants.find(t => t.id === contract.tenantId);
    const unit = db.units.find(u => u.id === contract.unitId);
    const property = db.properties.find(p => p.id === unit?.propertyId);
    const invoices = db.invoices.filter(inv => inv.contractId === contract.id);
    const receipts = db.receipts.filter(r => r.contractId === contract.id && r.status === 'POSTED');
    let transactions: { date: string; description: string; debit: number; credit: number }[] = [];
    invoices.forEach(inv => transactions.push({ date: inv.dueDate, description: inv.notes || `فاتورة رقم ${inv.no}`, debit: inv.amount + (inv.taxAmount || 0), credit: 0 }));
    const channelLabels: Record<string, string> = { CASH: 'نقدي', BANK: 'تحويل بنكي', POS: 'شبكة', OTHER: 'أخرى' };
    receipts.forEach(r => transactions.push({ date: r.dateTime, description: `دفعة (${channelLabels[r.channel] || r.channel}) - سند ${r.no}`, debit: 0, credit: r.amount }));
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    const statement = transactions.map(tx => { balance += tx.debit - tx.credit; return { ...tx, balance }; });
    const finalBalance = contractBalances[contract.id]?.balance || 0;
    return { contract, tenant, unit, property, statement, finalBalance };
  }, [selectedContractId, db, contractBalances]);

  const handleExportPdf = () => { if (statementData) exportTenantStatementToPdf(statementData, settings); };

  const reportContent = statementData && (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 border rounded-lg border-border mb-6 bg-background">
        <div><span className="text-text-muted text-xs">المستأجر:</span> <span className="font-bold block">{statementData.tenant?.name}</span></div>
        <div><span className="text-text-muted text-xs">العقار:</span> <span className="font-bold block">{statementData.property?.name}</span></div>
        <div><span className="text-text-muted text-xs">الهاتف:</span> <span className="font-bold block">{statementData.tenant?.phone}</span></div>
        <div><span className="text-text-muted text-xs">الوحدة:</span> <span className="font-bold block">{statementData.unit?.name}</span></div>
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
                <td className="px-4 py-3 border border-border">{formatDate(tx.date)}</td>
                <td className="px-4 py-3 border border-border">{tx.description}</td>
                <td className="px-4 py-3 text-red-500 border border-border font-mono">{tx.debit > 0 ? formatCurrency(tx.debit, cur) : '-'}</td>
                <td className="px-4 py-3 text-green-500 border border-border font-mono">{tx.credit > 0 ? formatCurrency(tx.credit, cur) : '-'}</td>
                <td className="px-4 py-3 font-bold border border-border font-mono">{formatCurrency(tx.balance, cur)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-primary/5 text-text">
              <td colSpan={4} className="px-4 py-3 text-left border border-border">الرصيد النهائي المستحق</td>
              <td className="px-4 py-3 border border-border font-mono">{formatCurrency(statementData.finalBalance, cur)}</td>
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
          <MiniKpi label="إجمالي الفواتير" value={formatCurrency(statementData.statement.reduce((s, tx) => s + tx.debit, 0), cur)} icon={<FileText size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
          <MiniKpi label="إجمالي المدفوع" value={formatCurrency(statementData.statement.reduce((s, tx) => s + tx.credit, 0), cur)} icon={<ArrowDown size={16} />} color="bg-green-100 dark:bg-green-900/40 text-green-600" />
          <MiniKpi label="الرصيد المستحق" value={formatCurrency(statementData.finalBalance, cur)} icon={<Wallet size={16} />} color={statementData.finalBalance > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-green-100 dark:bg-green-900/40 text-green-600'} />
        </div>
      )}
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div className="flex-grow max-w-md">
          <label className="block text-xs font-medium text-text-muted mb-1">اختر العقد</label>
          <select value={selectedContractId} onChange={e => setSelectedContractId(e.target.value)} className="w-full text-sm">
            <option value="">-- اختر --</option>
            {db.contracts.map(c => { const t = db.tenants.find(t => t.id === c.tenantId); const u = db.units.find(u => u.id === c.unitId); return <option key={c.id} value={c.id}>{u?.name} / {t?.name} (يبدأ في {c.start})</option>; })}
          </select>
        </div>
      </ActionBar>
      {reportContent && <ReportPrintableContent title="كشف حساب مستأجر" date={`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`}>{reportContent}</ReportPrintableContent>}
      {isPrinting && reportContent && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="كشف حساب المستأجر"><ReportPrintableContent title="كشف حساب مستأجر" date={`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default TenantStatement;
