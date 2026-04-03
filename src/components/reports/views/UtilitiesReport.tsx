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
import { getAttachmentUrl } from '../../../services/attachmentService';

const UTILITY_COLORS_CHART: Record<UtilityType, string> = {
  ELECTRICITY: '#2563eb',
  WATER: '#06b6d4',
  INTERNET: '#7c3aed',
  GAS: '#f59e0b',
  OTHER: '#64748b',
};

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

const UtilityAttachmentLink: React.FC<{ path: string }> = ({ path }) => {
  const [signedUrl, setSignedUrl] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!path) return;
      if (path.startsWith('data:')) {
        setSignedUrl(path);
        return;
      }
      try {
        const url = await getAttachmentUrl(path);
        if (active) setSignedUrl(url);
      } catch {
        if (active) setSignedUrl('');
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [path]);

  if (!signedUrl) return <span>-</span>;
  return <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs underline">عرض</a>;
};


const UtilitiesReport: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [isPrinting, setIsPrinting] = useState(false);
  const [fromMonth, setFromMonth] = useState(startOfYear(new Date()).toISOString().slice(0, 7));
  const [toMonth, setToMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterPropertyId, setFilterPropertyId] = useState('all');
  const [filterType, setFilterType] = useState<UtilityType | 'ALL'>('ALL');

  const records = useMemo(() => {
    return (db.utilityRecords || []).filter(r => {
      if (r.month < fromMonth || r.month > toMonth) return false;
      if (filterType !== 'ALL' && r.type !== filterType) return false;
      if (filterPropertyId !== 'all' && r.propertyId !== filterPropertyId) return false;
      return true;
    });
  }, [db.utilityRecords, fromMonth, toMonth, filterType, filterPropertyId]);

  const totalAmount = records.reduce((s, r) => s + r.amount, 0);
  const byType = useMemo(() => {
    const map: Record<string, { amount: number; count: number; consumption: number }> = {};
    records.forEach(r => {
      if (!map[r.type]) map[r.type] = { amount: 0, count: 0, consumption: 0 };
      map[r.type].amount += r.amount;
      map[r.type].count++;
      map[r.type].consumption += Math.max(0, r.currentReading - r.previousReading);
    });
    return map;
  }, [records]);

  const byPaidBy = useMemo(() => {
    const tenant = records.filter(r => r.paidBy === 'TENANT').reduce((s, r) => s + r.amount, 0);
    const owner = records.filter(r => r.paidBy === 'OWNER').reduce((s, r) => s + r.amount, 0);
    const office = records.filter(r => r.paidBy === 'OFFICE').reduce((s, r) => s + r.amount, 0);
    return { tenant, owner, office };
  }, [records]);

  const chartData = useMemo(() => {
    return (Object.keys(UTILITY_TYPE_AR) as UtilityType[]).filter(t => byType[t]).map(t => ({
      name: UTILITY_TYPE_AR[t], value: byType[t].amount, fill: UTILITY_COLORS_CHART[t],
    }));
  }, [byType]);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MiniKpi label="إجمالي فواتير المرافق" value={formatCurrency(totalAmount, cur)} icon={<Zap size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="على المستأجرين" value={formatCurrency(byPaidBy.tenant, cur)} icon={<Users size={18} />} color="bg-green-100 text-green-700" />
        <MiniKpi label="على الملاك" value={formatCurrency(byPaidBy.owner, cur)} icon={<Users size={18} />} color="bg-purple-100 text-purple-700" />
        <MiniKpi label="على المكتب" value={formatCurrency(byPaidBy.office, cur)} icon={<Users size={18} />} color="bg-gray-100 text-gray-700" />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-bold mb-3">توزيع حسب نوع المرفق</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie><Legend /></RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-3">ملخص حسب نوع المرفق</h4>
            <div className="space-y-2">{(Object.keys(UTILITY_TYPE_AR) as UtilityType[]).filter(t => byType[t]).map(t => (
              <div key={t} className="flex justify-between items-center p-2 bg-background rounded border border-border">
                <span className="text-sm">{UTILITY_ICON[t]} {UTILITY_TYPE_AR[t]}</span>
                <div className="text-left">
                  <span className="font-bold text-sm">{formatCurrency(byType[t].amount, cur)}</span>
                  <span className="text-xs text-text-muted mr-2">({byType[t].count} سجل)</span>
                </div>
              </div>
            ))}</div>
          </div>
        </div>
      )}

      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">الشهر</th>
          <th className="px-3 py-2 border border-border">الوحدة</th>
          <th className="px-3 py-2 border border-border">العقار</th>
          <th className="px-3 py-2 border border-border">المرفق</th>
          <th className="px-3 py-2 border border-border">الاستهلاك</th>
          <th className="px-3 py-2 border border-border">سعر الوحدة</th>
          <th className="px-3 py-2 border border-border">المبلغ</th>
          <th className="px-3 py-2 border border-border">على حساب</th>
          <th className="px-3 py-2 border border-border">صورة</th>
        </tr></thead>
        <tbody>{records.sort((a, b) => b.month.localeCompare(a.month)).map(r => {
          const unit = db.units.find(u => u.id === r.unitId);
          const property = db.properties.find(p => p.id === r.propertyId);
          const consumption = Math.max(0, r.currentReading - r.previousReading);
          return (
            <tr key={r.id} className="hover:bg-background">
              <td className="px-3 py-2 border border-border">{r.month}</td>
              <td className="px-3 py-2 border border-border">{unit?.name || '-'}</td>
              <td className="px-3 py-2 border border-border">{property?.name || '-'}</td>
              <td className="px-3 py-2 border border-border">{UTILITY_ICON[r.type as UtilityType]} {UTILITY_TYPE_AR[r.type as UtilityType]}</td>
              <td className="px-3 py-2 border border-border">{consumption} وحدة</td>
              <td className="px-3 py-2 border border-border">{formatCurrency(r.unitPrice, cur)}</td>
              <td className="px-3 py-2 border border-border font-bold">{formatCurrency(r.amount, cur)}</td>
              <td className="px-3 py-2 border border-border">{r.paidBy === 'TENANT' ? 'مستأجر' : r.paidBy === 'OWNER' ? 'مالك' : 'مكتب'}</td>
              <td className="px-3 py-2 border border-border text-center">
                {r.billImageUrl ? <UtilityAttachmentLink path={r.billImageUrl} /> : '-'}
              </td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={6} className="px-3 py-2 border border-border">الإجمالي</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalAmount, cur)}</td>
          <td colSpan={2} className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="تقرير المرافق والخدمات" icon={<Zap size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => {
        const pdfRecords = records.map(r => {
          const unit = db.units.find(u => u.id === r.unitId);
          const prop = db.properties.find(p => p.id === r.propertyId);
          return { ...r, unitName: unit?.name || '-', propertyName: prop?.name || '-', consumption: Math.max(0, r.currentReading - r.previousReading), paidByAr: r.paidBy === 'TENANT' ? 'مستأجر' : r.paidBy === 'OWNER' ? 'مالك' : 'مكتب' };
        });
        exportUtilitiesReportToPdf(pdfRecords, totalAmount, byType, settings, `${fromMonth} - ${toMonth}`);
      }}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">من شهر</label><input type="month" value={fromMonth} onChange={e => setFromMonth(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">إلى شهر</label><input type="month" value={toMonth} onChange={e => setToMonth(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">نوع المرفق</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value as UtilityType | 'ALL')} className="text-sm">
            <option value="ALL">الكل</option>
            {(Object.keys(UTILITY_TYPE_AR) as UtilityType[]).map(t => <option key={t} value={t}>{UTILITY_ICON[t]} {UTILITY_TYPE_AR[t]}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">العقار</label>
          <select value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)} className="text-sm">
            <option value="all">الكل</option>
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title="تقرير المرافق والخدمات" date={`${fromMonth} - ${toMonth}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="تقرير المرافق"><ReportPrintableContent title="تقرير المرافق والخدمات" date={`${fromMonth} - ${toMonth}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default UtilitiesReport;
