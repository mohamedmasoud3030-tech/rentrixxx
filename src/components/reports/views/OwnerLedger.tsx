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
import { useLocation } from 'react-router-dom';

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


const OwnerLedger: React.FC = () => {
  const { db, settings } = useApp();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const ownerIdFromUrl = queryParams.get('ownerId');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(ownerIdFromUrl || db.owners[0]?.id || '');
  const today = new Date();
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [showCommission, setShowCommission] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';

  useEffect(() => {
    const oid = queryParams.get('ownerId');
    if (oid) setSelectedOwnerId(oid);
  }, [location.search]);

  const ledgerData = useMemo(() => {
    if (!selectedOwnerId) return null;
    const owner = db.owners.find(o => o.id === selectedOwnerId);
    if (!owner) return null;
    const ownerProperties = db.properties.filter(p => p.ownerId === selectedOwnerId).map(p => p.id);
    const ownerUnits = db.units.filter(u => ownerProperties.includes(u.propertyId)).map(u => u.id);
    const ownerContracts = db.contracts.filter(c => ownerUnits.includes(c.unitId)).map(c => c.id);
    const start = new Date(startDate), end = new Date(endDate);
    const transactions: OwnerLedgerTransaction[] = [];
    db.receipts.forEach(r => {
      if (r.status === 'POSTED' && ownerContracts.includes(r.contractId) && new Date(r.dateTime) >= start && new Date(r.dateTime) <= end) {
        const officeShare = showCommission && owner.commissionType === 'RATE' ? r.amount * (owner.commissionValue / 100) : 0;
        transactions.push({ date: r.dateTime, details: `تحصيل من عقد ${r.no}`, type: 'receipt', gross: r.amount, officeShare, net: r.amount - officeShare });
      }
    });
    db.expenses.forEach(e => {
      if (e.status === 'POSTED' && e.contractId && ownerContracts.includes(e.contractId) && e.chargedTo === 'OWNER' && new Date(e.dateTime) >= start && new Date(e.dateTime) <= end) {
        transactions.push({ date: e.dateTime, details: `مصروف صيانة ${e.no}`, type: 'expense', gross: -e.amount, officeShare: 0, net: -e.amount });
      }
    });
    db.ownerSettlements.forEach(s => {
      if (s.ownerId === selectedOwnerId && new Date(s.date) >= start && new Date(s.date) <= end) {
        transactions.push({ date: s.date, details: `تسوية مالية - دفعة #${s.no}`, type: 'settlement', gross: -s.amount, officeShare: 0, net: -s.amount });
      }
    });
    if (showCommission && owner.commissionType === 'FIXED_MONTHLY') {
      const commissionMonths = new Set<string>();
      transactions.filter(tx => tx.type === 'receipt').forEach(tx => commissionMonths.add(tx.date.slice(0, 7)));
      commissionMonths.forEach(month => {
        const lastDayOfMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString();
        transactions.push({ date: lastDayOfMonth, details: `عمولة إدارة ثابتة لشهر ${month}`, type: 'expense', gross: 0, officeShare: owner.commissionValue, net: -owner.commissionValue });
      });
    }
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totals = transactions.reduce((acc, tx) => { acc.gross += tx.gross; acc.officeShare += tx.officeShare; acc.net += tx.net; return acc; }, { gross: 0, officeShare: 0, net: 0 });
    return { transactions, totals };
  }, [selectedOwnerId, startDate, endDate, db, showCommission]);

  const handleExportPdf = () => {
    if (!ledgerData || !selectedOwnerId) return;
    const ownerName = db.owners.find(o => o.id === selectedOwnerId)?.name || '';
    exportOwnerLedgerToPdf(ledgerData.transactions, ledgerData.totals, settings, ownerName, `للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`, showCommission);
  };

  const reportContent = ledgerData && (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right border-collapse">
        <thead>
          <tr className="bg-background text-text-muted text-xs uppercase">
            <th className="px-4 py-3 border border-border">التاريخ</th>
            <th className="px-4 py-3 border border-border">البيان</th>
            <th className="px-4 py-3 border border-border">إجمالي المبلغ</th>
            {showCommission && <th className="px-4 py-3 border border-border">حصة المكتب</th>}
            <th className="px-4 py-3 border border-border">صافي المبلغ للمالك</th>
          </tr>
        </thead>
        <tbody>
          {ledgerData.transactions.map((tx: OwnerLedgerTransaction, i: number) => (
            <tr key={i} className="bg-card hover:bg-background/50">
              <td className="px-4 py-3 border border-border">{formatDate(tx.date)}</td>
              <td className="px-4 py-3 border border-border">{tx.details}</td>
              <td className={`px-4 py-3 border border-border font-mono ${tx.gross >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(tx.gross, cur)}</td>
              {showCommission && <td className="px-4 py-3 text-red-600 border border-border font-mono">{tx.officeShare > 0 ? formatCurrency(-tx.officeShare, cur) : '-'}</td>}
              <td className="px-4 py-3 font-bold border border-border font-mono">{formatCurrency(tx.net, cur)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-primary/5 text-text">
            <td colSpan={2} className="px-4 py-3 text-left border border-border">الرصيد الختامي</td>
            <td className="px-4 py-3 border border-border font-mono">{formatCurrency(ledgerData.totals.gross, cur)}</td>
            {showCommission && <td className="px-4 py-3 border border-border font-mono">{formatCurrency(-ledgerData.totals.officeShare, cur)}</td>}
            <td className="px-4 py-3 border border-border font-mono">{formatCurrency(ledgerData.totals.net, cur)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="كشف حساب المالك" icon={<Users size={20} className="text-primary" />} />
      {ledgerData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <MiniKpi label="إجمالي التحصيل" value={formatCurrency(ledgerData.totals.gross, cur)} icon={<ArrowUp size={16} />} color="bg-green-100 dark:bg-green-900/40 text-green-600" />
          <MiniKpi label="حصة المكتب" value={formatCurrency(ledgerData.totals.officeShare, cur)} icon={<Banknote size={16} />} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
          <MiniKpi label="صافي المالك" value={formatCurrency(ledgerData.totals.net, cur)} icon={<Wallet size={16} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        </div>
      )}
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">اختر المالك</label>
          <select value={selectedOwnerId} onChange={e => setSelectedOwnerId(e.target.value)} className="text-sm">
            <option value="">-- اختر --</option>
            {db.owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">من</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">إلى</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
        </div>
        <div className="flex items-end gap-3 pb-1">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="commission" checked={!showCommission} onChange={() => setShowCommission(false)} /> قبل الخصم</label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="commission" checked={showCommission} onChange={() => setShowCommission(true)} /> بعد الخصم</label>
        </div>
      </ActionBar>
      {reportContent && <ReportPrintableContent title={`كشف حساب المالك: ${db.owners.find(o => o.id === selectedOwnerId)?.name}`} date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>}
      {isPrinting && reportContent && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="كشف حساب المالك"><ReportPrintableContent title={`كشف حساب المالك: ${db.owners.find(o => o.id === selectedOwnerId)?.name}`} date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default OwnerLedger;
