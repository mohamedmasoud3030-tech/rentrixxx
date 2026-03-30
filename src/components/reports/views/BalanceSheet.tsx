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


const BalanceSheet: React.FC = () => {
  const { db, settings } = useApp();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';
  const data = useMemo(() => calculateBalanceSheetData(db, asOfDate), [db, asOfDate]);
  const handleExportPdf = () => exportBalanceSheetToPdf(data, settings, asOfDate);

  const renderLines = (lines: BalanceSheetLine[], indent = 0) => (
    <>
      {lines.map(line => (
        <React.Fragment key={line.no}>
          <tr className={line.isParent ? 'font-bold bg-background' : 'hover:bg-background/50'}>
            <td className="p-2.5 border border-border" style={{ paddingRight: `${1 + indent}rem` }}>{line.name}</td>
            <td className={`p-2.5 border border-border font-mono ${line.balance < 0 ? 'text-red-500' : ''}`}>
              {Math.abs(line.balance) > 0.001 ? formatCurrency(line.balance, cur) : '-'}
            </td>
          </tr>
          {line.children && renderLines(line.children, indent + 1.5)}
        </React.Fragment>
      ))}
    </>
  );

  const isBalanced = Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01;

  const reportContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Wallet size={18} className="text-blue-500" /> الأصول</h3>
        <table className="w-full text-sm border-collapse border border-border">
          <tbody>{renderLines(data.assets)}</tbody>
          <tfoot><tr className="font-black text-base bg-blue-50 dark:bg-blue-900/20"><td className="p-2.5 border border-border">إجمالي الأصول</td><td className="p-2.5 border border-border font-mono">{formatCurrency(data.totalAssets, cur)}</td></tr></tfoot>
        </table>
      </div>
      <div>
        <h3 className="text-lg font-bold mb-3">الالتزامات وحقوق الملكية</h3>
        <table className="w-full text-sm border-collapse border border-border">
          <tbody>
            {renderLines(data.liabilities)}
            <tr className="font-bold bg-background"><td className="p-2.5 border border-border">إجمالي الالتزامات</td><td className="p-2.5 border border-border font-mono">{formatCurrency(data.totalLiabilities, cur)}</td></tr>
            {renderLines(data.equity)}
            <tr className="font-bold bg-background"><td className="p-2.5 border border-border">إجمالي حقوق الملكية</td><td className="p-2.5 border border-border font-mono">{formatCurrency(data.totalEquity, cur)}</td></tr>
          </tbody>
          <tfoot><tr className="font-black text-base bg-blue-50 dark:bg-blue-900/20"><td className="p-2.5 border border-border">إجمالي الالتزامات وحقوق الملكية</td><td className="p-2.5 border border-border font-mono">{formatCurrency(data.totalLiabilities + data.totalEquity, cur)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="الميزانية العمومية" icon={<Wallet size={20} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniKpi label="إجمالي الأصول" value={formatCurrency(data.totalAssets, cur)} icon={<ArrowUp size={16} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <MiniKpi label="إجمالي الالتزامات" value={formatCurrency(data.totalLiabilities, cur)} icon={<ArrowDown size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="التوازن" value={isBalanced ? 'متوازنة' : 'غير متوازنة'} icon={isBalanced ? <ArrowUp size={16} /> : <ArrowDown size={16} />} color={isBalanced ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'bg-red-100 dark:bg-red-900/40 text-red-600'} />
      </div>
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">حتى تاريخ</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="الميزانية العمومية" date={`كما في تاريخ ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="الميزانية العمومية"><ReportPrintableContent title="الميزانية العمومية" date={`كما في تاريخ ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default BalanceSheet;
