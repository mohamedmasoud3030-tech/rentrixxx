import React, { useEffect, useMemo, useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import Card from '../../ui/Card';
import { exportToCsv, formatCurrency, formatDate } from '../../../utils/helpers';
import { ActionBar, MiniKpi, ReportPrintableContent, SectionHeader } from '../ReportPrimitives';
import PrintPreviewModal from '../../shared/PrintPreviewModal';
import { calculateTrialBalanceData } from '../../../services/accountingService';
import { exportTrialBalanceToPdf } from '../../../services/pdfService';

const KEY = 'rentrix:report_filters:trial_balance';

const TrialBalance: React.FC = () => {
  const { db, settings } = useApp();
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { endDate?: string };
      if (parsed.endDate) setEndDate(parsed.endDate);
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify({ endDate }));
  }, [endDate]);

  const data = useMemo(() => calculateTrialBalanceData(db, endDate), [db, endDate]);

  const exportCsv = () => {
    exportToCsv('trial_balance', data.lines.map((line) => ({
      'رقم الحساب': line.no,
      'اسم الحساب': line.name,
      'إجمالي مدين': line.totalDebit.toFixed(3),
      'إجمالي دائن': line.totalCredit.toFixed(3),
      'صافي الرصيد': line.netBalance.toFixed(3),
    })));
  };

  const pdfData = {
    lines: data.lines.map((line) => ({ no: line.no, name: line.name, debit: line.totalDebit, credit: line.totalCredit })),
    totalDebit: data.totalDebit,
    totalCredit: data.totalCredit,
  };

  const printable = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-background text-xs text-text-muted">
            <th className="px-4 py-2 border border-border text-right">رقم</th>
            <th className="px-4 py-2 border border-border text-right">الحساب</th>
            <th className="px-4 py-2 border border-border text-right">إجمالي مدين</th>
            <th className="px-4 py-2 border border-border text-right">إجمالي دائن</th>
            <th className="px-4 py-2 border border-border text-right">صافي الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line) => {
            const debitNormal = line.type === 'ASSET' || line.type === 'EXPENSE';
            const healthy = debitNormal ? line.netBalance >= 0 : line.netBalance >= 0;
            return (
              <tr key={line.id}>
                <td className="px-4 py-2 border border-border font-mono">{line.no}</td>
                <td className="px-4 py-2 border border-border">{line.name}</td>
                <td className="px-4 py-2 border border-border font-mono" dir="ltr">{formatCurrency(line.totalDebit)}</td>
                <td className="px-4 py-2 border border-border font-mono" dir="ltr">{formatCurrency(line.totalCredit)}</td>
                <td className={`px-4 py-2 border border-border font-mono ${healthy ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">{formatCurrency(line.netBalance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <div dir="rtl">
      <SectionHeader title="ميزان المراجعة" icon={<Filter size={18} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <MiniKpi label="إجمالي المدين" value={formatCurrency(data.totalDebit)} icon={<Download size={14} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="إجمالي الدائن" value={formatCurrency(data.totalCredit)} icon={<Download size={14} />} color="bg-purple-100 text-purple-700" />
        <MiniKpi label="الحالة" value={data.isBalanced ? 'متوازن' : 'غير متوازن'} icon={<Download size={14} />} color={data.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} />
      </div>

      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => exportTrialBalanceToPdf(pdfData, settings, endDate)}>
        <div>
          <label className="block text-xs text-text-muted mb-1">تاريخ نهاية الفترة</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={exportCsv}>CSV/Excel</button>
      </ActionBar>

      <ReportPrintableContent title="ميزان المراجعة" date={`حتى تاريخ ${formatDate(endDate)}`}>
        {printable}
      </ReportPrintableContent>

      {isPrinting && (
        <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ميزان المراجعة">
          <ReportPrintableContent title="ميزان المراجعة" date={`حتى تاريخ ${formatDate(endDate)}`}>
            {printable}
          </ReportPrintableContent>
        </PrintPreviewModal>
      )}
      </div>
    </Card>
  );
};

export default TrialBalance;
