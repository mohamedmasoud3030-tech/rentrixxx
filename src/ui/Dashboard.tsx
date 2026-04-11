import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Users, FileText, Banknote, TrendingUp, TrendingDown, AlertTriangle, Wrench, Home, Percent, DollarSign, CalendarClock } from 'lucide-react';
import { Contract, Receipt as ReceiptType, Expense, Invoice } from '@/types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, isWithinInterval, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getArrearsAmount, getArrearsInvoices, getCashInflow, getExpenseImpact, getRevenueFromPaidInvoices } from '@/services/financialFlowService';

const QuickSearch = () => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const { db } = useApp();

    const results = useMemo(() => {
        if (query.length < 2) return [];
        const lower = query.toLowerCase();
        return db.contracts
            .map(c => ({ ...c, tenantName: db.tenants.find(t => t.id === c.tenantId)?.name || '', unitName: db.units.find(u => u.id === c.unitId)?.name || '' }))
            .filter(c => c.tenantName.toLowerCase().includes(lower) || c.unitName.toLowerCase().includes(lower))
            .slice(0, 5);
    }, [query, db]);

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
            <input type="text" placeholder="🔍 ابحث عن مستأجر أو وحدة..." className="w-full px-4 py-3 pr-12 rounded-full border-2 border-border/50" onChange={e => setQuery(e.target.value)} value={query} />
            {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10">
                    {results.map(r => <button key={r.id} onClick={() => navigate(`/contracts?contractId=${r.id}`)} className="w-full p-3 hover:bg-background text-sm text-right">{r.unitName} — {r.tenantName}</button>)}
                </div>
            )}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { db, settings, contractBalances, ownerBalances } = useApp();
    const navigate = useNavigate();
    const currency = settings.operational?.currency ?? 'OMR';

    const stats = useMemo(() => {
        const now = Date.now();
        const alertDays = settings.operational?.contractAlertDays ?? 30;
        const currentMonth = new Date().toISOString().slice(0, 7);

        const activeContracts = db.contracts.filter((c: Contract) => c.status === 'ACTIVE');
        const totalUnits = db.units.length;
        // unit.status is auto-synced by DB trigger — do not set manually
        const vacantUnits = db.units.filter(u => u.status === 'AVAILABLE').length;
        const occupancyRate = totalUnits > 0 ? ((totalUnits - vacantUnits) / totalUnits) * 100 : 0;

        const monthReceipts = db.receipts.filter(r => r.status === 'POSTED' && r.dateTime?.startsWith(currentMonth));
        const monthExpenses = db.expenses.filter(e => e.status === 'POSTED' && e.dateTime?.startsWith(currentMonth));
        const monthInvoices = db.invoices.filter((inv: Invoice) => inv.dueDate?.startsWith(currentMonth));
        const monthlyRevenue = getRevenueFromPaidInvoices(monthInvoices);
        const monthlyExpenses = getExpenseImpact(monthExpenses);

        const officeShareTotal = Object.values(ownerBalances).reduce((s, b) => s + (b.officeShare || 0), 0);
        const officeExpensesTotal = getExpenseImpact(db.expenses.filter(e => !e.contractId));
        const treasuryBalance = officeShareTotal - officeExpensesTotal;

        const overdueInvoices = getArrearsInvoices(db.invoices.filter(inv => inv.type === 'RENT'));
        const overdueAmount = getArrearsAmount(overdueInvoices);

        const expiringContracts = activeContracts.filter(c => {
            const diff = new Date(c.end).getTime() - now;
            return diff > 0 && diff < alertDays * 86400000;
        });
        const pendingMaintenance = db.maintenanceRecords.filter(m => m.status === 'NEW' || m.status === 'IN_PROGRESS');

        const totalCreditBalances = Object.values(contractBalances).reduce((sum, b) => sum + (b.balance < 0 ? Math.abs(b.balance) : 0), 0);

        return {
            totalProperties: db.properties.length,
            totalUnits,
            vacantUnits,
            occupancyRate,
            activeContracts: activeContracts.length,
            monthlyRevenue,
            monthlyExpenses,
            netMonthly: monthlyRevenue - monthlyExpenses,
            treasuryBalance,
            overdueCount: overdueInvoices.length,
            overdueAmount,
            expiringContracts,
            pendingMaintenance: pendingMaintenance.length,
            totalCreditBalances,
            activeTenants: db.tenants.filter(t => t.status === 'ACTIVE').length,
        };
    }, [db, settings, ownerBalances, contractBalances]);

    const alerts = [
        { key: 'contracts', title: 'عقود تنتهي قريباً', detail: `${stats.expiringContracts.length} عقد`, path: '/contracts' },
        { key: 'invoices', title: 'فواتير متأخرة', detail: `${stats.overdueCount} فاتورة`, path: '/financial/invoices' },
        { key: 'maintenance', title: 'صيانة معلقة', detail: `${stats.pendingMaintenance} طلب`, path: '/properties' },
    ];

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black">لوحة التحكم</h1>
                    <p className="text-text-muted">{settings.general.company.name}</p>
                </div>
            </header>

            <QuickSearch />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiMini label="العقارات" value={stats.totalProperties} icon={<Building2 size={18} />} color="blue" />
                <KpiMini label="الوحدات" value={stats.totalUnits} icon={<Home size={18} />} color="indigo" />
                <KpiMini label="الشاغرة" value={stats.vacantUnits} icon={<Home size={18} />} color="amber" />
                <KpiMini label="العقود النشطة" value={stats.activeContracts} icon={<FileText size={18} />} color="green" />
                <KpiMini label="المستأجرون" value={stats.activeTenants} icon={<Users size={18} />} color="violet" />
                <KpiMini label="الإشغال" value={`${stats.occupancyRate.toFixed(0)}%`} icon={<Percent size={18} />} color="green" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <KpiCard title="إيرادات الشهر" value={formatCurrency(stats.monthlyRevenue, currency)} icon={<TrendingUp size={22} />} gradient="from-emerald-600 to-emerald-400" />
                <KpiCard title="مصروفات الشهر" value={formatCurrency(stats.monthlyExpenses, currency)} icon={<TrendingDown size={22} />} gradient="from-rose-600 to-rose-400" />
                <KpiCard title="صافي الشهر" value={formatCurrency(stats.netMonthly, currency)} icon={<DollarSign size={22} />} gradient="from-blue-600 to-blue-400" />
                <KpiCard title="رصيد الخزنة" value={formatCurrency(stats.treasuryBalance, currency)} icon={<Banknote size={22} />} gradient="from-amber-600 to-yellow-400" />
                <KpiCard title="أرصدة دائنة" value={formatCurrency(stats.totalCreditBalances, currency)} icon={<AlertTriangle size={22} />} gradient="from-violet-600 to-fuchsia-400" />
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border">
                <h3 className="font-bold mb-3">تنبيهات اليوم</h3>
                <div className="grid md:grid-cols-3 gap-3">
                    {alerts.map(a => (
                        <button key={a.key} onClick={() => navigate(a.path)} className="text-right p-3 rounded-xl border border-border hover:bg-background">
                            <div className="font-bold">{a.title}</div>
                            <div className="text-sm text-text-muted">{a.detail}</div>
                        </button>
                    ))}
                </div>
            </div>

            <DashboardRevenueChart receipts={db.receipts} expenses={db.expenses} currency={currency} />
        </div>
    );
};

const DashboardRevenueChart: React.FC<{ receipts: ReceiptType[]; expenses: Expense[]; currency: string }> = ({ receipts, expenses, currency }) => {
    const chartData = useMemo(() => {
        const now = new Date();
        const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) });
        return months.map(monthStart => {
            const monthEnd = endOfMonth(monthStart);
            const label = format(monthStart, 'MMM', { locale: ar });
            const revenue = getCashInflow(receipts.filter(r => r.dateTime && isWithinInterval(new Date(r.dateTime), { start: monthStart, end: monthEnd })));
            const exp = getExpenseImpact(expenses.filter(e => e.dateTime && isWithinInterval(new Date(e.dateTime), { start: monthStart, end: monthEnd })));
            return { name: label, revenue, expenses: exp };
        });
    }, [receipts, expenses]);

    return (
        <div className="bg-card p-5 rounded-2xl border border-border">
            <div className="h-52" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={11} tickFormatter={v => (v > 0 ? `${(v / 1000).toFixed(0)}k` : '0')} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, currency as 'OMR' | 'SAR' | 'EGP')} />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
                        <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef444433" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const KpiMini: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
    <div className="bg-card p-4 rounded-lg border border-border text-center">
        <div className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 bg-background">{icon}</div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
);

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode; gradient: string }> = ({ title, value, icon, gradient }) => (
    <div className={`bg-gradient-to-br ${gradient} p-5 rounded-2xl text-white`}>
        <div className="flex justify-between items-start"><p className="opacity-80 text-sm">{title}</p><div className="opacity-60">{icon}</div></div>
        <h2 className="text-2xl font-bold mt-3" dir="ltr">{value}</h2>
    </div>
);

export default Dashboard;
