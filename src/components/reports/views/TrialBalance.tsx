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


const TrialBalance: React.FC = () => {
  const { db, settings } = useApp();
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';

  const trialBalanceData = useMemo(() => {
    const end = new Date(endDate);
    const balances = new Map<string, { debit: number; credit: number }>();
    db.accounts.forEach(acc => balances.set(acc.id, { debit: 0, credit: 0 }));
    db.journalEntries.filter(je => new Date(je.date) <= end).forEach(je => {
      const balance = balances.get(je.accountId);
      if (balance) {
        if (je.type === 'DEBIT') balance.debit += je.amount;
        if (je.type === 'CREDIT') balance.credit += je.amount;
      }
    });
    const accountsMap = new Map(db.accounts.map(acc => [acc.id, acc]));
    let totalDebit = 0, totalCredit = 0;
    const reportLines = Array.from(balances.entries()).map(([accountId, { debit, credit }]) => {
      const account = accountsMap.get(accountId)!;
      const balance = debit - credit;
      const finalDebit = balance > 0 ? balance : 0;
      const finalCredit = balance < 0 ? -balance : 0;
      totalDebit += finalDebit;
      totalCredit += finalCredit;
      return { no: account.no, name: account.name, debit: finalDebit, credit: finalCredit };
    }).filter(line => line.debit > 0 || line.credit > 0).sort((a, b) => a.no.localeCompare(b.no));
    return { lines: reportLines, totalDebit, totalCredit };
  }, [db.accounts, db.journalEntries, endDate]);

  const handleExportPdf = () => exportTrialBalanceToPdf(trialBalanceData, settings, endDate);
  const isBalanced = Math.abs(trialBalanceData.totalDebit - trialBalanceData.totalCredit) < 0.01;

  const reportContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right border-collapse">
        <thead>
          <tr className="bg-background text-text-muted text-xs uppercase">
            <th className="px-4 py-3 border border-border">رقم الحساب</th>
            <th className="px-4 py-3 border border-border">اسم الحساب</th>
            <th className="px-4 py-3 border border-border">مدين</th>
            <th className="px-4 py-3 border border-border">دائن</th>
          </tr>
        </thead>
        <tbody>
          {trialBalanceData.lines.map(line => (
            <tr key={line.no} className="bg-card hover:bg-background/50">
              <td className="px-4 py-3 font-mono border border-border">{line.no}</td>
              <td className="px-4 py-3 border border-border">{line.name}</td>
              <td className="px-4 py-3 font-mono border border-border">{line.debit > 0 ? formatCurrency(line.debit, cur) : '-'}</td>
              <td className="px-4 py-3 font-mono border border-border">{line.credit > 0 ? formatCurrency(line.credit, cur) : '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-primary/5 text-text">
            <td colSpan={2} className="px-4 py-3 text-left border border-border">الإجمالي</td>
            <td className="px-4 py-3 font-mono border border-border">{formatCurrency(trialBalanceData.totalDebit, cur)}</td>
            <td className="px-4 py-3 font-mono border border-border">{formatCurrency(trialBalanceData.totalCredit, cur)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ميزان المراجعة" icon={<Filter size={20} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniKpi label="إجمالي المدين" value={formatCurrency(trialBalanceData.totalDebit, cur)} icon={<ArrowUp size={16} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <MiniKpi label="إجمالي الدائن" value={formatCurrency(trialBalanceData.totalCredit, cur)} icon={<ArrowDown size={16} />} color="bg-purple-100 dark:bg-purple-900/40 text-purple-600" />
        <MiniKpi label="حالة التوازن" value={isBalanced ? 'متوازن' : 'غير متوازن'} icon={isBalanced ? <ArrowUp size={16} /> : <ArrowDown size={16} />} color={isBalanced ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'bg-red-100 dark:bg-red-900/40 text-red-600'} />
      </div>
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">حتى تاريخ</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="ميزان المراجعة" date={`حتى تاريخ ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ميزان المراجعة"><ReportPrintableContent title="ميزان المراجعة" date={`حتى تاريخ ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default TrialBalance;
