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


const MaintenanceReport: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [isPrinting, setIsPrinting] = useState(false);
  const [fromDate, setFromDate] = useState(startOfYear(new Date()).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterPropertyId, setFilterPropertyId] = useState('all');

  const records = useMemo(() => {
    return db.maintenanceRecords.filter(m => {
      if (m.requestDate < fromDate || m.requestDate > toDate) return false;
      if (filterPropertyId !== 'all') {
        const unit = db.units.find(u => u.id === m.unitId);
        if (unit?.propertyId !== filterPropertyId) return false;
      }
      return true;
    });
  }, [db.maintenanceRecords, db.units, fromDate, toDate, filterPropertyId]);

  const totalCost = records.reduce((s, m) => s + (m.cost || 0), 0);
  const ownerCost = records.filter(m => m.chargedTo === 'OWNER').reduce((s, m) => s + (m.cost || 0), 0);
  const tenantCost = records.filter(m => m.chargedTo === 'TENANT').reduce((s, m) => s + (m.cost || 0), 0);
  const officeCost = records.filter(m => m.chargedTo === 'OFFICE').reduce((s, m) => s + (m.cost || 0), 0);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MiniKpi label="إجمالي التكاليف" value={formatCurrency(totalCost, cur)} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-700" />
        <MiniKpi label="على المالك" value={formatCurrency(ownerCost, cur)} icon={<Users size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="على المستأجر" value={formatCurrency(tenantCost, cur)} icon={<Users size={18} />} color="bg-yellow-100 text-yellow-700" />
        <MiniKpi label="على المكتب" value={formatCurrency(officeCost, cur)} icon={<Users size={18} />} color="bg-gray-100 text-gray-700" />
      </div>
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">التاريخ</th>
          <th className="px-3 py-2 border border-border">الوحدة</th>
          <th className="px-3 py-2 border border-border">الوصف</th>
          <th className="px-3 py-2 border border-border">على حساب</th>
          <th className="px-3 py-2 border border-border">التكلفة</th>
          <th className="px-3 py-2 border border-border">الحالة</th>
        </tr></thead>
        <tbody>{records.map(m => {
          const unit = db.units.find(u => u.id === m.unitId);
          return (
            <tr key={m.id} className="hover:bg-background">
              <td className="px-3 py-2 border border-border">{m.requestDate}</td>
              <td className="px-3 py-2 border border-border">{unit?.name || '-'}</td>
              <td className="px-3 py-2 border border-border">{m.description}</td>
              <td className="px-3 py-2 border border-border">{m.chargedTo === 'OWNER' ? 'المالك' : m.chargedTo === 'TENANT' ? 'المستأجر' : 'المكتب'}</td>
              <td className="px-3 py-2 border border-border font-bold">{formatCurrency(m.cost || 0, cur)}</td>
              <td className="px-3 py-2 border border-border">{m.status === 'COMPLETED' ? 'مكتمل' : m.status === 'IN_PROGRESS' ? 'جاري' : m.status === 'NEW' ? 'جديد' : m.status}</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={4} className="px-3 py-2 border border-border">الإجمالي</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalCost, cur)}</td>
          <td className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="تقرير الصيانة" icon={<Filter size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => {
        const pdfRecords = records.map(m => {
          const unit = db.units.find(u => u.id === m.unitId);
          return { ...m, unitName: unit?.name || '-', statusAr: m.status === 'COMPLETED' ? 'مكتمل' : m.status === 'IN_PROGRESS' ? 'جاري' : m.status === 'NEW' ? 'جديد' : m.status, chargedToAr: m.chargedTo === 'OWNER' ? 'المالك' : m.chargedTo === 'TENANT' ? 'المستأجر' : 'المكتب' };
        });
        exportMaintenanceReportToPdf(pdfRecords, totalCost, settings, `${formatDate(fromDate)} - ${formatDate(toDate)}`);
      }}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">من</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">إلى</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">العقار</label>
          <select value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)} className="text-sm">
            <option value="all">الكل</option>
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title="تقرير الصيانة" date={`${formatDate(fromDate)} - ${formatDate(toDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="تقرير الصيانة"><ReportPrintableContent title="تقرير الصيانة" date={`${formatDate(fromDate)} - ${formatDate(toDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default MaintenanceReport;
