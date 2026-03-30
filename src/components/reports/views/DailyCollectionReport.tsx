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


const DailyCollectionReport: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);

  const dayReceipts = useMemo(() => {
    return db.receipts.filter(r => r.status !== 'VOID' && r.dateTime && r.dateTime.slice(0, 10) === date);
  }, [db.receipts, date]);

  const totalCash = dayReceipts.filter(r => r.channel === 'CASH').reduce((s, r) => s + r.amount, 0);
  const totalBank = dayReceipts.filter(r => r.channel === 'BANK' || r.channel === 'POS').reduce((s, r) => s + r.amount, 0);
  const totalCheck = dayReceipts.filter(r => r.channel === 'CHECK').reduce((s, r) => s + r.amount, 0);
  const totalAll = dayReceipts.reduce((s, r) => s + r.amount, 0);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MiniKpi label="إجمالي التحصيل" value={formatCurrency(totalAll, cur)} icon={<Banknote size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="نقدي" value={formatCurrency(totalCash, cur)} icon={<Banknote size={18} />} color="bg-green-100 text-green-700" />
        <MiniKpi label="تحويل/شبكة" value={formatCurrency(totalBank, cur)} icon={<Banknote size={18} />} color="bg-purple-100 text-purple-700" />
        <MiniKpi label="شيكات" value={formatCurrency(totalCheck, cur)} icon={<Banknote size={18} />} color="bg-yellow-100 text-yellow-700" />
      </div>
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">رقم السند</th>
          <th className="px-3 py-2 border border-border">المستأجر</th>
          <th className="px-3 py-2 border border-border">المبلغ</th>
          <th className="px-3 py-2 border border-border">طريقة الدفع</th>
          <th className="px-3 py-2 border border-border">ملاحظات</th>
        </tr></thead>
        <tbody>{dayReceipts.map(r => {
          const contract = db.contracts.find(c => c.id === r.contractId);
          const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
          return (
            <tr key={r.id} className="hover:bg-background">
              <td className="px-3 py-2 border border-border">{r.no}</td>
              <td className="px-3 py-2 border border-border">{tenant?.name || '-'}</td>
              <td className="px-3 py-2 border border-border font-bold">{formatCurrency(r.amount, cur)}</td>
              <td className="px-3 py-2 border border-border">{r.channel === 'CASH' ? 'نقدي' : r.channel === 'BANK' ? 'تحويل' : r.channel === 'POS' ? 'شبكة' : r.channel === 'CHECK' ? 'شيك' : 'أخرى'}</td>
              <td className="px-3 py-2 border border-border">{r.ref || '-'}</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={2} className="px-3 py-2 border border-border">الإجمالي</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalAll, cur)}</td>
          <td colSpan={2} className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="كشف التحصيل اليومي" icon={<Banknote size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => {
        const pdfReceipts = dayReceipts.map(r => {
          const contract = db.contracts.find(c => c.id === r.contractId);
          const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
          return { ...r, tenantName: tenant?.name || '-', channelAr: r.channel === 'CASH' ? 'نقدي' : r.channel === 'BANK' ? 'تحويل' : r.channel === 'POS' ? 'شبكة' : r.channel === 'CHECK' ? 'شيك' : 'أخرى' };
        });
        exportDailyCollectionToPdf(pdfReceipts, { cash: totalCash, bank: totalBank, check: totalCheck, total: totalAll }, settings, date);
      }}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="كشف التحصيل اليومي" date={formatDate(date)}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="كشف التحصيل اليومي"><ReportPrintableContent title="كشف التحصيل اليومي" date={formatDate(date)}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default DailyCollectionReport;
