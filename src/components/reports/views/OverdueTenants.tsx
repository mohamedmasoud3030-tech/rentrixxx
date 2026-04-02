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


const OverdueTenants: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [isPrinting, setIsPrinting] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState('all');
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const overdue = useMemo(() => {
    return db.invoices
      .filter(inv => {
        if (inv.status === 'PAID') return false;
        const due = new Date(inv.dueDate); due.setHours(0, 0, 0, 0);
        return due < today;
      })
      .map(inv => {
        const contract = db.contracts.find(c => c.id === inv.contractId);
        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
        const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
        const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
        const dueDate = new Date(inv.dueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
        const remaining = inv.amount - (inv.paidAmount || 0);
        return { inv, contract, tenant, unit, property, daysOverdue, remaining };
      })
      .filter(r => r.remaining > 0 && (filterPropertyId === 'all' || r.property?.id === filterPropertyId))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [db, filterPropertyId, today]);

  const totalOverdue = overdue.reduce((s, r) => s + r.remaining, 0);
  const count30 = overdue.filter(r => r.daysOverdue <= 30).length;
  const count60 = overdue.filter(r => r.daysOverdue > 30 && r.daysOverdue <= 60).length;
  const count90plus = overdue.filter(r => r.daysOverdue > 60).length;

  const severityClass = (days: number) =>
    days > 90 ? 'text-red-700 font-bold' : days > 60 ? 'text-orange-600 font-bold' : days > 30 ? 'text-yellow-600' : 'text-text';

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MiniKpi label="إجمالي المتأخرات" value={formatCurrency(totalOverdue, cur)} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-700" />
        <MiniKpi label="1–30 يوم" value={count30.toString()} icon={<Users size={18} />} color="bg-yellow-100 text-yellow-700" />
        <MiniKpi label="31–60 يوم" value={count60.toString()} icon={<Users size={18} />} color="bg-orange-100 text-orange-700" />
        <MiniKpi label="أكثر من 60 يوم" value={count90plus.toString()} icon={<Users size={18} />} color="bg-red-100 text-red-700" />
      </div>
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">المستأجر</th>
          <th className="px-3 py-2 border border-border">الهاتف</th>
          <th className="px-3 py-2 border border-border">الوحدة</th>
          <th className="px-3 py-2 border border-border">العقار</th>
          <th className="px-3 py-2 border border-border">تاريخ الاستحقاق</th>
          <th className="px-3 py-2 border border-border">أيام التأخير</th>
          <th className="px-3 py-2 border border-border">المبلغ المستحق</th>
          <th className="px-3 py-2 border border-border print:hidden">واتساب</th>
        </tr></thead>
        <tbody>{overdue.map(r => (
          <tr key={r.inv.id} className="hover:bg-background">
            <td className="px-3 py-2 border border-border font-bold">{r.tenant?.name || '-'}</td>
            <td className="px-3 py-2 border border-border" dir="ltr">{r.tenant?.phone || '-'}</td>
            <td className="px-3 py-2 border border-border">{r.unit?.name || '-'}</td>
            <td className="px-3 py-2 border border-border">{r.property?.name || '-'}</td>
            <td className="px-3 py-2 border border-border">{formatDate(r.inv.dueDate)}</td>
            <td className={`px-3 py-2 border border-border ${severityClass(r.daysOverdue)}`}>{r.daysOverdue} يوم</td>
            <td className="px-3 py-2 border border-border font-bold text-red-600">{formatCurrency(r.remaining, cur)}</td>
            <td className="px-3 py-2 border border-border print:hidden">
              {r.tenant?.phone && (
                <a href={`https://wa.me/${r.tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`السيد/ة ${r.tenant.name}، تذكير بالمبلغ المستحق ${formatCurrency(r.remaining, cur)} منذ ${r.daysOverdue} يوم`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 text-xs underline">واتساب</a>
              )}
            </td>
          </tr>
        ))}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={6} className="px-3 py-2 border border-border">الإجمالي</td>
          <td className="px-3 py-2 border border-border text-red-600">{formatCurrency(totalOverdue, cur)}</td>
          <td className="border border-border print:hidden"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="تقرير المتأخرين عن الدفع" icon={<TrendingDown size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => {
        const pdfOverdue = overdue.map(r => ({ tenantName: r.tenant?.name || '-', phone: r.tenant?.phone || '-', unitName: r.unit?.name || '-', propertyName: r.property?.name || '-', dueDate: r.inv.dueDate, daysOverdue: r.daysOverdue, remaining: r.remaining }));
        exportOverdueTenantsToPdf(pdfOverdue, totalOverdue, settings);
      }}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">العقار</label>
          <select value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)} className="text-sm">
            <option value="all">الكل</option>
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title="تقرير المتأخرين عن الدفع" date={`تاريخ التقرير: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="تقرير المتأخرين"><ReportPrintableContent title="تقرير المتأخرين عن الدفع" date={`تاريخ التقرير: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default OverdueTenants;
