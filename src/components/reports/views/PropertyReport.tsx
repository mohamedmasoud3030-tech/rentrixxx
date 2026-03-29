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


const PropertyReport: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [selectedPropertyId, setSelectedPropertyId] = useState(db.properties[0]?.id || '');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!selectedPropertyId && db.properties.length > 0) setSelectedPropertyId(db.properties[0].id);
  }, [db.properties]);

  const property = db.properties.find(p => p.id === selectedPropertyId);
  const owner = property ? db.owners.find(o => o.id === property.ownerId) : null;
  const units = db.units.filter(u => u.propertyId === selectedPropertyId);
  const rented = units.filter(u => u.status === 'RENTED').length;
  const available = units.filter(u => u.status === 'AVAILABLE').length;
  const totalRent = units.filter(u => u.status === 'RENTED').reduce((s, u) => {
    const c = db.contracts.find(c => c.unitId === u.id && c.status === 'ACTIVE');
    return s + (c?.rent || 0);
  }, 0);
  const annualIncome = totalRent * 12;
  const maintenanceCost = db.maintenanceRecords.filter(m => units.some(u => u.id === m.unitId)).reduce((s, m) => s + (m.cost || 0), 0);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MiniKpi label="إجمالي الوحدات" value={String(units.length)} icon={<Building2 size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="مؤجرة" value={String(rented)} icon={<Users size={18} />} color="bg-green-100 text-green-700" />
        <MiniKpi label="شاغرة" value={String(available)} icon={<Building2 size={18} />} color="bg-yellow-100 text-yellow-700" />
        <MiniKpi label="الدخل الشهري" value={formatCurrency(totalRent, cur)} icon={<Banknote size={18} />} color="bg-emerald-100 text-emerald-700" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MiniKpi label="الدخل السنوي المتوقع" value={formatCurrency(annualIncome, cur)} icon={<TrendingUp size={18} />} color="bg-purple-100 text-purple-700" />
        <MiniKpi label="إجمالي تكاليف الصيانة" value={formatCurrency(maintenanceCost, cur)} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-700" />
      </div>
      {property && <div className="mb-4 text-sm"><p>المالك: <span className="font-bold">{owner?.name || '-'}</span></p><p>الموقع: {property.location || '-'}</p></div>}
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">الوحدة</th>
          <th className="px-3 py-2 border border-border">النوع</th>
          <th className="px-3 py-2 border border-border">الحالة</th>
          <th className="px-3 py-2 border border-border">المستأجر</th>
          <th className="px-3 py-2 border border-border">الإيجار</th>
          <th className="px-3 py-2 border border-border">التأمين</th>
        </tr></thead>
        <tbody>{units.map(u => {
          const contract = db.contracts.find(c => c.unitId === u.id && c.status === 'ACTIVE');
          const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
          return (
            <tr key={u.id} className="hover:bg-background">
              <td className="px-3 py-2 border border-border font-medium">{u.name}</td>
              <td className="px-3 py-2 border border-border">{u.type}</td>
              <td className="px-3 py-2 border border-border"><span className={`px-2 py-0.5 text-xs rounded-full ${u.status === 'RENTED' ? 'bg-blue-100 text-blue-800' : u.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{u.status === 'RENTED' ? 'مؤجرة' : u.status === 'AVAILABLE' ? 'شاغرة' : u.status === 'ON_HOLD' ? 'معلقة' : 'صيانة'}</span></td>
              <td className="px-3 py-2 border border-border">{tenant?.name || '-'}</td>
              <td className="px-3 py-2 border border-border">{contract ? formatCurrency(contract.rent, cur) : '-'}</td>
              <td className="px-3 py-2 border border-border">{contract ? formatCurrency(contract.deposit || 0, cur) : '-'}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="تقرير عقار" icon={<Building2 size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={() => {
        if (!property) return;
        const pdfUnits = units.map(u => {
          const contract = db.contracts.find(c => c.unitId === u.id && c.status === 'ACTIVE');
          const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
          return { ...u, tenantName: tenant?.name || '-', rent: contract?.rent || 0, deposit: contract?.deposit || 0, statusAr: u.status === 'RENTED' ? 'مؤجرة' : u.status === 'AVAILABLE' ? 'شاغرة' : u.status === 'ON_HOLD' ? 'معلقة' : 'صيانة' };
        });
        exportPropertyReportToPdf(property, owner, pdfUnits, totalRent, annualIncome, maintenanceCost, settings);
      }}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">العقار</label>
          <select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} className="text-sm">
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title={`تقرير عقار: ${property?.name || ''}`} date={formatDate(new Date().toISOString())}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="تقرير عقار"><ReportPrintableContent title={`تقرير عقار: ${property?.name || ''}`} date={formatDate(new Date().toISOString())}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default PropertyReport;
