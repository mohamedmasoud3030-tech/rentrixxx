import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  Printer, FileText, BarChart3, TrendingUp, Wallet, TrendingDown, Users,
  PieChart, ArrowUp, ArrowDown, Banknote, Percent, ChevronLeft,
  Building2, CalendarRange, Filter, Download, Zap
} from 'lucide-react';
import { UtilityRecord, UtilityType, UTILITY_TYPE_AR, UTILITY_ICON } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { DocumentHeaderInline } from '../components/shared/DocumentHeader';
import {
  exportRentRollToPdf, exportOwnerLedgerToPdf, exportTenantStatementToPdf,
  exportIncomeStatementToPdf, exportTrialBalanceToPdf, exportBalanceSheetToPdf,
  exportAgedReceivablesToPdf
} from '../services/pdfService';
import { calculateBalanceSheetData, calculateIncomeStatementData, calculateAgedReceivables } from '../services/accountingService';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval, format, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart as RechartsPie, Pie, Cell, Legend, AreaChart, Area,
  LineChart, Line
} from 'recharts';

type ReportTab = 'overview' | 'rent_roll' | 'owner' | 'tenant' | 'income_statement' | 'balance_sheet' | 'trial_balance' | 'aged_receivables' | 'property_report' | 'daily_collection' | 'maintenance_report' | 'deposits_report' | 'expenses_report' | 'utilities_report' | 'overdue_tenants' | 'vacant_units';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const ReportPrintableContent: React.FC<{ title: string; date: string; children: React.ReactNode }> = ({ title, date, children }) => {
  const { settings } = useApp();
  const company = settings.general.company;
  const logo = settings.appearance?.logoDataUrl;
  return (
    <div>
      <DocumentHeaderInline company={company} logoUrl={logo} docTitle={title} docDate={date} />
      {children}
    </div>
  );
};

const MiniKpi: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl border border-border bg-card`}>
    <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-bold text-text" dir="ltr">{value}</p>
    </div>
  </div>
);

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
    <h3 className="text-lg font-bold flex items-center gap-2">{icon} {title}</h3>
    {children}
  </div>
);

const ActionBar: React.FC<{ onPrint: () => void; onExport?: () => void; children?: React.ReactNode }> = ({ onPrint, onExport, children }) => (
  <div className="flex flex-wrap gap-3 items-end mb-6">
    {children}
    <div className="flex gap-2 mr-auto">
      <button onClick={onPrint} className="btn btn-primary flex items-center gap-2 text-sm"><Printer size={15} /> Ø·Ø¨Ø§Ø¹Ø©</button>
      {onExport && <button onClick={onExport} className="btn btn-secondary flex items-center gap-2 text-sm"><Download size={15} /> PDF</button>}
    </div>
  </div>
);

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { db, contractBalances, ownerBalances, settings } = useApp();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [activeTab, setActiveTab] = useState<ReportTab>(queryParams.get('tab') as ReportTab || 'overview');
  const currency = settings.operational?.currency ?? 'OMR';

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    navigate(`/reports?tab=${tab}`, { replace: true });
  };

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø©', icon: <BarChart3 size={16} /> },
    { id: 'income_statement', label: 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„', icon: <TrendingUp size={16} /> },
    { id: 'balance_sheet', label: 'Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ©', icon: <Wallet size={16} /> },
    { id: 'trial_balance', label: 'Ù…ÙŠØ²Ø§Ù† Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©', icon: <Filter size={16} /> },
    { id: 'rent_roll', label: 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥ÙŠØ¬Ø§Ø±Ø§Øª', icon: <Building2 size={16} /> },
    { id: 'owner', label: 'ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø§Ù„Ùƒ', icon: <Users size={16} /> },
    { id: 'tenant', label: 'ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±', icon: <Users size={16} /> },
    { id: 'aged_receivables', label: 'Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†', icon: <CalendarRange size={16} /> },
    { id: 'property_report', label: 'ØªÙ‚Ø±ÙŠØ± Ø¹Ù‚Ø§Ø±', icon: <Building2 size={16} /> },
    { id: 'daily_collection', label: 'ÙƒØ´Ù Ø§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„ÙŠÙˆÙ…ÙŠ', icon: <Banknote size={16} /> },
    { id: 'maintenance_report', label: 'ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©', icon: <Filter size={16} /> },
    { id: 'deposits_report', label: 'ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªØ£Ù…ÙŠÙ†Ø§Øª', icon: <Wallet size={16} /> },
    { id: 'expenses_report', label: 'ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª', icon: <TrendingDown size={16} /> },
    { id: 'utilities_report', label: 'ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ø±Ø§ÙÙ‚', icon: <Zap size={16} /> },
    { id: 'overdue_tenants', label: 'Ø§Ù„Ù…ØªØ£Ø®Ø±ÙˆÙ† Ø¹Ù† Ø§Ù„Ø¯ÙØ¹', icon: <TrendingDown size={16} /> },
    { id: 'vacant_units', label: 'Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ø´Ø§ØºØ±Ø©', icon: <Building2 size={16} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <ReportsOverview currency={currency} />;
      case 'rent_roll': return <RentRoll />;
      case 'owner': return <OwnerLedger />;
      case 'tenant': return <TenantStatement />;
      case 'income_statement': return <IncomeStatement />;
      case 'balance_sheet': return <BalanceSheet />;
      case 'trial_balance': return <TrialBalance />;
      case 'aged_receivables': return <AgedReceivables />;
      case 'property_report': return <PropertyReport />;
      case 'daily_collection': return <DailyCollectionReport />;
      case 'maintenance_report': return <MaintenanceReport />;
      case 'deposits_report': return <DepositsReport />;
      case 'expenses_report': return <ExpensesReport />;
      case 'utilities_report': return <UtilitiesReport />;
      case 'overdue_tenants': return <OverdueTenants />;
      case 'vacant_units': return <VacantUnits />;
      default: return <ReportsOverview currency={currency} />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-2 overflow-hidden">
        <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-background'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </Card>
      <div>{renderContent()}</div>
    </div>
  );
};


const ReportsOverview: React.FC<{ currency: string }> = ({ currency }) => {
  const { db, contractBalances, ownerBalances, settings } = useApp();

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) });
    return months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const label = format(monthStart, 'MMM', { locale: ar });
      const revenue = db.receipts
        .filter(r => r.status === 'POSTED' && isWithinInterval(new Date(r.dateTime), { start: monthStart, end: monthEnd }))
        .reduce((s, r) => s + r.amount, 0);
      const expenses = db.expenses
        .filter(e => e.status === 'POSTED' && isWithinInterval(new Date(e.dateTime), { start: monthStart, end: monthEnd }))
        .reduce((s, e) => s + e.amount, 0);
      return { name: label, revenue, expenses, net: revenue - expenses };
    });
  }, [db.receipts, db.expenses]);

  const occupancyData = useMemo(() => {
    const rented = db.units.filter(u => u.status === 'RENTED').length;
    const available = db.units.filter(u => u.status === 'AVAILABLE').length;
    const maintenance = db.units.filter(u => u.status === 'MAINTENANCE').length;
    return [
      { name: 'Ù…Ø¤Ø¬Ø±Ø©', value: rented },
      { name: 'Ø´Ø§ØºØ±Ø©', value: available },
      { name: 'ØµÙŠØ§Ù†Ø©', value: maintenance },
    ].filter(d => d.value > 0);
  }, [db.units]);

  const expenseCategories = useMemo(() => {
    const now = new Date();
    const start = startOfYear(now);
    const end = endOfYear(now);
    const catMap = new Map<string, number>();
    db.expenses
      .filter(e => e.status === 'POSTED' && isWithinInterval(new Date(e.dateTime), { start, end }))
      .forEach(e => {
        const cat = e.category || 'Ø£Ø®Ø±Ù‰';
        catMap.set(cat, (catMap.get(cat) || 0) + e.amount);
      });
    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [db.expenses]);

  const summaryKpis = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const revenue = db.receipts.filter(r => r.status === 'POSTED' && isWithinInterval(new Date(r.dateTime), { start: monthStart, end: monthEnd })).reduce((s, r) => s + r.amount, 0);
    const expenses = db.expenses.filter(e => e.status === 'POSTED' && isWithinInterval(new Date(e.dateTime), { start: monthStart, end: monthEnd })).reduce((s, e) => s + e.amount, 0);
    const totalReceivables = Object.values(contractBalances).reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);
    const totalOwnerPayables = Object.values(ownerBalances).reduce((sum, b) => sum + (b.net > 0 ? b.net : 0), 0);
    const occupancyRate = db.units.length > 0 ? (db.contracts.filter(c => c.status === 'ACTIVE').length / db.units.length) * 100 : 0;
    return { revenue, expenses, net: revenue - expenses, totalReceivables, totalOwnerPayables, occupancyRate };
  }, [db, contractBalances, ownerBalances]);

  const cur = settings.operational?.currency ?? 'OMR';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniKpi label="Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„Ø´Ù‡Ø±" value={formatCurrency(summaryKpis.revenue, cur)} icon={<ArrowUp size={18} />} color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" />
        <MiniKpi label="Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø´Ù‡Ø±" value={formatCurrency(summaryKpis.expenses, cur)} icon={<ArrowDown size={18} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="ØµØ§ÙÙŠ Ø§Ù„Ø´Ù‡Ø±" value={formatCurrency(summaryKpis.net, cur)} icon={<Banknote size={18} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <MiniKpi label="Ø§Ù„Ø°Ù…Ù… Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©" value={formatCurrency(summaryKpis.totalReceivables, cur)} icon={<Users size={18} />} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
        <MiniKpi label="Ù…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„Ù…Ù„Ø§Ùƒ" value={formatCurrency(summaryKpis.totalOwnerPayables, cur)} icon={<Wallet size={18} />} color="bg-purple-100 dark:bg-purple-900/40 text-purple-600" />
        <MiniKpi label="Ù†Ø³Ø¨Ø© Ø§Ù„Ø¥Ø´ØºØ§Ù„" value={`${summaryKpis.occupancyRate.toFixed(0)}%`} icon={<Percent size={18} />} color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <SectionHeader title="Ø§ØªØ¬Ø§Ù‡ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª (6 Ø£Ø´Ù‡Ø±)" icon={<TrendingUp size={18} className="text-primary" />} />
          <div className="h-72" dir="ltr">
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
                <Area type="monotone" dataKey="revenue" name="Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="ØªÙˆØ²ÙŠØ¹ Ø§Ù„ÙˆØ­Ø¯Ø§Øª" icon={<PieChart size={18} className="text-primary" />} />
          <div className="h-72" dir="ltr">
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
          <SectionHeader title="ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø­Ø³Ø¨ Ø§Ù„ØªØµÙ†ÙŠÙ (Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©)" icon={<BarChart3 size={18} className="text-primary" />} />
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value, cur)} />
                <Bar dataKey="value" name="Ø§Ù„Ù…Ø¨Ù„Øº" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionHeader title="ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„ Ø§Ù„Ø´Ù‡Ø±ÙŠ" icon={<Banknote size={18} className="text-primary" />} />
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value: number) => formatCurrency(value, cur)} />
                <Bar dataKey="net" name="ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„" radius={[4, 4, 0, 0]}>
                  {monthlyTrend.map((entry, i) => <Cell key={i} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Ø§ØªØ¬Ø§Ù‡ Ø§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„Ø´Ù‡Ø±ÙŠ" icon={<TrendingUp size={18} className="text-primary" />} />
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value: number) => formatCurrency(value, cur)} />
                <Line type="monotone" dataKey="revenue" name="Ø§Ù„ØªØ­ØµÙŠÙ„" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};


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
        return { property: property?.name || '-', unit: unit.name, tenant: tenant?.name || '-', startDate: activeContract.start, endDate: activeContract.end, rent: activeContract.rent, deposit: activeContract.deposit, balance: contractBalance?.balance || 0, status: 'Ù…Ø¤Ø¬Ø±Ø©' as const };
      }
      return { property: property?.name || '-', unit: unit.name, tenant: '-', startDate: '-', endDate: '-', rent: unit.rentDefault, deposit: 0, balance: 0, status: 'Ø´Ø§ØºØ±Ø©' as const };
    });
    const totals = unitsWithDetails.reduce((acc, item) => {
      if (item.status === 'Ù…Ø¤Ø¬Ø±Ø©') { acc.totalRent += item.rent; acc.totalBalance += item.balance; }
      return acc;
    }, { totalRent: 0, totalBalance: 0 });
    return { units: unitsWithDetails.sort((a, b) => `${a.property}-${a.unit}`.localeCompare(`${b.property}-${b.unit}`)), totals };
  }, [db, contractBalances]);

  const handleExportPdf = () => exportRentRollToPdf(rentRollData.units, rentRollData.totals, settings);

  const kpis = useMemo(() => {
    const rented = rentRollData.units.filter(u => u.status === 'Ù…Ø¤Ø¬Ø±Ø©').length;
    const vacant = rentRollData.units.filter(u => u.status === 'Ø´Ø§ØºØ±Ø©').length;
    return { total: rentRollData.units.length, rented, vacant, occupancy: rentRollData.units.length > 0 ? ((rented / rentRollData.units.length) * 100) : 0 };
  }, [rentRollData]);

  const reportContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right border-collapse">
        <thead>
          <tr className="bg-background text-text-muted text-xs uppercase">
            <th className="px-3 py-3 border border-border">Ø§Ù„Ø¹Ù‚Ø§Ø±</th>
            <th className="px-3 py-3 border border-border">Ø§Ù„ÙˆØ­Ø¯Ø©</th>
            <th className="px-3 py-3 border border-border">Ø§Ù„Ø­Ø§Ù„Ø©</th>
            <th className="px-3 py-3 border border-border">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</th>
            <th className="px-3 py-3 border border-border">Ø¨Ø¯Ø¡ Ø§Ù„Ø¹Ù‚Ø¯</th>
            <th className="px-3 py-3 border border-border">Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø¹Ù‚Ø¯</th>
            <th className="px-3 py-3 border border-border">Ø§Ù„Ø¥ÙŠØ¬Ø§Ø±</th>
            <th className="px-3 py-3 border border-border">Ø§Ù„ØªØ£Ù…ÙŠÙ†</th>
            <th className="px-3 py-3 border border-border">Ø§Ù„Ø±ØµÙŠØ¯</th>
          </tr>
        </thead>
        <tbody>
          {rentRollData.units.map((item, i) => (
            <tr key={i} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-3 py-3 border border-border">{item.property}</td>
              <td className="px-3 py-3 border border-border font-medium">{item.unit}</td>
              <td className="px-3 py-3 border border-border">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.status === 'Ù…Ø¤Ø¬Ø±Ø©' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'}`}>{item.status}</span>
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
            <td colSpan={6} className="px-3 py-3 border border-border text-left">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ (Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ù…Ø¤Ø¬Ø±Ø©)</td>
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
      <SectionHeader title="Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥ÙŠØ¬Ø§Ø±Ø§Øª (Rent Roll)" icon={<Building2 size={20} className="text-primary" />} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙˆØ­Ø¯Ø§Øª" value={String(kpis.total)} icon={<Building2 size={16} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <MiniKpi label="Ù…Ø¤Ø¬Ø±Ø©" value={String(kpis.rented)} icon={<Users size={16} />} color="bg-green-100 dark:bg-green-900/40 text-green-600" />
        <MiniKpi label="Ø´Ø§ØºØ±Ø©" value={String(kpis.vacant)} icon={<Building2 size={16} />} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
        <MiniKpi label="Ù†Ø³Ø¨Ø© Ø§Ù„Ø¥Ø´ØºØ§Ù„" value={`${kpis.occupancy.toFixed(0)}%`} icon={<Percent size={16} />} color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600" />
      </div>
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf} />
      <ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥ÙŠØ¬Ø§Ø±Ø§Øª" date={`ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥ÙŠØ¬Ø§Ø±Ø§Øª"><ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥ÙŠØ¬Ø§Ø±Ø§Øª" date={`ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};


const TrialBalance: React.FC = () => {
  const { db, settings } = useApp();
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';

  const trialBalanceData = useMemo(() => {
    const end = new Date(endDate);
    const balances = new Map<string, { debit: number; credit: number }>();
    db.accounts.forEach(acc => balances.set(acc.id, { debit: 0, credit: 0 }));
    db.journalEntries.filter(je => new Date(je.date) <= end).forEach(je => {
      const balance = balances.get(je.accountId);
      if (balance) {
        if (je.type === 'DEBIT') balance.debit += je.amount;
        if (je.type === 'CREDIT') balance.credit += je.amount;
      }
    });
    const accountsMap = new Map(db.accounts.map(acc => [acc.id, acc]));
    let totalDebit = 0, totalCredit = 0;
    const reportLines = Array.from(balances.entries()).map(([accountId, { debit, credit }]) => {
      const account = accountsMap.get(accountId)!;
      const balance = debit - credit;
      const finalDebit = balance > 0 ? balance : 0;
      const finalCredit = balance < 0 ? -balance : 0;
      totalDebit += finalDebit;
      totalCredit += finalCredit;
      return { no: account.no, name: account.name, debit: finalDebit, credit: finalCredit };
    }).filter(line => line.debit > 0 || line.credit > 0).sort((a, b) => a.no.localeCompare(b.no));
    return { lines: reportLines, totalDebit, totalCredit };
  }, [db.accounts, db.journalEntries, endDate]);

  const handleExportPdf = () => exportTrialBalanceToPdf(trialBalanceData, settings, endDate);
  const isBalanced = Math.abs(trialBalanceData.totalDebit - trialBalanceData.totalCredit) < 0.01;

  const reportContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right border-collapse">
        <thead>
          <tr className="bg-background text-text-muted text-xs uppercase">
            <th className="px-4 py-3 border border-border">Ø±Ù‚Ù… Ø§Ù„Ø­Ø³Ø§Ø¨</th>
            <th className="px-4 py-3 border border-border">Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨</th>
            <th className="px-4 py-3 border border-border">Ù…Ø¯ÙŠÙ†</th>
            <th className="px-4 py-3 border border-border">Ø¯Ø§Ø¦Ù†</th>
          </tr>
        </thead>
        <tbody>
          {trialBalanceData.lines.map(line => (
            <tr key={line.no} className="bg-card hover:bg-background/50">
              <td className="px-4 py-3 font-mono border border-border">{line.no}</td>
              <td className="px-4 py-3 border border-border">{line.name}</td>
              <td className="px-4 py-3 font-mono border border-border">{line.debit > 0 ? formatCurrency(line.debit, cur) : '-'}</td>
              <td className="px-4 py-3 font-mono border border-border">{line.credit > 0 ? formatCurrency(line.credit, cur) : '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-primary/5 text-text">
            <td colSpan={2} className="px-4 py-3 text-left border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
            <td className="px-4 py-3 font-mono border border-border">{formatCurrency(trialBalanceData.totalDebit, cur)}</td>
            <td className="px-4 py-3 font-mono border border-border">{formatCurrency(trialBalanceData.totalCredit, cur)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="Ù…ÙŠØ²Ø§Ù† Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" icon={<Filter size={20} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙŠÙ†" value={formatCurrency(trialBalanceData.totalDebit, cur)} icon={<ArrowUp size={16} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø§Ø¦Ù†" value={formatCurrency(trialBalanceData.totalCredit, cur)} icon={<ArrowDown size={16} />} color="bg-purple-100 dark:bg-purple-900/40 text-purple-600" />
        <MiniKpi label="Ø­Ø§Ù„Ø© Ø§Ù„ØªÙˆØ§Ø²Ù†" value={isBalanced ? 'Ù…ØªÙˆØ§Ø²Ù†' : 'ØºÙŠØ± Ù…ØªÙˆØ§Ø²Ù†'} icon={isBalanced ? <ArrowUp size={16} /> : <ArrowDown size={16} />} color={isBalanced ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'bg-red-100 dark:bg-red-900/40 text-red-600'} />
      </div>
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Ø­ØªÙ‰ ØªØ§Ø±ÙŠØ®</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="Ù…ÙŠØ²Ø§Ù† Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" date={`Ø­ØªÙ‰ ØªØ§Ø±ÙŠØ® ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="Ù…ÙŠØ²Ø§Ù† Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©"><ReportPrintableContent title="Ù…ÙŠØ²Ø§Ù† Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" date={`Ø­ØªÙ‰ ØªØ§Ø±ÙŠØ® ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};


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
  }, [location.search, queryParams]);

  const ledgerData = useMemo(() => {
    if (!selectedOwnerId) return null;
    const owner = db.owners.find(o => o.id === selectedOwnerId);
    if (!owner) return null;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    const inRange = (value?: string) => {
      if (!value) return false;
      const d = new Date(value);
      return d >= start && d <= end;
    };

    const ownerProperties = db.properties.filter(p => p.ownerId === selectedOwnerId);
    const ownerPropertyIds = new Set(ownerProperties.map(p => p.id));
    const ownerUnits = db.units.filter(u => ownerPropertyIds.has(u.propertyId));
    const ownerUnitIds = new Set(ownerUnits.map(u => u.id));
    const ownerContracts = db.contracts.filter(c => ownerUnitIds.has(c.unitId));
    const ownerContractIds = new Set(ownerContracts.map(c => c.id));

    const receiptRows = db.receipts
      .filter(r => r.status === 'POSTED' && ownerContractIds.has(r.contractId) && inRange(r.dateTime))
      .map(r => {
        const contract = db.contracts.find(c => c.id === r.contractId);
        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
        const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
        const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
        return { ...r, tenantName: tenant?.name || '-', unitName: unit?.name || '-', propertyName: property?.name || '-' };
      });

    const expenseRows = db.expenses
      .filter(e => e.status === 'POSTED' && e.chargedTo === 'OWNER' && e.contractId && ownerContractIds.has(e.contractId) && inRange(e.dateTime))
      .map(e => {
        const contract = e.contractId ? db.contracts.find(c => c.id === e.contractId) : null;
        const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
        const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
        return { ...e, unitName: unit?.name || '-', propertyName: property?.name || '-' };
      });

    const maintenanceRows = db.maintenanceRecords
      .filter(m => ownerUnitIds.has(m.unitId) && inRange(m.requestDate))
      .map(m => {
        const unit = db.units.find(u => u.id === m.unitId);
        const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
        return { ...m, unitName: unit?.name || '-', propertyName: property?.name || '-' };
      });

    const utilityRows = (db.utilityRecords || [])
      .filter(u => ownerPropertyIds.has(u.propertyId) && inRange(`${u.month}-01`))
      .map(u => {
        const unit = db.units.find(x => x.id === u.unitId);
        const property = db.properties.find(p => p.id === u.propertyId);
        return { ...u, unitName: unit?.name || '-', propertyName: property?.name || '-' };
      });

    const settlementRows = db.ownerSettlements.filter(s => s.ownerId === selectedOwnerId && inRange(s.date));

    const transactions: Array<{ date: string; details: string; type: string; gross: number; officeShare: number; net: number }> = [];

    receiptRows.forEach(r => {
      const officeShare = showCommission && owner.commissionType === 'RATE' ? r.amount * ((owner.commissionValue || 0) / 100) : 0;
      transactions.push({
        date: r.dateTime,
        details: `تحصيل سند ${r.no} - ${r.tenantName}`,
        type: 'receipt',
        gross: r.amount,
        officeShare,
        net: r.amount - officeShare,
      });
    });

    expenseRows.forEach(e => {
      transactions.push({
        date: e.dateTime,
        details: `مصروف ${e.no} - ${e.category}`,
        type: 'expense',
        gross: -e.amount,
        officeShare: 0,
        net: -e.amount,
      });
    });

    utilityRows.forEach(u => {
      if (u.paidBy !== 'OWNER') return;
      transactions.push({
        date: `${u.month}-01`,
        details: `مرافق ${u.type} - ${u.unitName}`,
        type: 'utility',
        gross: -u.amount,
        officeShare: 0,
        net: -u.amount,
      });
    });

    settlementRows.forEach(s => {
      transactions.push({
        date: s.date,
        details: `تسوية مالية ${s.no}`,
        type: 'settlement',
        gross: -s.amount,
        officeShare: 0,
        net: -s.amount,
      });
    });

    if (showCommission && owner.commissionType === 'FIXED_MONTHLY') {
      const commissionMonths = new Set<string>();
      receiptRows.forEach(r => commissionMonths.add((r.dateTime || '').slice(0, 7)));
      commissionMonths.forEach(month => {
        if (!month) return;
        transactions.push({
          date: `${month}-28`,
          details: `عمولة إدارة ثابتة لشهر ${month}`,
          type: 'commission',
          gross: 0,
          officeShare: owner.commissionValue || 0,
          net: -(owner.commissionValue || 0),
        });
      });
    }

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totals = transactions.reduce(
      (acc, tx) => {
        acc.gross += tx.gross;
        acc.officeShare += tx.officeShare;
        acc.net += tx.net;
        return acc;
      },
      { gross: 0, officeShare: 0, net: 0 }
    );

    const sectionsTotals = {
      receipts: receiptRows.reduce((s, r) => s + r.amount, 0),
      expenses: expenseRows.reduce((s, e) => s + e.amount, 0),
      maintenance: maintenanceRows.reduce((s, m) => s + (m.cost || 0), 0),
      utilities: utilityRows.reduce((s, u) => s + (u.amount || 0), 0),
      settlements: settlementRows.reduce((s, s2) => s + s2.amount, 0),
    };

    return { owner, transactions, totals, sectionsTotals, receiptRows, expenseRows, maintenanceRows, utilityRows, settlementRows };
  }, [selectedOwnerId, startDate, endDate, db, showCommission]);

  const handleExportPdf = () => {
    if (!ledgerData || !selectedOwnerId) return;
    const ownerName = db.owners.find(o => o.id === selectedOwnerId)?.name || '';
    exportOwnerLedgerToPdf(
      ledgerData.transactions,
      ledgerData.totals,
      settings,
      ownerName,
      `للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`,
      showCommission
    );
  };

  const reportContent = ledgerData && (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniKpi label="التحصيلات" value={formatCurrency(ledgerData.sectionsTotals.receipts, cur)} icon={<ArrowUp size={16} />} color="bg-green-100 dark:bg-green-900/40 text-green-600" />
        <MiniKpi label="المصروفات" value={formatCurrency(ledgerData.sectionsTotals.expenses, cur)} icon={<TrendingDown size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="الصيانة" value={formatCurrency(ledgerData.sectionsTotals.maintenance, cur)} icon={<Filter size={16} />} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
        <MiniKpi label="المرافق" value={formatCurrency(ledgerData.sectionsTotals.utilities, cur)} icon={<Zap size={16} />} color="bg-purple-100 dark:bg-purple-900/40 text-purple-600" />
        <MiniKpi label="صافي المالك" value={formatCurrency(ledgerData.totals.net, cur)} icon={<Wallet size={16} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
      </div>

      <div className="overflow-x-auto">
        <h4 className="text-base font-bold mb-2">الحركة المالية المجمعة</h4>
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
            {ledgerData.transactions.map((tx, i) => (
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

      <div className="overflow-x-auto">
        <h4 className="text-base font-bold mb-2">جدول التحصيلات</h4>
        <table className="w-full text-sm text-right border-collapse border border-border">
          <thead className="bg-background text-xs">
            <tr>
              <th className="px-3 py-2 border border-border">التاريخ</th>
              <th className="px-3 py-2 border border-border">السند</th>
              <th className="px-3 py-2 border border-border">المستأجر</th>
              <th className="px-3 py-2 border border-border">الوحدة</th>
              <th className="px-3 py-2 border border-border">العقار</th>
              <th className="px-3 py-2 border border-border">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.receiptRows.length === 0 && <tr><td colSpan={6} className="px-3 py-3 text-center border border-border text-text-muted">لا توجد بيانات</td></tr>}
            {ledgerData.receiptRows.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2 border border-border">{formatDate(r.dateTime)}</td>
                <td className="px-3 py-2 border border-border font-mono">{r.no}</td>
                <td className="px-3 py-2 border border-border">{r.tenantName}</td>
                <td className="px-3 py-2 border border-border">{r.unitName}</td>
                <td className="px-3 py-2 border border-border">{r.propertyName}</td>
                <td className="px-3 py-2 border border-border font-mono">{formatCurrency(r.amount, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <h4 className="text-base font-bold mb-2">جدول المصروفات</h4>
        <table className="w-full text-sm text-right border-collapse border border-border">
          <thead className="bg-background text-xs">
            <tr>
              <th className="px-3 py-2 border border-border">التاريخ</th>
              <th className="px-3 py-2 border border-border">السند</th>
              <th className="px-3 py-2 border border-border">التصنيف</th>
              <th className="px-3 py-2 border border-border">الوحدة</th>
              <th className="px-3 py-2 border border-border">العقار</th>
              <th className="px-3 py-2 border border-border">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.expenseRows.length === 0 && <tr><td colSpan={6} className="px-3 py-3 text-center border border-border text-text-muted">لا توجد بيانات</td></tr>}
            {ledgerData.expenseRows.map(e => (
              <tr key={e.id}>
                <td className="px-3 py-2 border border-border">{formatDate(e.dateTime)}</td>
                <td className="px-3 py-2 border border-border font-mono">{e.no}</td>
                <td className="px-3 py-2 border border-border">{e.category}</td>
                <td className="px-3 py-2 border border-border">{e.unitName}</td>
                <td className="px-3 py-2 border border-border">{e.propertyName}</td>
                <td className="px-3 py-2 border border-border font-mono">{formatCurrency(e.amount, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <h4 className="text-base font-bold mb-2">جدول الصيانة</h4>
        <table className="w-full text-sm text-right border-collapse border border-border">
          <thead className="bg-background text-xs">
            <tr>
              <th className="px-3 py-2 border border-border">التاريخ</th>
              <th className="px-3 py-2 border border-border">الطلب</th>
              <th className="px-3 py-2 border border-border">الوصف</th>
              <th className="px-3 py-2 border border-border">الوحدة</th>
              <th className="px-3 py-2 border border-border">العقار</th>
              <th className="px-3 py-2 border border-border">التكلفة</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.maintenanceRows.length === 0 && <tr><td colSpan={6} className="px-3 py-3 text-center border border-border text-text-muted">لا توجد بيانات</td></tr>}
            {ledgerData.maintenanceRows.map(m => (
              <tr key={m.id}>
                <td className="px-3 py-2 border border-border">{formatDate(m.requestDate)}</td>
                <td className="px-3 py-2 border border-border font-mono">{m.no}</td>
                <td className="px-3 py-2 border border-border">{m.description}</td>
                <td className="px-3 py-2 border border-border">{m.unitName}</td>
                <td className="px-3 py-2 border border-border">{m.propertyName}</td>
                <td className="px-3 py-2 border border-border font-mono">{formatCurrency(m.cost || 0, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <h4 className="text-base font-bold mb-2">جدول المرافق</h4>
        <table className="w-full text-sm text-right border-collapse border border-border">
          <thead className="bg-background text-xs">
            <tr>
              <th className="px-3 py-2 border border-border">الشهر</th>
              <th className="px-3 py-2 border border-border">النوع</th>
              <th className="px-3 py-2 border border-border">الوحدة</th>
              <th className="px-3 py-2 border border-border">العقار</th>
              <th className="px-3 py-2 border border-border">على حساب</th>
              <th className="px-3 py-2 border border-border">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.utilityRows.length === 0 && <tr><td colSpan={6} className="px-3 py-3 text-center border border-border text-text-muted">لا توجد بيانات</td></tr>}
            {ledgerData.utilityRows.map(u => (
              <tr key={u.id}>
                <td className="px-3 py-2 border border-border">{u.month}</td>
                <td className="px-3 py-2 border border-border">{u.type}</td>
                <td className="px-3 py-2 border border-border">{u.unitName}</td>
                <td className="px-3 py-2 border border-border">{u.propertyName}</td>
                <td className="px-3 py-2 border border-border">{u.paidBy === 'OWNER' ? 'المالك' : u.paidBy === 'TENANT' ? 'المستأجر' : 'المكتب'}</td>
                <td className="px-3 py-2 border border-border font-mono">{formatCurrency(u.amount || 0, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <h4 className="text-base font-bold mb-2">جدول التسويات</h4>
        <table className="w-full text-sm text-right border-collapse border border-border">
          <thead className="bg-background text-xs">
            <tr>
              <th className="px-3 py-2 border border-border">التاريخ</th>
              <th className="px-3 py-2 border border-border">رقم التسوية</th>
              <th className="px-3 py-2 border border-border">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.settlementRows.length === 0 && <tr><td colSpan={3} className="px-3 py-3 text-center border border-border text-text-muted">لا توجد بيانات</td></tr>}
            {ledgerData.settlementRows.map(s => (
              <tr key={s.id}>
                <td className="px-3 py-2 border border-border">{formatDate(s.date)}</td>
                <td className="px-3 py-2 border border-border font-mono">{s.no}</td>
                <td className="px-3 py-2 border border-border font-mono">{formatCurrency(s.amount, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      {reportContent && <ReportPrintableContent title={`كشف حساب المالك: ${db.owners.find(o => o.id === selectedOwnerId)?.name || ''}`} date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>}
      {isPrinting && reportContent && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="كشف حساب المالك"><ReportPrintableContent title={`كشف حساب المالك: ${db.owners.find(o => o.id === selectedOwnerId)?.name || ''}`} date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};
const TenantStatement: React.FC = () => {
  const { db, settings, contractBalances } = useApp();
  const [selectedContractId, setSelectedContractId] = useState<string>(db.contracts[0]?.id || '');
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';

  const statementData = useMemo(() => {
    if (!selectedContractId) return null;
    const contract = db.contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;
    const tenant = db.tenants.find(t => t.id === contract.tenantId);
    const unit = db.units.find(u => u.id === contract.unitId);
    const property = db.properties.find(p => p.id === unit?.propertyId);
    const invoices = db.invoices.filter(inv => inv.contractId === contract.id);
    const receipts = db.receipts.filter(r => r.contractId === contract.id && r.status === 'POSTED');
    let transactions: { date: string; description: string; debit: number; credit: number }[] = [];
    invoices.forEach(inv => transactions.push({ date: inv.dueDate, description: inv.notes || `ÙØ§ØªÙˆØ±Ø© Ø±Ù‚Ù… ${inv.no}`, debit: inv.amount, credit: 0 }));
    const channelLabels: Record<string, string> = { CASH: 'Ù†Ù‚Ø¯ÙŠ', BANK: 'ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ', POS: 'Ø´Ø¨ÙƒØ©', OTHER: 'Ø£Ø®Ø±Ù‰' };
    receipts.forEach(r => transactions.push({ date: r.dateTime, description: `Ø¯ÙØ¹Ø© (${channelLabels[r.channel] || r.channel}) - Ø³Ù†Ø¯ ${r.no}`, debit: 0, credit: r.amount }));
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    const statement = transactions.map(tx => { balance += tx.debit - tx.credit; return { ...tx, balance }; });
    const finalBalance = contractBalances[contract.id]?.balance || 0;
    return { contract, tenant, unit, property, statement, finalBalance };
  }, [selectedContractId, db, contractBalances]);

  const handleExportPdf = () => { if (statementData) exportTenantStatementToPdf(statementData, settings); };

  const reportContent = statementData && (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 border rounded-lg border-border mb-6 bg-background">
        <div><span className="text-text-muted text-xs">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±:</span> <span className="font-bold block">{statementData.tenant?.name}</span></div>
        <div><span className="text-text-muted text-xs">Ø§Ù„Ø¹Ù‚Ø§Ø±:</span> <span className="font-bold block">{statementData.property?.name}</span></div>
        <div><span className="text-text-muted text-xs">Ø§Ù„Ù‡Ø§ØªÙ:</span> <span className="font-bold block">{statementData.tenant?.phone}</span></div>
        <div><span className="text-text-muted text-xs">Ø§Ù„ÙˆØ­Ø¯Ø©:</span> <span className="font-bold block">{statementData.unit?.name}</span></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right border-collapse">
          <thead>
            <tr className="bg-background text-text-muted text-xs uppercase">
              <th className="px-4 py-3 border border-border">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
              <th className="px-4 py-3 border border-border">Ø§Ù„Ø¨ÙŠØ§Ù†</th>
              <th className="px-4 py-3 border border-border">Ù…Ø¯ÙŠÙ†</th>
              <th className="px-4 py-3 border border-border">Ø¯Ø§Ø¦Ù†</th>
              <th className="px-4 py-3 border border-border">Ø§Ù„Ø±ØµÙŠØ¯</th>
            </tr>
          </thead>
          <tbody>
            {statementData.statement.map((tx, i) => (
              <tr key={i} className="bg-card hover:bg-background/50">
                <td className="px-4 py-3 border border-border">{formatDate(tx.date)}</td>
                <td className="px-4 py-3 border border-border">{tx.description}</td>
                <td className="px-4 py-3 text-red-500 border border-border font-mono">{tx.debit > 0 ? formatCurrency(tx.debit, cur) : '-'}</td>
                <td className="px-4 py-3 text-green-500 border border-border font-mono">{tx.credit > 0 ? formatCurrency(tx.credit, cur) : '-'}</td>
                <td className="px-4 py-3 font-bold border border-border font-mono">{formatCurrency(tx.balance, cur)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-primary/5 text-text">
              <td colSpan={4} className="px-4 py-3 text-left border border-border">Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ Ø§Ù„Ù…Ø³ØªØ­Ù‚</td>
              <td className="px-4 py-3 border border-border font-mono">{formatCurrency(statementData.finalBalance, cur)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±" icon={<Users size={20} className="text-primary" />} />
      {statementData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ±" value={formatCurrency(statementData.statement.reduce((s, tx) => s + tx.debit, 0), cur)} icon={<FileText size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
          <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹" value={formatCurrency(statementData.statement.reduce((s, tx) => s + tx.credit, 0), cur)} icon={<ArrowDown size={16} />} color="bg-green-100 dark:bg-green-900/40 text-green-600" />
          <MiniKpi label="Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ù…Ø³ØªØ­Ù‚" value={formatCurrency(statementData.finalBalance, cur)} icon={<Wallet size={16} />} color={statementData.finalBalance > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-green-100 dark:bg-green-900/40 text-green-600'} />
        </div>
      )}
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div className="flex-grow max-w-md">
          <label className="block text-xs font-medium text-text-muted mb-1">Ø§Ø®ØªØ± Ø§Ù„Ø¹Ù‚Ø¯</label>
          <select value={selectedContractId} onChange={e => setSelectedContractId(e.target.value)} className="w-full text-sm">
            <option value="">-- Ø§Ø®ØªØ± --</option>
            {db.contracts.map(c => { const t = db.tenants.find(t => t.id === c.tenantId); const u = db.units.find(u => u.id === c.unitId); return <option key={c.id} value={c.id}>{u?.name} / {t?.name} (ÙŠØ¨Ø¯Ø£ ÙÙŠ {c.start})</option>; })}
          </select>
        </div>
      </ActionBar>
      {reportContent && <ReportPrintableContent title="ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ù…Ø³ØªØ£Ø¬Ø±" date={`ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ${new Date().toLocaleDateString('ar-EG')}`}>{reportContent}</ReportPrintableContent>}
      {isPrinting && reportContent && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±"><ReportPrintableContent title="ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ù…Ø³ØªØ£Ø¬Ø±" date={`ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ${new Date().toLocaleDateString('ar-EG')}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};


const IncomeStatement: React.FC = () => {
  const { db, settings } = useApp();
  const today = new Date();
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';
  const data = useMemo(() => calculateIncomeStatementData(db, startDate, endDate), [db, startDate, endDate]);
  const handleExportPdf = () => exportIncomeStatementToPdf(data, settings, `Ù„Ù„ÙØªØ±Ø© Ù…Ù† ${formatDate(startDate)} Ø¥Ù„Ù‰ ${formatDate(endDate)}`);

  const chartData = useMemo(() => {
    const items = [
      ...data.revenues.map(r => ({ name: r.name, value: r.balance, type: 'revenue' })),
      ...data.expenses.map(e => ({ name: e.name, value: e.balance, type: 'expense' })),
    ];
    return items;
  }, [data]);

  const reportContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold border-b-2 border-emerald-500 pb-2 mb-4 flex items-center gap-2"><TrendingUp className="text-emerald-500" size={20} /> Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</h3>
          {data.revenues.map(item => (
            <div key={item.no} className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0">
              <span>{item.name}</span>
              <span className="font-mono font-bold text-emerald-600">{formatCurrency(item.balance, cur)}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold pt-3 mt-2 border-t-2 border-emerald-500">
            <span>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</span>
            <span className="text-emerald-600">{formatCurrency(data.totalRevenue, cur)}</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold border-b-2 border-red-500 pb-2 mb-4 flex items-center gap-2"><TrendingDown className="text-red-500" size={20} /> Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</h3>
          {data.expenses.map(item => (
            <div key={item.no} className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0">
              <span>{item.name}</span>
              <span className="font-mono font-bold text-red-600">({formatCurrency(item.balance, cur)})</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold pt-3 mt-2 border-t-2 border-red-500">
            <span>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</span>
            <span className="text-red-600">({formatCurrency(data.totalExpense, cur)})</span>
          </div>
        </div>
      </div>
      <div className={`p-5 rounded-xl text-center ${data.netIncome >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
        <p className="text-sm text-text-muted mb-1">ØµØ§ÙÙŠ Ø§Ù„Ø±Ø¨Ø­ / (Ø§Ù„Ø®Ø³Ø§Ø±Ø©)</p>
        <p className={`text-3xl font-black ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(data.netIncome, cur)}</p>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„" icon={<TrendingUp size={20} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª" value={formatCurrency(data.totalRevenue, cur)} icon={<ArrowUp size={16} />} color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" />
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª" value={formatCurrency(data.totalExpense, cur)} icon={<ArrowDown size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„" value={formatCurrency(data.netIncome, cur)} icon={<Banknote size={16} />} color={data.netIncome >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-red-100 dark:bg-red-900/40 text-red-600'} />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-background rounded-xl p-4 border border-border">
            <p className="text-sm font-bold mb-3 text-text-muted">ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</p>
            <div className="h-48" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={data.revenues} dataKey="balance" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {data.revenues.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-background rounded-xl p-4 border border-border">
            <p className="text-sm font-bold mb-3 text-text-muted">ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</p>
            <div className="h-48" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={data.expenses} dataKey="balance" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {data.expenses.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Ù…Ù†</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Ø¥Ù„Ù‰</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„" date={`Ù„Ù„ÙØªØ±Ø© Ù…Ù† ${formatDate(startDate)} Ø¥Ù„Ù‰ ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„"><ReportPrintableContent title="Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„" date={`Ù„Ù„ÙØªØ±Ø© Ù…Ù† ${formatDate(startDate)} Ø¥Ù„Ù‰ ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};


const BalanceSheet: React.FC = () => {
  const { db, settings } = useApp();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';
  const data = useMemo(() => calculateBalanceSheetData(db, asOfDate), [db, asOfDate]);
  const handleExportPdf = () => exportBalanceSheetToPdf(data, settings, asOfDate);

  const renderLines = (lines: any[], indent = 0) => (
    <>
      {lines.map(line => (
        <React.Fragment key={line.no}>
          <tr className={line.isParent ? 'font-bold bg-background' : 'hover:bg-background/50'}>
            <td className="p-2.5 border border-border" style={{ paddingRight: `${1 + indent}rem` }}>{line.name}</td>
            <td className="p-2.5 border border-border font-mono">{line.balance > 0 ? formatCurrency(line.balance, cur) : '-'}</td>
          </tr>
          {line.children && renderLines(line.children, indent + 1.5)}
        </React.Fragment>
      ))}
    </>
  );

  const isBalanced = Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01;

  const reportContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Wallet size={18} className="text-blue-500" /> Ø§Ù„Ø£ØµÙˆÙ„</h3>
        <table className="w-full text-sm border-collapse border border-border">
          <tbody>{renderLines(data.assets)}</tbody>
          <tfoot><tr className="font-black text-base bg-blue-50 dark:bg-blue-900/20"><td className="p-2.5 border border-border">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£ØµÙˆÙ„</td><td className="p-2.5 border border-border font-mono">{formatCurrency(data.totalAssets, cur)}</td></tr></tfoot>
        </table>
      </div>
      <div>
        <h3 className="text-lg font-bold mb-3">Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª ÙˆØ­Ù‚ÙˆÙ‚ Ø§Ù„Ù…Ù„ÙƒÙŠØ©</h3>
        <table className="w-full text-sm border-collapse border border-border">
          <tbody>
            {renderLines(data.liabilities)}
            <tr className="font-bold bg-background"><td className="p-2.5 border border-border">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª</td><td className="p-2.5 border border-border font-mono">{formatCurrency(data.totalLiabilities, cur)}</td></tr>
            {renderLines(data.equity)}
            <tr className="font-bold bg-background"><td className="p-2.5 border border-border">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø­Ù‚ÙˆÙ‚ Ø§Ù„Ù…Ù„ÙƒÙŠØ©</td><td className="p-2.5 border border-border font-mono">{formatCurrency(data.totalEquity, cur)}</td></tr>
          </tbody>
          <tfoot><tr className="font-black text-base bg-blue-50 dark:bg-blue-900/20"><td className="p-2.5 border border-border">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª ÙˆØ­Ù‚ÙˆÙ‚ Ø§Ù„Ù…Ù„ÙƒÙŠØ©</td><td className="p-2.5 border border-border font-mono">{formatCurrency(data.totalLiabilities + data.totalEquity, cur)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ø§Ù„Ø¹Ù…ÙˆÙ…ÙŠØ©" icon={<Wallet size={20} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£ØµÙˆÙ„" value={formatCurrency(data.totalAssets, cur)} icon={<ArrowUp size={16} />} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª" value={formatCurrency(data.totalLiabilities, cur)} icon={<ArrowDown size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="Ø§Ù„ØªÙˆØ§Ø²Ù†" value={isBalanced ? 'Ù…ØªÙˆØ§Ø²Ù†Ø©' : 'ØºÙŠØ± Ù…ØªÙˆØ§Ø²Ù†Ø©'} icon={isBalanced ? <ArrowUp size={16} /> : <ArrowDown size={16} />} color={isBalanced ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'bg-red-100 dark:bg-red-900/40 text-red-600'} />
      </div>
      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Ø­ØªÙ‰ ØªØ§Ø±ÙŠØ®</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ø§Ù„Ø¹Ù…ÙˆÙ…ÙŠØ©" date={`ÙƒÙ…Ø§ ÙÙŠ ØªØ§Ø±ÙŠØ® ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ø§Ù„Ø¹Ù…ÙˆÙ…ÙŠØ©"><ReportPrintableContent title="Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ø§Ù„Ø¹Ù…ÙˆÙ…ÙŠØ©" date={`ÙƒÙ…Ø§ ÙÙŠ ØªØ§Ø±ÙŠØ® ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};


const AgedReceivables: React.FC = () => {
  const { db, settings } = useApp();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrinting, setIsPrinting] = useState(false);
  const cur = settings.operational?.currency ?? 'OMR';
  const data = useMemo(() => calculateAgedReceivables(db, asOfDate), [db, asOfDate]);
  const handleExportPdf = () => exportAgedReceivablesToPdf(data, settings, asOfDate);

  const agingChartData = useMemo(() => [
    { name: 'Ø­Ø§Ù„ÙŠ', value: data.totals.current },
    { name: '1-30', value: data.totals['1-30'] },
    { name: '31-60', value: data.totals['31-60'] },
    { name: '61-90', value: data.totals['61-90'] },
    { name: '90+', value: data.totals['90+'] },
  ].filter(d => d.value > 0), [data]);

  const reportContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right border-collapse">
        <thead>
          <tr className="bg-background text-text-muted text-xs uppercase">
            <th className="px-3 py-3 border border-border">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</th>
            <th className="px-3 py-3 border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th>
            <th className="px-3 py-3 border border-border">Ø­Ø§Ù„ÙŠ</th>
            <th className="px-3 py-3 border border-border">1-30 ÙŠÙˆÙ…</th>
            <th className="px-3 py-3 border border-border">31-60 ÙŠÙˆÙ…</th>
            <th className="px-3 py-3 border border-border">61-90 ÙŠÙˆÙ…</th>
            <th className="px-3 py-3 border border-border">+90 ÙŠÙˆÙ…</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} className="bg-card hover:bg-background/50">
              <td className="px-3 py-3 border border-border font-medium">{line.tenantName}</td>
              <td className="px-3 py-3 border border-border font-bold font-mono text-red-600">{formatCurrency(line.total, cur)}</td>
              <td className="px-3 py-3 border border-border font-mono">{line.current > 0 ? formatCurrency(line.current, cur) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono">{line['1-30'] > 0 ? formatCurrency(line['1-30'], cur) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono">{line['31-60'] > 0 ? formatCurrency(line['31-60'], cur) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono">{line['61-90'] > 0 ? formatCurrency(line['61-90'], cur) : '-'}</td>
              <td className="px-3 py-3 border border-border font-mono text-red-600">{line['90+'] > 0 ? formatCurrency(line['90+'], cur) : '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-primary/5 text-text">
            <td className="px-3 py-3 border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals.total, cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals.current, cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals['1-30'], cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals['31-60'], cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals['61-90'], cur)}</td>
            <td className="px-3 py-3 border border-border font-mono">{formatCurrency(data.totals['90+'], cur)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ØªÙ‚Ø±ÙŠØ± Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†" icon={<CalendarRange size={20} className="text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø°Ù…Ù…" value={formatCurrency(data.totals.total, cur)} icon={<Users size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
        <MiniKpi label="Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±ÙŠÙ† Ø§Ù„Ù…Ø¯ÙŠÙ†ÙŠÙ†" value={String(data.lines.length)} icon={<Users size={16} />} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
        <MiniKpi label="Ø¯ÙŠÙˆÙ† Ù…ØªØ£Ø®Ø±Ø© +90 ÙŠÙˆÙ…" value={formatCurrency(data.totals['90+'], cur)} icon={<ArrowDown size={16} />} color="bg-red-100 dark:bg-red-900/40 text-red-700" />
      </div>

      {agingChartData.length > 0 && (
        <div className="bg-background rounded-xl p-4 border border-border mb-6">
          <p className="text-sm font-bold mb-3 text-text-muted">ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø°Ù…Ù… Ø­Ø³Ø¨ Ø§Ù„Ø¹Ù…Ø±</p>
          <div className="h-48" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
                <Bar dataKey="value" name="Ø§Ù„Ù…Ø¨Ù„Øº" radius={[4, 4, 0, 0]}>
                  {agingChartData.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#991b1b'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <ActionBar onPrint={() => setIsPrinting(true)} onExport={handleExportPdf}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Ø­ØªÙ‰ ØªØ§Ø±ÙŠØ®</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†" date={`ÙƒÙ…Ø§ ÙÙŠ ØªØ§Ø±ÙŠØ® ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ØªÙ‚Ø±ÙŠØ± Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†"><ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†" date={`ÙƒÙ…Ø§ ÙÙŠ ØªØ§Ø±ÙŠØ® ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

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
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙˆØ­Ø¯Ø§Øª" value={String(units.length)} icon={<Building2 size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="Ù…Ø¤Ø¬Ø±Ø©" value={String(rented)} icon={<Users size={18} />} color="bg-green-100 text-green-700" />
        <MiniKpi label="Ø´Ø§ØºØ±Ø©" value={String(available)} icon={<Building2 size={18} />} color="bg-yellow-100 text-yellow-700" />
        <MiniKpi label="Ø§Ù„Ø¯Ø®Ù„ Ø§Ù„Ø´Ù‡Ø±ÙŠ" value={formatCurrency(totalRent, cur)} icon={<Banknote size={18} />} color="bg-emerald-100 text-emerald-700" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MiniKpi label="Ø§Ù„Ø¯Ø®Ù„ Ø§Ù„Ø³Ù†ÙˆÙŠ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹" value={formatCurrency(annualIncome, cur)} icon={<TrendingUp size={18} />} color="bg-purple-100 text-purple-700" />
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ ØªÙƒØ§Ù„ÙŠÙ Ø§Ù„ØµÙŠØ§Ù†Ø©" value={formatCurrency(maintenanceCost, cur)} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-700" />
      </div>
      {property && <div className="mb-4 text-sm"><p>Ø§Ù„Ù…Ø§Ù„Ùƒ: <span className="font-bold">{owner?.name || '-'}</span></p><p>Ø§Ù„Ù…ÙˆÙ‚Ø¹: {property.location || '-'}</p></div>}
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">Ø§Ù„ÙˆØ­Ø¯Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù†ÙˆØ¹</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø­Ø§Ù„Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø¥ÙŠØ¬Ø§Ø±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ØªØ£Ù…ÙŠÙ†</th>
        </tr></thead>
        <tbody>{units.map(u => {
          const contract = db.contracts.find(c => c.unitId === u.id && c.status === 'ACTIVE');
          const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
          return (
            <tr key={u.id} className="hover:bg-background">
              <td className="px-3 py-2 border border-border font-medium">{u.name}</td>
              <td className="px-3 py-2 border border-border">{u.type}</td>
              <td className="px-3 py-2 border border-border"><span className={`px-2 py-0.5 text-xs rounded-full ${u.status === 'RENTED' ? 'bg-blue-100 text-blue-800' : u.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{u.status === 'RENTED' ? 'Ù…Ø¤Ø¬Ø±Ø©' : u.status === 'AVAILABLE' ? 'Ø´Ø§ØºØ±Ø©' : u.status === 'ON_HOLD' ? 'Ù…Ø¹Ù„Ù‚Ø©' : 'ØµÙŠØ§Ù†Ø©'}</span></td>
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
      <SectionHeader title="ØªÙ‚Ø±ÙŠØ± Ø¹Ù‚Ø§Ø±" icon={<Building2 size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Ø§Ù„Ø¹Ù‚Ø§Ø±</label>
          <select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} className="text-sm">
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title={`ØªÙ‚Ø±ÙŠØ± Ø¹Ù‚Ø§Ø±: ${property?.name || ''}`} date={formatDate(new Date().toISOString())}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ØªÙ‚Ø±ÙŠØ± Ø¹Ù‚Ø§Ø±"><ReportPrintableContent title={`ØªÙ‚Ø±ÙŠØ± Ø¹Ù‚Ø§Ø±: ${property?.name || ''}`} date={formatDate(new Date().toISOString())}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

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
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªØ­ØµÙŠÙ„" value={formatCurrency(totalAll, cur)} icon={<Banknote size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="Ù†Ù‚Ø¯ÙŠ" value={formatCurrency(totalCash, cur)} icon={<Banknote size={18} />} color="bg-green-100 text-green-700" />
        <MiniKpi label="ØªØ­ÙˆÙŠÙ„/Ø´Ø¨ÙƒØ©" value={formatCurrency(totalBank, cur)} icon={<Banknote size={18} />} color="bg-purple-100 text-purple-700" />
        <MiniKpi label="Ø´ÙŠÙƒØ§Øª" value={formatCurrency(totalCheck, cur)} icon={<Banknote size={18} />} color="bg-yellow-100 text-yellow-700" />
      </div>
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø¨Ù„Øº</th>
          <th className="px-3 py-2 border border-border">Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹</th>
          <th className="px-3 py-2 border border-border">Ù…Ù„Ø§Ø­Ø¸Ø§Øª</th>
        </tr></thead>
        <tbody>{dayReceipts.map(r => {
          const contract = db.contracts.find(c => c.id === r.contractId);
          const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
          return (
            <tr key={r.id} className="hover:bg-background">
              <td className="px-3 py-2 border border-border">{r.no}</td>
              <td className="px-3 py-2 border border-border">{tenant?.name || '-'}</td>
              <td className="px-3 py-2 border border-border font-bold">{formatCurrency(r.amount, cur)}</td>
              <td className="px-3 py-2 border border-border">{r.channel === 'CASH' ? 'Ù†Ù‚Ø¯ÙŠ' : r.channel === 'BANK' ? 'ØªØ­ÙˆÙŠÙ„' : r.channel === 'POS' ? 'Ø´Ø¨ÙƒØ©' : r.channel === 'CHECK' ? 'Ø´ÙŠÙƒ' : 'Ø£Ø®Ø±Ù‰'}</td>
              <td className="px-3 py-2 border border-border">{r.ref || '-'}</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={2} className="px-3 py-2 border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalAll, cur)}</td>
          <td colSpan={2} className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ÙƒØ´Ù Ø§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„ÙŠÙˆÙ…ÙŠ" icon={<Banknote size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)}>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Ø§Ù„ØªØ§Ø±ÙŠØ®</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" />
        </div>
      </ActionBar>
      <ReportPrintableContent title="ÙƒØ´Ù Ø§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„ÙŠÙˆÙ…ÙŠ" date={formatDate(date)}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ÙƒØ´Ù Ø§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„ÙŠÙˆÙ…ÙŠ"><ReportPrintableContent title="ÙƒØ´Ù Ø§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„ÙŠÙˆÙ…ÙŠ" date={formatDate(date)}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

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
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªÙƒØ§Ù„ÙŠÙ" value={formatCurrency(totalCost, cur)} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-700" />
        <MiniKpi label="Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø§Ù„Ùƒ" value={formatCurrency(ownerCost, cur)} icon={<Users size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±" value={formatCurrency(tenantCost, cur)} icon={<Users size={18} />} color="bg-yellow-100 text-yellow-700" />
        <MiniKpi label="Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙƒØªØ¨" value={formatCurrency(officeCost, cur)} icon={<Users size={18} />} color="bg-gray-100 text-gray-700" />
      </div>
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ÙˆØ­Ø¯Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ÙˆØµÙ</th>
          <th className="px-3 py-2 border border-border">Ø¹Ù„Ù‰ Ø­Ø³Ø§Ø¨</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ØªÙƒÙ„ÙØ©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø­Ø§Ù„Ø©</th>
        </tr></thead>
        <tbody>{records.map(m => {
          const unit = db.units.find(u => u.id === m.unitId);
          return (
            <tr key={m.id} className="hover:bg-background">
              <td className="px-3 py-2 border border-border">{m.requestDate}</td>
              <td className="px-3 py-2 border border-border">{unit?.name || '-'}</td>
              <td className="px-3 py-2 border border-border">{m.description}</td>
              <td className="px-3 py-2 border border-border">{m.chargedTo === 'OWNER' ? 'Ø§Ù„Ù…Ø§Ù„Ùƒ' : m.chargedTo === 'TENANT' ? 'Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±' : 'Ø§Ù„Ù…ÙƒØªØ¨'}</td>
              <td className="px-3 py-2 border border-border font-bold">{formatCurrency(m.cost || 0, cur)}</td>
              <td className="px-3 py-2 border border-border">{m.status === 'COMPLETED' ? 'Ù…ÙƒØªÙ…Ù„' : m.status === 'IN_PROGRESS' ? 'Ø¬Ø§Ø±ÙŠ' : m.status === 'NEW' ? 'Ø¬Ø¯ÙŠØ¯' : m.status}</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={4} className="px-3 py-2 border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalCost, cur)}</td>
          <td className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©" icon={<Filter size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ù…Ù†</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ø¥Ù„Ù‰</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ø§Ù„Ø¹Ù‚Ø§Ø±</label>
          <select value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)} className="text-sm">
            <option value="all">Ø§Ù„ÙƒÙ„</option>
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©" date={`${formatDate(fromDate)} - ${formatDate(toDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©"><ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©" date={`${formatDate(fromDate)} - ${formatDate(toDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

const DepositsReport: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [isPrinting, setIsPrinting] = useState(false);

  const activeContracts = db.contracts.filter(c => c.status === 'ACTIVE' && (c.deposit || 0) > 0);
  const totalDeposits = activeContracts.reduce((s, c) => s + (c.deposit || 0), 0);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªØ£Ù…ÙŠÙ†Ø§Øª" value={formatCurrency(totalDeposits, cur)} icon={<Wallet size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù‚ÙˆØ¯" value={String(activeContracts.length)} icon={<FileText size={18} />} color="bg-green-100 text-green-700" />
      </div>
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ÙˆØ­Ø¯Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø¹Ù‚Ø§Ø±</th>
          <th className="px-3 py-2 border border-border">Ù…Ø¨Ù„Øº Ø§Ù„ØªØ£Ù…ÙŠÙ†</th>
          <th className="px-3 py-2 border border-border">Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø¹Ù‚Ø¯</th>
          <th className="px-3 py-2 border border-border">Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ø¹Ù‚Ø¯</th>
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
          <td colSpan={3} className="px-3 py-2 border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalDeposits, cur)}</td>
          <td colSpan={2} className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªØ£Ù…ÙŠÙ†Ø§Øª (Ø§Ù„ÙˆØ¯Ø§Ø¦Ø¹)" icon={<Wallet size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)} />
      <ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªØ£Ù…ÙŠÙ†Ø§Øª" date={formatDate(new Date().toISOString())}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªØ£Ù…ÙŠÙ†Ø§Øª"><ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªØ£Ù…ÙŠÙ†Ø§Øª" date={formatDate(new Date().toISOString())}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

const ExpensesReport: React.FC = () => {
  const { db, settings } = useApp();
  const cur = settings.operational?.currency ?? 'OMR';
  const [isPrinting, setIsPrinting] = useState(false);
  const [fromDate, setFromDate] = useState(startOfYear(new Date()).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const expenses = useMemo(() => {
    return db.expenses.filter(e => e.status !== 'VOID' && e.dateTime.slice(0, 10) >= fromDate && e.dateTime.slice(0, 10) <= toDate);
  }, [db.expenses, fromDate, toDate]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const reportContent = (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª" value={formatCurrency(totalExpenses, cur)} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-700" />
        <MiniKpi label="Ø¹Ø¯Ø¯ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª" value={String(expenses.length)} icon={<FileText size={18} />} color="bg-gray-100 text-gray-700" />
      </div>
      {byCategory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold mb-3">ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø­Ø³Ø¨ Ø§Ù„ÙØ¦Ø©</h4>
          <div className="space-y-2">{byCategory.map(([cat, amt]) => (
            <div key={cat} className="flex justify-between items-center p-2 bg-background rounded">
              <span className="text-sm">{cat}</span>
              <span className="font-bold text-sm">{formatCurrency(amt, cur)}</span>
            </div>
          ))}</div>
        </div>
      )}
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø±Ù‚Ù…</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ÙØ¦Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø³ØªÙÙŠØ¯</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø¨Ù„Øº</th>
          <th className="px-3 py-2 border border-border">Ù…Ù„Ø§Ø­Ø¸Ø§Øª</th>
        </tr></thead>
        <tbody>{expenses.map(e => (
          <tr key={e.id} className="hover:bg-background">
            <td className="px-3 py-2 border border-border">{e.no}</td>
            <td className="px-3 py-2 border border-border">{formatDate(e.dateTime)}</td>
            <td className="px-3 py-2 border border-border">{e.category}</td>
            <td className="px-3 py-2 border border-border">{e.payee || '-'}</td>
            <td className="px-3 py-2 border border-border font-bold">{formatCurrency(e.amount, cur)}</td>
            <td className="px-3 py-2 border border-border">{e.notes || '-'}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={4} className="px-3 py-2 border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalExpenses, cur)}</td>
          <td className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª" icon={<TrendingDown size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ù…Ù†</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ø¥Ù„Ù‰</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-sm" /></div>
      </ActionBar>
      <ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª" date={`${formatDate(fromDate)} - ${formatDate(toDate)}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª"><ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª" date={`${formatDate(fromDate)} - ${formatDate(toDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

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
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØªØ£Ø®Ø±Ø§Øª" value={formatCurrency(totalOverdue, cur)} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-700" />
        <MiniKpi label="1-30 ÙŠÙˆÙ…" value={count30.toString()} icon={<Users size={18} />} color="bg-yellow-100 text-yellow-700" />
        <MiniKpi label="31-60 ÙŠÙˆÙ…" value={count60.toString()} icon={<Users size={18} />} color="bg-orange-100 text-orange-700" />
        <MiniKpi label="Ø£ÙƒØ«Ø± Ù…Ù† 60 ÙŠÙˆÙ…" value={count90plus.toString()} icon={<Users size={18} />} color="bg-red-100 text-red-700" />
      </div>
      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù‡Ø§ØªÙ</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ÙˆØ­Ø¯Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø¹Ù‚Ø§Ø±</th>
          <th className="px-3 py-2 border border-border">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th>
          <th className="px-3 py-2 border border-border">Ø£ÙŠØ§Ù… Ø§Ù„ØªØ£Ø®ÙŠØ±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø³ØªØ­Ù‚</th>
          <th className="px-3 py-2 border border-border print:hidden">ÙˆØ§ØªØ³Ø§Ø¨</th>
        </tr></thead>
        <tbody>{overdue.map(r => (
          <tr key={r.inv.id} className="hover:bg-background">
            <td className="px-3 py-2 border border-border font-bold">{r.tenant?.name || '-'}</td>
            <td className="px-3 py-2 border border-border" dir="ltr">{r.tenant?.phone || '-'}</td>
            <td className="px-3 py-2 border border-border">{r.unit?.name || '-'}</td>
            <td className="px-3 py-2 border border-border">{r.property?.name || '-'}</td>
            <td className="px-3 py-2 border border-border">{formatDate(r.inv.dueDate)}</td>
            <td className={`px-3 py-2 border border-border ${severityClass(r.daysOverdue)}`}>{r.daysOverdue} ÙŠÙˆÙ…</td>
            <td className="px-3 py-2 border border-border font-bold text-red-600">{formatCurrency(r.remaining, cur)}</td>
            <td className="px-3 py-2 border border-border print:hidden">
              {r.tenant?.phone && (
                <a href={`https://wa.me/${r.tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Ø§Ù„Ø³ÙŠØ¯/Ø© ${r.tenant.name}ØŒ ØªØ°ÙƒÙŠØ± Ø¨Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø³ØªØ­Ù‚ ${formatCurrency(r.remaining, cur)} Ù…Ù†Ø° ${r.daysOverdue} ÙŠÙˆÙ…`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 text-xs underline">ÙˆØ§ØªØ³Ø§Ø¨</a>
              )}
            </td>
          </tr>
        ))}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={6} className="px-3 py-2 border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
          <td className="px-3 py-2 border border-border text-red-600">{formatCurrency(totalOverdue, cur)}</td>
          <td className="border border-border print:hidden"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØªØ£Ø®Ø±ÙŠÙ† Ø¹Ù† Ø§Ù„Ø¯ÙØ¹" icon={<TrendingDown size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ø§Ù„Ø¹Ù‚Ø§Ø±</label>
          <select value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)} className="text-sm">
            <option value="all">Ø§Ù„ÙƒÙ„</option>
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØªØ£Ø®Ø±ÙŠÙ† Ø¹Ù† Ø§Ù„Ø¯ÙØ¹" date={`ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØªØ£Ø®Ø±ÙŠÙ†"><ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…ØªØ£Ø®Ø±ÙŠÙ† Ø¹Ù† Ø§Ù„Ø¯ÙØ¹" date={`ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

const UNIT_TYPE_AR: Record<string, string> = {
  apartment: 'Ø´Ù‚Ø©', shop: 'Ù…Ø­Ù„ ØªØ¬Ø§Ø±ÙŠ', office: 'Ù…ÙƒØªØ¨', studio: 'Ø§Ø³ØªÙˆØ¯ÙŠÙˆ',
  villa: 'ÙÙŠÙ„Ø§', warehouse: 'Ù…Ø³ØªÙˆØ¯Ø¹', other: 'Ø£Ø®Ø±Ù‰',
};
const FLOOR_AR: Record<string, string> = {
  ground: 'Ø§Ù„Ø£Ø±Ø¶ÙŠ', first: 'Ø§Ù„Ø£ÙˆÙ„', second: 'Ø§Ù„Ø«Ø§Ù†ÙŠ', third: 'Ø§Ù„Ø«Ø§Ù„Ø«',
  fourth: 'Ø§Ù„Ø±Ø§Ø¨Ø¹', fifth: 'Ø§Ù„Ø®Ø§Ù…Ø³', roof: 'Ø§Ù„Ø³Ø·Ø­', basement: 'Ø§Ù„Ø¨Ø¯Ø±ÙˆÙ…',
};

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
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ø´Ø§ØºØ±Ø©" value={vacantUnits.length.toString()} icon={<Building2 size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="Ø§Ù„Ø¥ÙŠØ¬Ø§Ø± Ø§Ù„Ù…Ø­ØªÙ…Ù„ Ø§Ù„Ø´Ù‡Ø±ÙŠ" value={formatCurrency(totalPotentialRent, cur)} icon={<Banknote size={18} />} color="bg-green-100 text-green-700" />
        <MiniKpi label="Ø£Ù†ÙˆØ§Ø¹ Ù…Ø®ØªÙ„ÙØ©" value={Object.keys(byType).length.toString()} icon={<Filter size={18} />} color="bg-purple-100 text-purple-700" />
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
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø¹Ù‚Ø§Ø±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ÙˆØ­Ø¯Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù†ÙˆØ¹</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø·Ø§Ø¨Ù‚</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø³Ø§Ø­Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ØºØ±Ù</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø­Ù…Ø§Ù…Ø§Øª</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø¥ÙŠØ¬Ø§Ø± Ø§Ù„Ù…Ù‚ØªØ±Ø­</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø­Ø§Ù„Ø©</th>
        </tr></thead>
        <tbody>{vacantUnits.map(({ unit, property }) => (
          <tr key={unit.id} className="hover:bg-background">
            <td className="px-3 py-2 border border-border">{property?.name || '-'}</td>
            <td className="px-3 py-2 border border-border font-bold">{unit.name}</td>
            <td className="px-3 py-2 border border-border">{UNIT_TYPE_AR[unit.type] || unit.type || '-'}</td>
            <td className="px-3 py-2 border border-border">{unit.floor ? (FLOOR_AR[unit.floor] || unit.floor) : '-'}</td>
            <td className="px-3 py-2 border border-border">{unit.area ? `${unit.area} Ù…Â²` : '-'}</td>
            <td className="px-3 py-2 border border-border">{unit.bedrooms ?? '-'}</td>
            <td className="px-3 py-2 border border-border">{unit.bathrooms ?? '-'}</td>
            <td className="px-3 py-2 border border-border font-bold">{unit.rentDefault ? formatCurrency(unit.rentDefault, cur) : '-'}</td>
            <td className="px-3 py-2 border border-border">
              <span className={`px-2 py-0.5 rounded-full text-xs ${unit.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700' : unit.status === 'ON_HOLD' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                {unit.status === 'MAINTENANCE' ? 'ØµÙŠØ§Ù†Ø©' : unit.status === 'ON_HOLD' ? 'Ù…Ø­Ø¬ÙˆØ²Ø©' : 'Ù…ØªØ§Ø­Ø©'}
              </span>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ø´Ø§ØºØ±Ø©" icon={<Building2 size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ø§Ù„Ø¹Ù‚Ø§Ø±</label>
          <select value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)} className="text-sm">
            <option value="all">Ø§Ù„ÙƒÙ„</option>
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ù†ÙˆØ¹ Ø§Ù„ÙˆØ­Ø¯Ø©</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm">
            <option value="all">Ø§Ù„ÙƒÙ„</option>
            {Object.entries(UNIT_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ø´Ø§ØºØ±Ø©" date={`ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ø´Ø§ØºØ±Ø©"><ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ø´Ø§ØºØ±Ø©" date={`ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

const UTILITY_COLORS_CHART: Record<string, string> = {
  WATER: '#3b82f6', ELECTRICITY: '#f59e0b', GAS: '#f97316', INTERNET: '#8b5cf6', OTHER: '#6b7280',
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
        <MiniKpi label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø±Ø§ÙÙ‚" value={formatCurrency(totalAmount, cur)} icon={<Zap size={18} />} color="bg-blue-100 text-blue-700" />
        <MiniKpi label="Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±ÙŠÙ†" value={formatCurrency(byPaidBy.tenant, cur)} icon={<Users size={18} />} color="bg-green-100 text-green-700" />
        <MiniKpi label="Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù„Ø§Ùƒ" value={formatCurrency(byPaidBy.owner, cur)} icon={<Users size={18} />} color="bg-purple-100 text-purple-700" />
        <MiniKpi label="Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙƒØªØ¨" value={formatCurrency(byPaidBy.office, cur)} icon={<Users size={18} />} color="bg-gray-100 text-gray-700" />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-bold mb-3">ØªÙˆØ²ÙŠØ¹ Ø­Ø³Ø¨ Ù†ÙˆØ¹ Ø§Ù„Ù…Ø±ÙÙ‚</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie><Legend /></RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-3">Ù…Ù„Ø®Øµ Ø­Ø³Ø¨ Ù†ÙˆØ¹ Ø§Ù„Ù…Ø±ÙÙ‚</h4>
            <div className="space-y-2">{(Object.keys(UTILITY_TYPE_AR) as UtilityType[]).filter(t => byType[t]).map(t => (
              <div key={t} className="flex justify-between items-center p-2 bg-background rounded border border-border">
                <span className="text-sm">{UTILITY_ICON[t]} {UTILITY_TYPE_AR[t]}</span>
                <div className="text-left">
                  <span className="font-bold text-sm">{formatCurrency(byType[t].amount, cur)}</span>
                  <span className="text-xs text-text-muted mr-2">({byType[t].count} Ø³Ø¬Ù„)</span>
                </div>
              </div>
            ))}</div>
          </div>
        </div>
      )}

      <table className="w-full text-sm border-collapse border border-border">
        <thead><tr className="bg-background text-xs">
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø´Ù‡Ø±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„ÙˆØ­Ø¯Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø¹Ù‚Ø§Ø±</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø±ÙÙ‚</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ</th>
          <th className="px-3 py-2 border border-border">Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©</th>
          <th className="px-3 py-2 border border-border">Ø§Ù„Ù…Ø¨Ù„Øº</th>
          <th className="px-3 py-2 border border-border">Ø¹Ù„Ù‰ Ø­Ø³Ø§Ø¨</th>
          <th className="px-3 py-2 border border-border">ØµÙˆØ±Ø©</th>
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
              <td className="px-3 py-2 border border-border">{consumption} ÙˆØ­Ø¯Ø©</td>
              <td className="px-3 py-2 border border-border">{formatCurrency(r.unitPrice, cur)}</td>
              <td className="px-3 py-2 border border-border font-bold">{formatCurrency(r.amount, cur)}</td>
              <td className="px-3 py-2 border border-border">{r.paidBy === 'TENANT' ? 'Ù…Ø³ØªØ£Ø¬Ø±' : r.paidBy === 'OWNER' ? 'Ù…Ø§Ù„Ùƒ' : 'Ù…ÙƒØªØ¨'}</td>
              <td className="px-3 py-2 border border-border text-center">
                {r.billImageUrl ? <a href={r.billImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs underline">Ø¹Ø±Ø¶</a> : '-'}
              </td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr className="bg-background font-bold">
          <td colSpan={6} className="px-3 py-2 border border-border">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
          <td className="px-3 py-2 border border-border">{formatCurrency(totalAmount, cur)}</td>
          <td colSpan={2} className="px-3 py-2 border border-border"></td>
        </tr></tfoot>
      </table>
    </div>
  );

  return (
    <Card className="p-6">
      <SectionHeader title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ø±Ø§ÙÙ‚ ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª" icon={<Zap size={20} />} />
      <ActionBar onPrint={() => setIsPrinting(true)}>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ù…Ù† Ø´Ù‡Ø±</label><input type="month" value={fromMonth} onChange={e => setFromMonth(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ø¥Ù„Ù‰ Ø´Ù‡Ø±</label><input type="month" value={toMonth} onChange={e => setToMonth(e.target.value)} className="text-sm" /></div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ù†ÙˆØ¹ Ø§Ù„Ù…Ø±ÙÙ‚</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="text-sm">
            <option value="ALL">Ø§Ù„ÙƒÙ„</option>
            {(Object.keys(UTILITY_TYPE_AR) as UtilityType[]).map(t => <option key={t} value={t}>{UTILITY_ICON[t]} {UTILITY_TYPE_AR[t]}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-text-muted mb-1">Ø§Ù„Ø¹Ù‚Ø§Ø±</label>
          <select value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)} className="text-sm">
            <option value="all">Ø§Ù„ÙƒÙ„</option>
            {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </ActionBar>
      <ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ø±Ø§ÙÙ‚ ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª" date={`${fromMonth} - ${toMonth}`}>{reportContent}</ReportPrintableContent>
      {isPrinting && <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ø±Ø§ÙÙ‚"><ReportPrintableContent title="ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ø±Ø§ÙÙ‚ ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª" date={`${fromMonth} - ${toMonth}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>}
    </Card>
  );
};

export default Reports;

