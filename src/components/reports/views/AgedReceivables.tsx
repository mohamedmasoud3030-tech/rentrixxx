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
import { ReportTab } from './ReportsSidebar';

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


const AgedReceivables: React.FC = () => {
  const { db, settings } = useApp();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';
  const data = useMemo(() => calculateAgedReceivables(db, asOfDate), [db, asOfDate]);
  const handleExportPdf = () => exportAgedReceivablesToPdf(data, settings, asOfDate);

  const agingChartData = useMemo(() => [
    { name: 'حالي', value: data.totals.current },
    { name: '1-30', value: data.totals['1-30'] },
    { name: '31-60', value: data.totals['31-60'] },
    { name: '61-90', value: data.totals['61-90'] },
    { name: '90+', value: data.totals['90+'] },
  ].filter(d => d.value > 0), [data]);

  const reportContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right border-collapse">
        <thead>
          <tr className="bg-background text-text-muted text-xs uppercase">
            <th className="px-3 py-3 border border-border">المستأجر</th>
            <th className="px-3 py-3 border border-border">الإجمالي</th>
            <th className="px-3 py-3 border border-border">حالي</th>
            <th className="px-3 py-3 border border-border">1-30 يوم</th>
            <th className="px-3 py-3 border border-border">31-60 يوم</th>
            <th className="px-3 py-3 border border-border">61-90 يوم</th>
            <th className="px-3 py-3 border border-border">+90 يوم</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} className="bg-card hover:bg-background/50">
              <td className="px-3 py-3 border border-border font-medium">{line.tenantName}</td>
              <td className="px-3 py-3 border border-border font-bold font-mono text-red-600">{formatCurrency(line.total, cur)}</td>
              <td className="px-3 py-3 border border-border font-mono">{line.current > 0 ? formatCurrency(line.current, cur) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono">{line['1-30'] > 0 ? formatCurrency(line['1-30'], cur) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono">{line['31-60'] > 0 ? formatCurrency(line['31-60'], cur) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono">{line['61-90'] > 0 ? formatCurrency(line['61-90'], cur) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono text-red-600">{line['90+'] > 0 ? formatCurrency(line['90+'], cur) : '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-primary/5 text-text">
            <td className="px-3 py-3 border border-border">الإجمالي</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals.total, cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals.current, cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals['1-30'], cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals['31-60'], cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals['61-90'], cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals['90+'], cur)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="تقرير أعمار الديون" icon={<CalendarRange size={20} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniKpi label="إجمالي الذمم" value={formatCurrency(data.totals.total, cur)} icon={<Users size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="عدد المستأجرين المدينين" value={String(data.lines.length)} icon={<Users size={16} />} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
        <MiniKpi label="ديون متأخرة +90 يوم" value={formatCurrency(data.totals['90+'], cur)} icon={<ArrowDown size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-700" />
      </div>

      {agingChartData.length > 0 && (
        <div className="bg-background rounded-xl p-4 border border-border mb-6">
          <p className="text-sm font-bold mb-3 text-text-muted">توزيع الذمم حسب العمر</p>
          <div className="h-48 overflow-hidden" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
                <Bar dataKey="value" name="المبلغ" radius={[4, 4, 0, 0]}>
                  {agingChartData.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#991b1b'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">حتى تاريخ</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="تقرير أعمار الديون" date={`كما في تاريخ ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="تقرير أعمار الديون"><ReportPrintableContent title="تقرير أعمار الديون" date={`كما في تاريخ ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default AgedReceivables;
