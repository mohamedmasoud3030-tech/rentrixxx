import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subYears } from 'date-fns';
import { useApp } from '../../../contexts/AppContext';
import Card from '../../ui/Card';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { ActionBar, MiniKpi, ReportPrintableContent, SectionHeader } from '../ReportPrimitives';
import PrintPreviewModal from '../../shared/PrintPreviewModal';
import { exportIncomeStatementToPdf } from '../../../services/pdfService';
import { calculateIncomeStatementData } from '../../../services/accountingService';

const KEY = 'rentrix:report_filters:income_statement';

const toInput = (d: Date) => d.toISOString().slice(0, 10);

const IncomeStatement: React.FC = () => {
  const { db, settings } = useApp();
  const now = new Date();
  const [startDate, setStartDate] = useState(toInput(startOfYear(now)));
  const [endDate, setEndDate] = useState(toInput(now));
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { startDate?: string; endDate?: string };
      if (parsed.startDate) setStartDate(parsed.startDate);
      if (parsed.endDate) setEndDate(parsed.endDate);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify({ startDate, endDate }));
  }, [startDate, endDate]);

  const current = useMemo(() => calculateIncomeStatementData(db, startDate, endDate), [db, startDate, endDate]);

  const previousPeriod = useMemo(() => {
    const prevStart = toInput(subYears(new Date(startDate), 1));
    const prevEnd = toInput(subYears(new Date(endDate), 1));
    return calculateIncomeStatementData(db, prevStart, prevEnd);
  }, [db, startDate, endDate]);

  const trend = useMemo(() => {
    const base = previousPeriod.netIncome;
    if (Math.abs(base) < 0.001) return 0;
    return ((current.netIncome - base) / Math.abs(base)) * 100;
  }, [current.netIncome, previousPeriod.netIncome]);

  const setRange = (mode: 'month' | 'quarter' | 'year') => {
    const n = new Date();
    if (mode === 'month') {
      setStartDate(toInput(startOfMonth(n)));
      setEndDate(toInput(endOfMonth(n)));
      return;
    }
    if (mode === 'quarter') {
      setStartDate(toInput(startOfQuarter(n)));
      setEndDate(toInput(endOfQuarter(n)));
      return;
    }
    setStartDate(toInput(startOfYear(n)));
    setEndDate(toInput(endOfYear(n)));
  };

  const printable = (
    <div className="space-y-4">
      <div>
        <h4 className="font-black mb-2 text-emerald-700">الإيرادات</h4>
        {current.revenues.map((line) => (
          <div key={line.id} className="flex justify-between py-1 border-b border-border/40 text-sm">
            <span>{line.name}</span>
            <span dir="ltr" className="font-mono">{formatCurrency(line.balance)}</span>
          </div>
        ))}
      </div>
      <div>
        <h4 className="font-black mb-2 text-rose-700">المصروفات</h4>
        {current.expenses.map((line) => (
          <div key={line.id} className="flex justify-between py-1 border-b border-border/40 text-sm">
            <span>{line.name}</span>
            <span dir="ltr" className="font-mono">{formatCurrency(line.balance)}</span>
          </div>
        ))}
      </div>
      <div className={`p-3 rounded-lg ${current.netIncome >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        صافي الدخل: <span className="font-black" dir="ltr">{formatCurrency(current.netIncome)}</span>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <div dir="rtl">
      <SectionHeader title="قائمة الدخل" icon={<TrendingUp size={18} className="text-primary" />} />

      <div className="flex flex-wrap gap-2 mb-4">
        <button className="btn btn-ghost" onClick={() => setRange('month')}>الشهر الحالي</button>
        <button className="btn btn-ghost" onClick={() => setRange('quarter')}>الربع الحالي</button>
        <button className="btn btn-ghost" onClick={() => setRange('year')}>السنة الحالية</button>
        <button className="btn btn-ghost" onClick={() => undefined}>مخصص</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <MiniKpi label="إجمالي الإيرادات" value={formatCurrency(current.totalRevenue)} icon={<TrendingUp size={14} />} color="bg-emerald-100 text-emerald-700" />
        <MiniKpi label="إجمالي المصروفات" value={formatCurrency(current.totalExpense)} icon={<TrendingUp size={14} />} color="bg-rose-100 text-rose-700" />
        <MiniKpi label="صافي الدخل" value={formatCurrency(current.netIncome)} icon={<TrendingUp size={14} />} color={current.netIncome >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} />
        <MiniKpi label="مقارنة سنوية" value={`${trend.toFixed(2)}%`} icon={<TrendingUp size={14} />} color={trend >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'} />
      </div>

      <ActionBar
        onPrint={() => setIsPrinting(true)}
        onExport={() => exportIncomeStatementToPdf(current, settings, `للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`)}
      >
        <div>
          <label className="block text-xs mb-1 text-text-muted">من تاريخ</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs mb-1 text-text-muted">إلى تاريخ</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </ActionBar>

      <ReportPrintableContent title="قائمة الدخل" date={`من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>
        {printable}
      </ReportPrintableContent>

      {isPrinting && (
        <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="قائمة الدخل">
          <ReportPrintableContent title="قائمة الدخل" date={`من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>
            {printable}
          </ReportPrintableContent>
        </PrintPreviewModal>
      )}
      </div>
    </Card>
  );
};

export default IncomeStatement;
