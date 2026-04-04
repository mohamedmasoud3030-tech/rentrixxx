import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  Home,
  Percent,
  CalendarClock,
  AlertTriangle,
  CircleDollarSign,
  Loader2,
  PlayCircle,
  FilePlus2,
} from 'lucide-react';
import { Receipt as ReceiptType, Expense } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, isWithinInterval, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getExpiringContracts } from '../services/contractMonitoringService';

const QUICK_ACTION_LAST_RUN_KEYS = {
  invoices: 'dashboard:lastRun:generateMonthlyInvoices',
  automation: 'dashboard:lastRun:runManualAutomation',
} as const;

const formatLastRun = (value: number | null): string => {
  if (!value) return 'لم يتم التشغيل بعد';
  return new Date(value).toLocaleString('ar-OM');
};

const QuickSearch = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { db } = useApp();

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const lower = query.toLowerCase();
    return db.contracts
      .map((c) => ({
        ...c,
        tenantName: db.tenants.find((t) => t.id === c.tenantId)?.name || '',
        unitName: db.units.find((u) => u.id === c.unitId)?.name || '',
      }))
      .filter((c) => c.tenantName.toLowerCase().includes(lower) || c.unitName.toLowerCase().includes(lower))
      .slice(0, 5);
  }, [query, db]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
      <input
        type="text"
        placeholder="🔍 ابحث عن مستأجر أو وحدة..."
        className="w-full px-4 py-3 pr-12 rounded-full border-2 border-border/50"
        onChange={(e) => setQuery(e.target.value)}
        value={query}
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/contracts?contractId=${r.id}`)}
              className="w-full p-3 hover:bg-background text-sm text-right"
            >
              {r.unitName} — {r.tenantName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { db, settings, contractBalances, financeService, runManualAutomation } = useApp();
  const navigate = useNavigate();

  const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [lastInvoiceRunAt, setLastInvoiceRunAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(QUICK_ACTION_LAST_RUN_KEYS.invoices);
    return raw ? Number(raw) : null;
  });
  const [lastAutomationRunAt, setLastAutomationRunAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(QUICK_ACTION_LAST_RUN_KEYS.automation);
    return raw ? Number(raw) : null;
  });

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const totalProperties = db.properties.length;
    const totalUnits = db.units.length;
    const vacantUnits = db.units.filter((u) => u.status === 'AVAILABLE').length;
    const rentedUnits = Math.max(totalUnits - vacantUnits, 0);
    const occupancyRate = totalUnits > 0 ? (rentedUnits / totalUnits) * 100 : 0;

    const monthReceipts = db.receipts.filter((r) => r.status === 'POSTED' && r.dateTime?.startsWith(currentMonth));
    const collectedThisMonth = monthReceipts.reduce((sum, r) => sum + r.amount, 0);

    const overdueInvoices = db.invoices.filter(
      (inv) =>
        (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date())) &&
        inv.type === 'RENT',
    );

    const overdueAmountFromInvoices = overdueInvoices.reduce((sum, inv) => {
      const totalInvoice = (inv.amount || 0) + (inv.taxAmount || 0);
      return sum + Math.max(0, totalInvoice - (inv.paidAmount || 0));
    }, 0);

    const arrearsFromContractBalances = Object.values(contractBalances).reduce(
      (sum, balanceRow) => sum + (balanceRow.balance > 0 ? balanceRow.balance : 0),
      0,
    );

    const snapshotArrears = db.kpiSnapshots?.[0]?.totalContractARBalance ?? 0;
    const totalArrears = snapshotArrears > 0 ? snapshotArrears : arrearsFromContractBalances || overdueAmountFromInvoices;

    const expiringIn30Days = getExpiringContracts(db.contracts, new Date(), 30);
    const expiringInConfiguredWindow = getExpiringContracts(
      db.contracts,
      new Date(),
      settings.operational?.contractAlertDays ?? 30,
    );

    return {
      totalProperties,
      rentedUnits,
      vacantUnits,
      occupancyRate,
      collectedThisMonth,
      totalArrears,
      expiringSoonCount: expiringInConfiguredWindow.length,
      expiringIn30DaysCount: expiringIn30Days.length,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueAmountFromInvoices,
    };
  }, [db, settings.operational?.contractAlertDays, contractBalances]);

  const runGenerateMonthlyInvoices = async () => {
    setIsGeneratingInvoices(true);
    try {
      await financeService.generateMonthlyInvoices();
      const now = Date.now();
      setLastInvoiceRunAt(now);
      localStorage.setItem(QUICK_ACTION_LAST_RUN_KEYS.invoices, String(now));
    } finally {
      setIsGeneratingInvoices(false);
    }
  };

  const runAutomation = async () => {
    setIsRunningAutomation(true);
    try {
      await runManualAutomation();
      const now = Date.now();
      setLastAutomationRunAt(now);
      localStorage.setItem(QUICK_ACTION_LAST_RUN_KEYS.automation, String(now));
    } finally {
      setIsRunningAutomation(false);
    }
  };

  const alertCards = [
    {
      key: 'contracts-expiring',
      title: 'عقود تنتهي خلال 30 يوم',
      detail: `${stats.expiringIn30DaysCount} عقد`,
      path: '/contracts',
      icon: <CalendarClock size={18} className="text-amber-600" />,
    },
    {
      key: 'invoices-overdue',
      title: 'فواتير متأخرة',
      detail: `${stats.overdueCount} فاتورة — ${formatCurrency(stats.overdueAmount, 'OMR')}`,
      path: '/financial/invoices',
      icon: <AlertTriangle size={18} className="text-rose-600" />,
    },
  ];

  return (
    <div className="space-y-6 bg-background min-h-full">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black">لوحة التحكم</h1>
          <p className="text-text-muted">{settings.general.company.name}</p>
        </div>
      </header>

      <QuickSearch />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard
          title="إجمالي العقارات"
          value={String(stats.totalProperties)}
          icon={<Building2 size={18} />}
          variant="error"
        />
        <KpiCard title="الوحدات المؤجرة" value={String(stats.rentedUnits)} icon={<Home size={18} />} variant="neutral" />
        <KpiCard title="الوحدات الشاغرة" value={String(stats.vacantUnits)} icon={<Home size={18} />} variant="neutral" />
        <KpiCard
          title="نسبة الإشغال"
          value={`${stats.occupancyRate.toFixed(1)}%`}
          icon={<Percent size={18} />}
          variant="neutral"
        />
        <KpiCard
          title="الإيجارات المحصلة (الشهر الحالي)"
          value={formatCurrency(stats.collectedThisMonth, 'OMR')}
          icon={<CircleDollarSign size={18} />}
          variant="money"
        />
        <KpiCard
          title="المتأخرات"
          value={formatCurrency(stats.totalArrears, 'OMR')}
          icon={<AlertTriangle size={18} />}
          variant="money"
        />
        <KpiCard
          title="العقود المنتهية قريباً"
          value={String(stats.expiringSoonCount)}
          icon={<CalendarClock size={18} />}
          variant="neutral"
        />
      </div>

      <section className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/40">
        <h3 className="font-bold mb-3">إجراءات سريعة</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={runGenerateMonthlyInvoices}
            disabled={isGeneratingInvoices}
            className="text-right p-4 rounded-xl rx-gradient-btn font-bold active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold">توليد فواتير الشهر</div>
              {isGeneratingInvoices ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
            </div>
            <div className="text-xs text-primary-fg/80 mt-1">آخر تشغيل: {formatLastRun(lastInvoiceRunAt)}</div>
          </button>

          <button
            onClick={runAutomation}
            disabled={isRunningAutomation}
            className="text-right p-4 rounded-xl rx-gradient-btn font-bold active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold">تشغيل الأتمتة</div>
              {isRunningAutomation ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            </div>
            <div className="text-xs text-primary-fg/80 mt-1">آخر تشغيل: {formatLastRun(lastAutomationRunAt)}</div>
          </button>
        </div>
      </section>

      <section className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/40">
        <h3 className="font-bold mb-3">التنبيهات</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {alertCards.map((alert) => (
            <button
              key={alert.key}
              onClick={() => navigate(alert.path)}
              className="text-right p-4 rounded-xl bg-error/10 border border-error/20 hover:bg-error/15"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold">{alert.title}</div>
                {alert.icon}
              </div>
              <div className="text-xs text-on-primary/80 mt-1">{alert.detail}</div>
            </button>
          ))}
        </div>
      </section>

      <DashboardRevenueChart receipts={db.receipts} expenses={db.expenses} />
    </div>
  );
};

const DashboardRevenueChart: React.FC<{ receipts: ReceiptType[]; expenses: Expense[] }> = ({ receipts, expenses }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) });

    return months.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const label = format(monthStart, 'MMM', { locale: ar });
      const revenue = receipts
        .filter((r) => r.status === 'POSTED' && r.dateTime && isWithinInterval(new Date(r.dateTime), { start: monthStart, end: monthEnd }))
        .reduce((sum, r) => sum + r.amount, 0);
      const monthlyExpenses = expenses
        .filter((e) => e.status === 'POSTED' && e.dateTime && isWithinInterval(new Date(e.dateTime), { start: monthStart, end: monthEnd }))
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: label, revenue, expenses: monthlyExpenses };
    });
  }, [receipts, expenses]);

  return (
    <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/40">
      <div className="h-52" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rx-border)" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={11} tickFormatter={(v) => (v > 0 ? `${(v / 1000).toFixed(0)}k` : '0')} />
            <Tooltip formatter={(value: number) => formatCurrency(value, 'OMR')} />
            <Area type="monotone" dataKey="revenue" stroke="var(--rx-success)" fill="color-mix(in srgb, var(--rx-success) 22%, transparent)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" stroke="var(--rx-error)" fill="color-mix(in srgb, var(--rx-error) 22%, transparent)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  variant: 'money' | 'neutral' | 'secondary' | 'tertiary' | 'error';
}> = ({ title, value, icon, variant }) => (
  <div className={`bg-surface-container-low p-5 rounded-xl border border-outline-variant/40 text-right border-r-4 ${variant === 'neutral' ? 'border-primary' : variant === 'secondary' ? 'border-secondary' : variant === 'tertiary' ? 'border-tertiary' : variant === 'error' ? 'border-error' : 'border-primary'}`}>
    <div className="flex items-center justify-between">
      <p className="text-xs text-text-muted">{title}</p>
      <div className={variant === 'money' ? 'text-emerald-600' : 'text-primary'}>{icon}</div>
    </div>
    <p className="text-2xl font-bold mt-2 mono-data" dir="ltr">
      {value}
    </p>
  </div>
);

export default Dashboard;
