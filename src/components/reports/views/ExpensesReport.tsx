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
import { getPostedExpensesInRange } from '../../../services/financeService';
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


const ExpensesReport: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [isPrinting, setIsPrinting] = useState(false);
  const [fromDate, setFromDate] = useState(startOfYear(new Date()).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const expenses = useMemo(() => {
    return getPostedExpensesInRange(db.expenses, fromDate, toDate);
  }, [db.expenses, fromDate, toDate]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MiniKpi label="إجمالي المصروفات" value={formatCurrency(totalExpenses, cur)} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-700" />
        <MiniKpi label="عدد المصروفات" value={String(expenses.length)} icon={<FileText size={18} />} color="bg-gray-100 text-gray-700" />
      </div>
      {byCategory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold mb-3">توزيع المصروفات حسب الفئة</h4>
          <div className="space-y-2">{byCategory.map(([cat, amt]) => (
            <div key={cat} className="flex justify-between items-center p-2 bg-background rounded">
              <span className="text-sm">{cat}</span>
              <span className="font-bold text-sm">{formatCurrency(amt, cur)}</span>
            </div>
          ))}</div>
        </div>
      )}
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">الرقم</th>
          <th className="px-3 py-2 border border-border">التاريخ</th>
          <th className="px-3 py-2 border border-border">الفئة</th>
          <th className="px-3 py-2 border border-border">المستفيد</th>
          <th className="px-3 py-2 border border-border">المبلغ</th>
          <th className="px-3 py-2 border border-border">ملاحظات</th>
        </tr></thead>
        <tbody>{expenses.map(e => (
          <tr key={e.id} className="hover:bg-background">
            <td className="px-3 py-2 border border-border">{e.no}</td>
            <td className="px-3 py-2 border border-border">{formatDate(e.dateTime)}</td>
            <td className="px-3 py-2 border border-border">{e.category}</td>
            <td className="px-3 py-2 border border-border">{e.payee || '-'}</td>
            <td className="px-3 py-2 border border-border font-bold">{formatCurrency(e.amount, cur)}</td>
            <td className="px-3 py-2 border border-border">{e.notes || '-'}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={4} className="px-3 py-2 border border-border">الإجمالي</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalExpenses, cur)}</td>
          <td className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="تقرير المصروفات" icon={<TrendingDown size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => exportExpensesReportToPdf(expenses, byCategory, totalExpenses, settings, `${formatDate(fromDate)} - ${formatDate(toDate)}`)}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">من</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">إلى</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-sm" /></div>
      </ActionBar>
      <ReportPrintableContent title="تقرير المصروفات" date={`${formatDate(fromDate)} - ${formatDate(toDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="تقرير المصروفات"><ReportPrintableContent title="تقرير المصروفات" date={`${formatDate(fromDate)} - ${formatDate(toDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default ExpensesReport;
