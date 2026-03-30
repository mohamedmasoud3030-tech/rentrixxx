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


const IncomeStatement: React.FC = () => {
  const { db, settings } = useApp();
  const today = new Date();
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';
  const data = useMemo(() => calculateIncomeStatementData(db, startDate, endDate), [db, startDate, endDate]);
  const handleExportPdf = () => exportIncomeStatementToPdf(data, settings, `للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`);

  const chartData = useMemo(() => {
    const items = [
      ...data.revenues.map(r => ({ name: r.name, value: r.balance, type: 'revenue' })),
      ...data.expenses.map(e => ({ name: e.name, value: e.balance, type: 'expense' })),
    ];
    return items;
  }, [data]);

  const reportContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold border-b-2 border-emerald-500 pb-2 mb-4 flex items-center gap-2"><TrendingUp className="text-emerald-500" size={20} /> الإيرادات</h3>
          {data.revenues.map(item => (
            <div key={item.no} className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0">
              <span>{item.name}</span>
              <span className="font-mono font-bold text-emerald-600">{formatCurrency(item.balance, cur)}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold pt-3 mt-2 border-t-2 border-emerald-500">
            <span>إجمالي الإيرادات</span>
            <span className="text-emerald-600">{formatCurrency(data.totalRevenue, cur)}</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold border-b-2 border-red-500 pb-2 mb-4 flex items-center gap-2"><TrendingDown className="text-red-500" size={20} /> المصروفات</h3>
          {data.expenses.map(item => (
            <div key={item.no} className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0">
              <span>{item.name}</span>
              <span className="font-mono font-bold text-red-600">({formatCurrency(item.balance, cur)})</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold pt-3 mt-2 border-t-2 border-red-500">
            <span>إجمالي المصروفات</span>
            <span className="text-red-600">({formatCurrency(data.totalExpense, cur)})</span>
          </div>
        </div>
      </div>
      <div className={`p-5 rounded-xl text-center ${data.netIncome >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
        <p className="text-sm text-text-muted mb-1">صافي الربح / (الخسارة)</p>
        <p className={`text-3xl font-black ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(data.netIncome, cur)}</p>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="قائمة الدخل" icon={<TrendingUp size={20} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniKpi label="إجمالي الإيرادات" value={formatCurrency(data.totalRevenue, cur)} icon={<ArrowUp size={16} />} color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" />
        <MiniKpi label="إجمالي المصروفات" value={formatCurrency(data.totalExpense, cur)} icon={<ArrowDown size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="صافي الدخل" value={formatCurrency(data.netIncome, cur)} icon={<Banknote size={16} />} color={data.netIncome >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-red-100 dark:bg-red-900/40 text-red-600'} />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-background rounded-xl p-4 border border-border">
            <p className="text-sm font-bold mb-3 text-text-muted">توزيع الإيرادات</p>
            <div className="h-48 overflow-hidden" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={data.revenues} dataKey="balance" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {data.revenues.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-background rounded-xl p-4 border border-border">
            <p className="text-sm font-bold mb-3 text-text-muted">توزيع المصروفات</p>
            <div className="h-48 overflow-hidden" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={data.expenses} dataKey="balance" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {data.expenses.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">من</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">إلى</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="قائمة الدخل" date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="قائمة الدخل"><ReportPrintableContent title="قائمة الدخل" date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default IncomeStatement;
