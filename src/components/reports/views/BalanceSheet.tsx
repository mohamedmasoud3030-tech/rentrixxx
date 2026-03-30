import React, { useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import Card from '../../ui/Card';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { ActionBar, MiniKpi, ReportPrintableContent, SectionHeader } from '../ReportPrimitives';
import PrintPreviewModal from '../../shared/PrintPreviewModal';
import { exportBalanceSheetToPdf } from '../../../services/pdfService';
import { calculateBalanceSheetData } from '../../../services/accountingService';

const KEY = 'rentrix:report_filters:balance_sheet';

const BalanceSheet: React.FC = () => {
  const { db, settings } = useApp();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { asOfDate?: string };
      if (parsed.asOfDate) setAsOfDate(parsed.asOfDate);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify({ asOfDate }));
  }, [asOfDate]);

  const data = useMemo(() => calculateBalanceSheetData(db, asOfDate), [db, asOfDate]);
  const discrepancy = Math.round((data.totalAssets - (data.totalLiabilities + data.totalEquity)) * 1000) / 1000;
  const isBalanced = Math.abs(discrepancy) < 0.001;

  const render = (lines: Array<{ id: string; no: string; name: string; balance: number; children: any[] }>, depth = 0): React.ReactNode => (
    <>
      {lines.map((line) => (
        <React.Fragment key={line.id}>
          <tr>
            <td className="px-3 py-2 border border-border" style={{ paddingRight: `${12 + depth * 14}px` }}>{line.name}</td>
            <td className="px-3 py-2 border border-border font-mono" dir="ltr">{formatCurrency(line.balance)}</td>
          </tr>
          {render(line.children || [], depth + 1)}
        </React.Fragment>
      ))}
    </>
  );

  const printable = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <table className="w-full text-sm border-collapse">
        <thead><tr><th className="px-3 py-2 border border-border text-right">الأصول</th><th className="px-3 py-2 border border-border text-right">الرصيد</th></tr></thead>
        <tbody>{render(data.assets)}</tbody>
      </table>
      <table className="w-full text-sm border-collapse">
        <thead><tr><th className="px-3 py-2 border border-border text-right">الالتزامات وحقوق الملكية</th><th className="px-3 py-2 border border-border text-right">الرصيد</th></tr></thead>
        <tbody>
          {render(data.liabilities)}
          {render(data.equity)}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <div dir="rtl">
      <SectionHeader title="الميزانية العمومية" icon={<Wallet size={18} className="text-primary" />} />

      <div className={`mb-4 p-3 rounded-lg border ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
        {isBalanced ? 'الميزانية متوازنة' : `خلل في الميزانية: ${Math.abs(discrepancy).toFixed(3)}`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <MiniKpi label="إجمالي الأصول" value={formatCurrency(data.totalAssets)} icon={<Wallet size={14} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="إجمالي الالتزامات" value={formatCurrency(data.totalLiabilities)} icon={<Wallet size={14} />} color="bg-amber-100 text-amber-700" />
        <MiniKpi label="إجمالي حقوق الملكية" value={formatCurrency(data.totalEquity)} icon={<Wallet size={14} />} color="bg-purple-100 text-purple-700" />
      </div>

      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => exportBalanceSheetToPdf(data, settings, asOfDate)}>
        <div>
          <label className="block text-xs mb-1 text-text-muted">حتى تاريخ</label>
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </div>
      </ActionBar>

      <ReportPrintableContent title="الميزانية العمومية" date={`كما في ${formatDate(asOfDate)}`}>
        {printable}
      </ReportPrintableContent>

      {isPrinting && (
        <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="الميزانية العمومية">
          <ReportPrintableContent title="الميزانية العمومية" date={`كما في ${formatDate(asOfDate)}`}>
            {printable}
          </ReportPrintableContent>
        </PrintPreviewModal>
      )}
      </div>
    </Card>
  );
};

export default BalanceSheet;
