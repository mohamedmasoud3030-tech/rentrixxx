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


const RentRoll: React.FC = () => {
  const { db, contractBalances, settings } = useApp();
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';

  const rentRollData = useMemo(() => {
    const unitsWithDetails = db.units.map(unit => {
      const property = db.properties.find(p => p.id === unit.propertyId);
      const activeContract = db.contracts.find(c => c.unitId === unit.id && c.status === 'ACTIVE');
      if (activeContract) {
        const tenant = db.tenants.find(t => t.id === activeContract.tenantId);
        const contractBalance = contractBalances[activeContract.id];
        return { property: property?.name || '-', unit: unit.name, tenant: tenant?.name || '-', startDate: activeContract.start, endDate: activeContract.end, rent: activeContract.rent, deposit: activeContract.deposit, balance: contractBalance?.balance || 0, status: 'مؤجرة' as const };
      }
      return { property: property?.name || '-', unit: unit.name, tenant: '-', startDate: '-', endDate: '-', rent: unit.rentDefault, deposit: 0, balance: 0, status: 'شاغرة' as const };
    });
    const totals = unitsWithDetails.reduce((acc, item) => {
      if (item.status === 'مؤجرة') { acc.totalRent += item.rent; acc.totalBalance += item.balance; }
      return acc;
    }, { totalRent: 0, totalBalance: 0 });
    return { units: unitsWithDetails.sort((a, b) => `${a.property}-${a.unit}`.localeCompare(`${b.property}-${b.unit}`)), totals };
  }, [db, contractBalances]);

  const handleExportPdf = () => exportRentRollToPdf(rentRollData.units, rentRollData.totals, settings);

  const kpis = useMemo(() => {
    const rented = rentRollData.units.filter(u => u.status === 'مؤجرة').length;
    const vacant = rentRollData.units.filter(u => u.status === 'شاغرة').length;
    return { total: rentRollData.units.length, rented, vacant, occupancy: rentRollData.units.length > 0 ? ((rented / rentRollData.units.length) * 100) : 0 };
  }, [rentRollData]);

  const reportContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right border-collapse">
        <thead>
          <tr className="bg-background text-text-muted text-xs uppercase">
            <th className="px-3 py-3 border border-border">العقار</th>
            <th className="px-3 py-3 border border-border">الوحدة</th>
            <th className="px-3 py-3 border border-border">الحالة</th>
            <th className="px-3 py-3 border border-border">المستأجر</th>
            <th className="px-3 py-3 border border-border">بدء العقد</th>
            <th className="px-3 py-3 border border-border">انتهاء العقد</th>
            <th className="px-3 py-3 border border-border">الإيجار</th>
            <th className="px-3 py-3 border border-border">التأمين</th>
            <th className="px-3 py-3 border border-border">الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {rentRollData.units.map((item, i) => (
            <tr key={i} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-3 py-3 border border-border">{item.property}</td>
              <td className="px-3 py-3 border border-border font-medium">{item.unit}</td>
              <td className="px-3 py-3 border border-border">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.status === 'مؤجرة' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'}`}>{item.status}</span>
              </td>
              <td className="px-3 py-3 border border-border">{item.tenant}</td>
              <td className="px-3 py-3 border border-border">{item.startDate !== '-' ? formatDate(item.startDate) : '-'}</td>
              <td className="px-3 py-3 border border-border">{item.endDate !== '-' ? formatDate(item.endDate) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono">{formatCurrency(item.rent, cur)}</td>
              <td className="px-3 py-3 border border-border font-mono">{formatCurrency(item.deposit, cur)}</td>
              <td className={`px-3 py-3 border border-border font-mono font-bold ${item.balance > 0 ? 'text-red-500' : ''}`}>{formatCurrency(item.balance, cur)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-primary/5 text-text">
            <td colSpan={6} className="px-3 py-3 border border-border text-left">الإجمالي (الوحدات المؤجرة)</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(rentRollData.totals.totalRent, cur)}</td>
            <td className="border border-border" />
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(rentRollData.totals.totalBalance, cur)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="قائمة الإيجارات (Rent Roll)" icon={<Building2 size={20} className="text-primary" />} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MiniKpi label="إجمالي الوحدات" value={String(kpis.total)} icon={<Building2 size={16} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <MiniKpi label="مؤجرة" value={String(kpis.rented)} icon={<Users size={16} />} color="bg-green-100 dark:bg-green-900/40 text-green-600" />
        <MiniKpi label="شاغرة" value={String(kpis.vacant)} icon={<Building2 size={16} />} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
        <MiniKpi label="نسبة الإشغال" value={`${kpis.occupancy.toFixed(0)}%`} icon={<Percent size={16} />} color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600" />
      </div>
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf} />
      <ReportPrintableContent title="تقرير قائمة الإيجارات" date={`تاريخ التقرير: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="قائمة الإيجارات"><ReportPrintableContent title="تقرير قائمة الإيجارات" date={`تاريخ التقرير: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default RentRoll;
