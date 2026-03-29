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


const DepositsReport: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [isPrinting, setIsPrinting] = useState(false);

  const activeContracts = db.contracts.filter(c => c.status === 'ACTIVE' && (c.deposit || 0) > 0);
  const totalDeposits = activeContracts.reduce((s, c) => s + (c.deposit || 0), 0);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MiniKpi label="إجمالي التأمينات" value={formatCurrency(totalDeposits, cur)} icon={<Wallet size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="عدد العقود" value={String(activeContracts.length)} icon={<FileText size={18} />} color="bg-green-100 text-green-700" />
      </div>
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">المستأجر</th>
          <th className="px-3 py-2 border border-border">الوحدة</th>
          <th className="px-3 py-2 border border-border">العقار</th>
          <th className="px-3 py-2 border border-border">مبلغ التأمين</th>
          <th className="px-3 py-2 border border-border">بداية العقد</th>
          <th className="px-3 py-2 border border-border">نهاية العقد</th>
        </tr></thead>
        <tbody>{activeContracts.map(c => {
          const tenant = db.tenants.find(t => t.id === c.tenantId);
          const unit = db.units.find(u => u.id === c.unitId);
          const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
          return (
            <tr key={c.id} className="hover:bg-background">
              <td className="px-3 py-2 border border-border">{tenant?.name || '-'}</td>
              <td className="px-3 py-2 border border-border">{unit?.name || '-'}</td>
              <td className="px-3 py-2 border border-border">{property?.name || '-'}</td>
              <td className="px-3 py-2 border border-border font-bold">{formatCurrency(c.deposit || 0, cur)}</td>
              <td className="px-3 py-2 border border-border">{formatDate(c.start)}</td>
              <td className="px-3 py-2 border border-border">{formatDate(c.end)}</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={3} className="px-3 py-2 border border-border">الإجمالي</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalDeposits, cur)}</td>
          <td colSpan={2} className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="تقرير التأمينات (الودائع)" icon={<Wallet size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => {
        const pdfContracts = activeContracts.map(c => {
          const tenant = db.tenants.find(t => t.id === c.tenantId);
          const unit = db.units.find(u => u.id === c.unitId);
          const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
          return { ...c, tenantName: tenant?.name || '-', unitName: unit?.name || '-', propertyName: property?.name || '-' };
        });
        exportDepositsReportToPdf(pdfContracts, totalDeposits, settings);
      }} />
      <ReportPrintableContent title="تقرير التأمينات" date={formatDate(new Date().toISOString())}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="تقرير التأمينات"><ReportPrintableContent title="تقرير التأمينات" date={formatDate(new Date().toISOString())}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default DepositsReport;
