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

const UNIT_TYPE_AR: Record<string, string> = {
  APARTMENT: 'شقة',
  STUDIO: 'استوديو',
  VILLA: 'فيلا',
  SHOP: 'محل',
  OFFICE: 'مكتب',
  WAREHOUSE: 'مخزن',
};

const FLOOR_AR: Record<string, string> = {
  GROUND: 'أرضي',
  FIRST: 'الأول',
  SECOND: 'الثاني',
  THIRD: 'الثالث',
  ROOF: 'السطح',
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


const VacantUnits: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [isPrinting, setIsPrinting] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const vacantUnits = useMemo(() => {
    const activeContractUnitIds = new Set(
      db.contracts.filter(c => c.status === 'ACTIVE').map(c => c.unitId)
    );
    return db.units
      .filter(u => {
        if (u.status === 'RENTED' || activeContractUnitIds.has(u.id)) return false;
        if (filterPropertyId !== 'all' && u.propertyId !== filterPropertyId) return false;
        if (filterType !== 'all' && u.type !== filterType) return false;
        return true;
      })
      .map(u => ({
        unit: u,
        property: db.properties.find(p => p.id === u.propertyId),
      }))
      .sort((a, b) => (a.property?.name || '').localeCompare(b.property?.name || '', 'ar'));
  }, [db, filterPropertyId, filterType]);

  const totalPotentialRent = vacantUnits.reduce((s, r) => s + (r.unit.rentDefault || 0), 0);
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    vacantUnits.forEach(r => { map[r.unit.type || 'other'] = (map[r.unit.type || 'other'] || 0) + 1; });
    return map;
  }, [vacantUnits]);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <MiniKpi label="إجمالي الوحدات الشاغرة" value={vacantUnits.length.toString()} icon={<Building2 size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="الإيجار المحتمل الشهري" value={formatCurrency(totalPotentialRent, cur)} icon={<Banknote size={18} />} color="bg-green-100 text-green-700" />
        <MiniKpi label="أنواع مختلفة" value={Object.keys(byType).length.toString()} icon={<Filter size={18} />} color="bg-purple-100 text-purple-700" />
      </div>

      {Object.keys(byType).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(byType).map(([type, count]) => (
            <span key={type} className="px-3 py-1 bg-background border border-border rounded-full text-xs">
              {UNIT_TYPE_AR[type] || type}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      )}

      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">العقار</th>
          <th className="px-3 py-2 border border-border">الوحدة</th>
          <th className="px-3 py-2 border border-border">النوع</th>
          <th className="px-3 py-2 border border-border">الطابق</th>
          <th className="px-3 py-2 border border-border">المساحة</th>
          <th className="px-3 py-2 border border-border">الغرف</th>
          <th className="px-3 py-2 border border-border">الحمامات</th>
          <th className="px-3 py-2 border border-border">الإيجار المقترح</th>
          <th className="px-3 py-2 border border-border">الحالة</th>
        </tr></thead>
        <tbody>{vacantUnits.map(({ unit, property }) => (
          <tr key={unit.id} className="hover:bg-background">
            <td className="px-3 py-2 border border-border">{property?.name || '-'}</td>
            <td className="px-3 py-2 border border-border font-bold">{unit.name}</td>
            <td className="px-3 py-2 border border-border">{UNIT_TYPE_AR[unit.type] || unit.type || '-'}</td>
            <td className="px-3 py-2 border border-border">{unit.floor ? (FLOOR_AR[unit.floor] || unit.floor) : '-'}</td>
            <td className="px-3 py-2 border border-border">{unit.area ? `${unit.area} م²` : '-'}</td>
            <td className="px-3 py-2 border border-border">{unit.bedrooms ?? '-'}</td>
            <td className="px-3 py-2 border border-border">{unit.bathrooms ?? '-'}</td>
            <td className="px-3 py-2 border border-border font-bold">{unit.rentDefault ? formatCurrency(unit.rentDefault, cur) : '-'}</td>
            <td className="px-3 py-2 border border-border">
              <span className={`px-2 py-0.5 rounded-full text-xs ${unit.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700' : unit.status === 'ON_HOLD' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                {unit.status === 'MAINTENANCE' ? 'صيانة' : unit.status === 'ON_HOLD' ? 'محجوزة' : 'متاحة'}
              </span>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="تقرير الوحدات الشاغرة" icon={<Building2 size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => {
        const pdfUnits = vacantUnits.map(({ unit, property: prop }) => ({ ...unit, propertyName: prop?.name || '-', typeAr: UNIT_TYPE_AR[unit.type] || unit.type || '-', floorAr: FLOOR_AR[unit.floor] || unit.floor || '-', statusAr: unit.status === 'MAINTENANCE' ? 'صيانة' : unit.status === 'ON_HOLD' ? 'محجوزة' : 'متاحة' }));
        exportVacantUnitsToPdf(pdfUnits, totalPotentialRent, settings);
      }}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">العقار</label>
          <select value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)} className="text-sm">
            <option value="all">الكل</option>
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">نوع الوحدة</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm">
            <option value="all">الكل</option>
            {Object.entries(UNIT_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title="تقرير الوحدات الشاغرة" date={`تاريخ التقرير: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="الوحدات الشاغرة"><ReportPrintableContent title="تقرير الوحدات الشاغرة" date={`تاريخ التقرير: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default VacantUnits;
