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


const ReportsOverview: React.FC<{ currency: string }> = ({ currency }) => {
  const { db, contractBalances, ownerBalances, settings } = useApp();
  const accountTypeMap = useMemo(() => new Map(db.accounts.map(account => [account.id, account.type])), [db.accounts]);
  const accountNameMap = useMemo(() => new Map(db.accounts.map(account => [account.id, account.name])), [db.accounts]);
  const monthKey = (dateValue: string) => new Date(dateValue).toISOString().slice(0, 7);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) });
    const monthRange = new Set(months.map(month => month.toISOString().slice(0, 7)));
    const monthLedger = new Map<string, { revenue: number; expenses: number }>();
    months.forEach(month => monthLedger.set(month.toISOString().slice(0, 7), { revenue: 0, expenses: 0 }));
    db.journalEntries.forEach(entry => {
      const key = monthKey(entry.date);
      if (!monthRange.has(key)) return;
      const accountType = accountTypeMap.get(entry.accountId);
      const monthData = monthLedger.get(key);
      if (!monthData) return;
      if (accountType === 'REVENUE') {
        const signed = entry.type === 'CREDIT' ? entry.amount : -entry.amount;
        monthData.revenue += signed;
      }
      if (accountType === 'EXPENSE') {
        const signed = entry.type === 'DEBIT' ? entry.amount : -entry.amount;
        monthData.expenses += signed;
      }
    });
    return months.map(monthStart => {
      const label = format(monthStart, 'MMM', { locale: ar });
      const key = monthStart.toISOString().slice(0, 7);
      const revenue = monthLedger.get(key)?.revenue || 0;
      const expenses = monthLedger.get(key)?.expenses || 0;
      return { name: label, revenue, expenses, net: revenue - expenses };
    });
  }, [db.journalEntries, accountTypeMap]);

  const occupancyData = useMemo(() => {
    const rented = db.units.filter(u => u.status === 'RENTED').length;
    const available = db.units.filter(u => u.status === 'AVAILABLE').length;
    const maintenance = db.units.filter(u => u.status === 'MAINTENANCE').length;
    return [
      { name: 'مؤجرة', value: rented },
      { name: 'شاغرة', value: available },
      { name: 'صيانة', value: maintenance },
    ].filter(d => d.value > 0);
  }, [db.units]);

  const expenseCategories = useMemo(() => {
    const now = new Date();
    const start = startOfYear(now);
    const end = endOfYear(now);
    const catMap = new Map<string, number>();
    db.journalEntries
      .filter(entry => isWithinInterval(new Date(entry.date), { start, end }))
      .forEach(entry => {
        if (accountTypeMap.get(entry.accountId) !== 'EXPENSE') return;
        const category = accountNameMap.get(entry.accountId) || 'مصروف غير معرف';
        const signed = entry.type === 'DEBIT' ? entry.amount : -entry.amount;
        catMap.set(category, (catMap.get(category) || 0) + signed);
      });
    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).filter(item => item.value > 0.001).sort((a, b) => b.value - a.value);
  }, [db.journalEntries, accountTypeMap, accountNameMap]);

  const summaryKpis = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    let revenue = 0;
    let expenses = 0;
    db.journalEntries.filter(entry => isWithinInterval(new Date(entry.date), { start: monthStart, end: monthEnd })).forEach(entry => {
      const accountType = accountTypeMap.get(entry.accountId);
      if (accountType === 'REVENUE') revenue += entry.type === 'CREDIT' ? entry.amount : -entry.amount;
      if (accountType === 'EXPENSE') expenses += entry.type === 'DEBIT' ? entry.amount : -entry.amount;
    });
    const totalReceivables = Object.values(contractBalances).reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);
    const totalOwnerPayables = Object.values(ownerBalances).reduce((sum, b) => sum + (b.net > 0 ? b.net : 0), 0);
    const occupancyRate = db.units.length > 0 ? (db.contracts.filter(c => c.status === 'ACTIVE').length / db.units.length) * 100 : 0;
    return { revenue, expenses, net: revenue - expenses, totalReceivables, totalOwnerPayables, occupancyRate };
  }, [db.journalEntries, db.units, db.contracts, contractBalances, ownerBalances, accountTypeMap]);

  const cur = settings.operational?.currency ?? 'OMR';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniKpi label="إيرادات الشهر" value={formatCurrency(summaryKpis.revenue, cur)} icon={<ArrowUp size={18} />} color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" />
        <MiniKpi label="مصروفات الشهر" value={formatCurrency(summaryKpis.expenses, cur)} icon={<ArrowDown size={18} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="صافي الشهر" value={formatCurrency(summaryKpis.net, cur)} icon={<Banknote size={18} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <MiniKpi label="الذمم المدينة" value={formatCurrency(summaryKpis.totalReceivables, cur)} icon={<Users size={18} />} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
        <MiniKpi label="مستحقات الملاك" value={formatCurrency(summaryKpis.totalOwnerPayables, cur)} icon={<Wallet size={18} />} color="bg-purple-100 dark:bg-purple-900/40 text-purple-600" />
        <MiniKpi label="نسبة الإشغال" value={`${summaryKpis.occupancyRate.toFixed(0)}%`} icon={<Percent size={18} />} color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <SectionHeader title="اتجاه الإيرادات والمصروفات (6 أشهر)" icon={<TrendingUp size={18} className="text-primary" />} />
          <div className="h-72 overflow-hidden" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value, cur)} />
                <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="المصروفات" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="توزيع الوحدات" icon={<PieChart size={18} className="text-primary" />} />
          <div className="h-72 overflow-hidden" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie data={occupancyData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {occupancyData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#6b7280'][i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {expenseCategories.length > 0 && (
        <Card className="p-5">
          <SectionHeader title="توزيع المصروفات حسب التصنيف (السنة الحالية)" icon={<BarChart3 size={18} className="text-primary" />} />
          <div className="h-64 overflow-hidden" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value, cur)} />
                <Bar dataKey="value" name="المبلغ" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionHeader title="صافي الدخل الشهري" icon={<Banknote size={18} className="text-primary" />} />
          <div className="h-56 overflow-hidden" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value: number) => formatCurrency(value, cur)} />
                <Bar dataKey="net" name="صافي الدخل" radius={[4, 4, 0, 0]}>
                  {monthlyTrend.map((entry, i) => <Cell key={i} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="اتجاه التحصيل الشهري" icon={<TrendingUp size={18} className="text-primary" />} />
          <div className="h-56 overflow-hidden" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value: number) => formatCurrency(value, cur)} />
                <Line type="monotone" dataKey="revenue" name="التحصيل" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportsOverview;
