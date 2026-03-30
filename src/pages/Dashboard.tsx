import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { tafneeta } from '../utils/numberToArabic';
import { formatCurrency, formatDate, formatDateTime, CONTRACT_STATUS_AR, INVOICE_STATUS_AR } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import {
  Search, Building2, Users, FileText, Banknote,
  TrendingUp, TrendingDown, AlertTriangle, Wrench,
  Receipt, ArrowLeft, CheckCircle2, Clock, XCircle,
  Home, Percent, DollarSign, CalendarClock, Activity,
  Plus, FileInput, Calculator, Github, Mail, Globe
} from 'lucide-react';
import { Contract, Tenant, Unit, Receipt as ReceiptType, Invoice, Expense, MaintenanceRecord } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, isWithinInterval, format } from 'date-fns';
import { ar } from 'date-fns/locale';

const QuickSearch = () => {
    const [query, setQuery] = useState("");
    const navigate = useNavigate();
    const { db } = useApp();

    const contracts = db.contracts || [];
    const tenants = db.tenants || [];
    const units = db.units || [];

    const results = useMemo(() => {
        if (query.length < 2) return [];
        const lowerQuery = query.toLowerCase();

        const searchableContracts = contracts.map(c => {
            const tenant = tenants.find(t => t.id === c.tenantId);
            const unit = units.find(u => u.id === c.unitId);
            return {
                ...c,
                tenantName: tenant?.name || '',
                unitName: unit?.name || ''
            };
        });

        return searchableContracts.filter(c =>
            c.tenantName.toLowerCase().includes(lowerQuery) ||
            c.unitName.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);
    }, [query, contracts, tenants, units]);

    const handleSelect = (contractId: string) => {
        setQuery("");
        navigate(`/contracts?contractId=${contractId}`);
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted pointer-events-none" />
                <input
                    type="text"
                    placeholder="🔍 ابحث عن مستأجر أو وحدة..."
                    className="w-full px-4 py-3 pr-12 text-base rounded-full border-2 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm hover:border-border"
                    onChange={(e) => setQuery(e.target.value)}
                    value={query}
                />
            </div>
            {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden max-h-60 overflow-y-auto">
                    {results.map(r => (
                        <button
                            key={r.id}
                            onClick={() => handleSelect(r.id)}
                            className="w-full p-3 hover:bg-background cursor-pointer border-b border-border last:border-b-0 flex justify-between items-center text-sm transition-colors"
                        >
                            <span className="font-medium flex items-center gap-2">
                                <Home size={14} />
                                {r.unitName}
                            </span>
                            <span className="text-text-muted text-xs">{r.tenantName}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const Dashboard: React.FC = () => {
    const { db, settings, contractBalances, ownerBalances } = useApp();
    const navigate = useNavigate();
    const currency = (settings.operational?.currency ?? 'OMR') as 'OMR' | 'SAR' | 'EGP';

    const contracts = db.contracts || [];
    const receipts = db.receipts || [];
    const expenses = db.expenses || [];
    const units = db.units || [];
    const properties = db.properties || [];
    const tenants = db.tenants || [];
    const invoices = db.invoices || [];
    const maintenanceRecords = db.maintenanceRecords || [];

    const stats = useMemo(() => {
        const now = Date.now();
        const alertDays = settings.operational?.contractAlertDays ?? 30;
        const currentMonth = new Date().toISOString().slice(0, 7);

        const activeContracts = contracts.filter((c: Contract) => c.status === 'ACTIVE');
        const totalUnits = units.length;
        const vacantUnits = units.filter(u => u.status === 'AVAILABLE').length;
        const occupancyRate = totalUnits > 0 ? ((totalUnits - vacantUnits) / totalUnits) * 100 : 0;

        const monthReceipts = receipts.filter(r => r.status === 'POSTED' && r.dateTime?.startsWith(currentMonth));
        const monthExpenses = expenses.filter(e => e.status === 'POSTED' && e.dateTime?.startsWith(currentMonth));
        const monthlyRevenue = monthReceipts.reduce((s, r) => s + r.amount, 0);
        const monthlyExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

        const totalCollected = receipts.filter(r => r.status === 'POSTED').reduce((s, r) => s + r.amount, 0);
        const officeExpenses = expenses.filter(e => e.status === 'POSTED' && (e.chargedTo === 'OFFICE' || !e.contractId)).reduce((s, e) => s + e.amount, 0);

        const overdueInvoices = invoices.filter(inv =>
            (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date())) &&
            inv.type === 'RENT'
        );
        const overdueAmount = overdueInvoices.reduce((s, inv) => s + (inv.amount - inv.paidAmount), 0);

        const expiringContracts = activeContracts.filter(c => {
            const diff = new Date(c.end).getTime() - now;
            return diff > 0 && diff < (alertDays * 24 * 60 * 60 * 1000);
        });

        const pendingMaintenance = maintenanceRecords.filter(m => m.status === 'NEW' || m.status === 'IN_PROGRESS');

        const totalReceivables = Object.values(contractBalances).reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);
        const totalOwnerPayables = Object.values(ownerBalances).reduce((sum, b) => sum + (b.net > 0 ? b.net : 0), 0);

        return {
            totalProperties: properties.length,
            totalUnits,
            vacantUnits,
            occupancyRate,
            activeContracts: activeContracts.length,
            monthlyRevenue,
            monthlyExpenses,
            netMonthly: monthlyRevenue - monthlyExpenses,
            totalCollected,
            treasuryBalance: totalCollected - officeExpenses,
            overdueCount: overdueInvoices.length,
            overdueAmount,
            expiringContracts,
            pendingMaintenance: pendingMaintenance.length,
            totalReceivables,
            totalOwnerPayables,
            activeTenants: tenants.filter(t => t.status === 'ACTIVE').length,
        };
    }, [contracts, receipts, expenses, units, properties, tenants, invoices, maintenanceRecords, settings, contractBalances, ownerBalances]);

    const latestReceiptsData = useMemo(() => {
        const sorted = [...receipts].sort((a, b) => (b.dateTime || '').localeCompare(a.dateTime || '')).slice(0, 5);
        return sorted.map((r: ReceiptType) => {
            const contract = contracts.find(c => c.id === r.contractId);
            const tenant = contract ? tenants.find(t => t.id === contract.tenantId) : null;
            return { ...r, tenantName: tenant?.name || 'غير معروف' };
        });
    }, [receipts, contracts, tenants]);

    const expiringContractsList = useMemo(() => {
        return stats.expiringContracts.map(c => {
            const tenant = tenants.find(t => t.id === c.tenantId);
            const unit = units.find(u => u.id === c.unitId);
            const daysLeft = Math.ceil((new Date(c.end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return { ...c, tenantName: tenant?.name || '-', unitName: unit?.name || '-', daysLeft };
        }).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
    }, [stats.expiringContracts, tenants, units]);

    const overdueInvoicesList = useMemo(() => {
        return invoices
            .filter(inv => (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date())) && inv.type === 'RENT')
            .map(inv => {
                const contract = contracts.find(c => c.id === inv.contractId);
                const tenant = contract ? tenants.find(t => t.id === contract.tenantId) : null;
                const daysOverdue = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                return { ...inv, tenantName: tenant?.name || '-', daysOverdue, remaining: inv.amount - inv.paidAmount };
            })
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
            .slice(0, 5);
    }, [invoices, contracts, tenants]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">لوحة التحكم</h1>
                    <p className="text-text-muted text-sm md:text-base">مرحباً بك في <span className="font-bold text-text">{settings?.general?.company?.name ?? 'Rentrix'}</span></p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        متصل
                    </div>
                    <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {new Date().toLocaleDateString('ar-SA')}
                    </div>
                </div>
            </header>

            {/* Quick Search */}
            <QuickSearch />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiMini label="العقارات" value={stats.totalProperties} icon={<Building2 size={18} />} color="blue" onClick={() => navigate('/properties')} />
                <KpiMini label="الوحدات" value={stats.totalUnits} icon={<Home size={18} />} color="indigo" />
                <KpiMini label="الشاغرة" value={stats.vacantUnits} icon={<Home size={18} />} color={stats.vacantUnits > 0 ? "amber" : "green"} />
                <KpiMini label="العقود النشطة" value={stats.activeContracts} icon={<FileText size={18} />} color="green" onClick={() => navigate('/contracts')} />
                <KpiMini label="المستأجرون" value={stats.activeTenants} icon={<Users size={18} />} color="violet" onClick={() => navigate('/tenants')} />
                <KpiMini label="الإشغال" value={`${stats.occupancyRate.toFixed(0)}%`} icon={<Percent size={18} />} color={stats.occupancyRate >= 80 ? "green" : stats.occupancyRate >= 50 ? "amber" : "red"} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KpiCard
                    title="إيرادات الشهر"
                    value={formatCurrency(stats.monthlyRevenue, currency)}
                    icon={<TrendingUp size={22} />}
                    gradient="from-emerald-600 to-emerald-400"
                    shadowColor="shadow-emerald-500/20"
                    trend={stats.monthlyRevenue > 0 ? "↑" : ""}
                />
                <KpiCard
                    title="مصروفات الشهر"
                    value={formatCurrency(stats.monthlyExpenses, currency)}
                    icon={<TrendingDown size={22} />}
                    gradient="from-rose-600 to-rose-400"
                    shadowColor="shadow-rose-500/20"
                />
                <KpiCard
                    title="صافي الشهر"
                    value={formatCurrency(stats.netMonthly, currency)}
                    icon={<DollarSign size={22} />}
                    gradient={stats.netMonthly >= 0 ? "from-blue-600 to-blue-400" : "from-red-600 to-red-400"}
                    shadowColor={stats.netMonthly >= 0 ? "shadow-blue-500/20" : "shadow-red-500/20"}
                    trend={stats.netMonthly >= 0 ? "↑" : "↓"}
                />
                <KpiCard
                    title="رصيد الخزنة"
                    value={formatCurrency(stats.treasuryBalance, currency)}
                    icon={<Banknote size={22} />}
                    gradient="from-amber-600 to-yellow-400"
                    shadowColor="shadow-yellow-500/20"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AlertCard
                    title="فواتير متأخرة"
                    count={stats.overdueCount}
                    detail={stats.overdueCount > 0 ? `بمبلغ ${formatCurrency(stats.overdueAmount, currency)}` : 'لا توجد فواتير متأخرة'}
                    icon={<AlertTriangle size={20} />}
                    color="red"
                    onClick={() => navigate('/finance/invoices')}
                />
                <AlertCard
                    title="عقود تنتهي قريباً"
                    count={stats.expiringContracts.length}
                    detail={stats.expiringContracts.length > 0 ? `خلال ${settings.operational?.contractAlertDays ?? 30} يوم` : 'لا توجد عقود تنتهي قريباً'}
                    icon={<CalendarClock size={20} />}
                    color="amber"
                    onClick={() => navigate('/contracts')}
                />
                <AlertCard
                    title="طلبات صيانة"
                    count={stats.pendingMaintenance}
                    detail={stats.pendingMaintenance > 0 ? 'طلبات معلقة أو قيد التنفيذ' : 'لا توجد طلبات صيانة معلقة'}
                    icon={<Wrench size={20} />}
                    color="blue"
                    onClick={() => navigate('/properties')}
                />
            </div>

            <DashboardRevenueChart receipts={receipts} expenses={expenses} currency={currency} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-text text-lg">الذمم المدينة والمستحقات</h3>
                        <button onClick={() => navigate('/reports?tab=aged_receivables')} className="text-primary text-xs font-bold hover:underline">تفاصيل</button>
                    </div>
                    <div className="space-y-3">
                        <BalanceRow label="ذمم المستأجرين المستحقة" value={formatCurrency(stats.totalReceivables, currency)} color="text-red-500" />
                        <BalanceRow label="مستحقات الملاك (للتوريد)" value={formatCurrency(stats.totalOwnerPayables, currency)} color="text-amber-600" />
                        <BalanceRow label="إجمالي التحصيل الكلي" value={formatCurrency(stats.totalCollected, currency)} color="text-emerald-600" />
                    </div>
                </div>

                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-text text-lg mb-4">إجراءات سريعة</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <QuickAction label="سند قبض جديد" icon={<Plus size={16} />} onClick={() => navigate('/finance/receipts')} />
                        <QuickAction label="عقد جديد" icon={<FileText size={16} />} onClick={() => navigate('/contracts')} />
                        <QuickAction label="توليد الفواتير" icon={<Calculator size={16} />} onClick={() => navigate('/finance/invoices')} />
                        <QuickAction label="التقارير المالية" icon={<Activity size={16} />} onClick={() => navigate('/reports')} />
                    </div>
                </div>
            </div>

            {expiringContractsList.length > 0 && (
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-text flex items-center gap-2">
                            <CalendarClock size={18} className="text-amber-500" />
                            عقود تنتهي قريباً
                        </h3>
                        <button onClick={() => navigate('/contracts')} className="text-primary text-xs font-bold hover:underline flex items-center gap-1">عرض الكل <ArrowLeft size={12} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="border-b-2 border-border text-text-muted text-xs">
                                    <th className="py-2 font-semibold">الوحدة</th>
                                    <th className="py-2 font-semibold">المستأجر</th>
                                    <th className="py-2 font-semibold">تاريخ الانتهاء</th>
                                    <th className="py-2 font-semibold">المتبقي</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expiringContractsList.map(c => (
                                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-background/50 cursor-pointer" onClick={() => navigate(`/contracts?contractId=${c.id}`)}>
                                        <td className="py-2.5 font-medium">{c.unitName}</td>
                                        <td className="py-2.5">{c.tenantName}</td>
                                        <td className="py-2.5">{formatDate(c.end)}</td>
                                        <td className="py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.daysLeft <= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'}`}>
                                                {c.daysLeft} يوم
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {overdueInvoicesList.length > 0 && (
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-text flex items-center gap-2">
                            <AlertTriangle size={18} className="text-red-500" />
                            فواتير متأخرة
                        </h3>
                        <button onClick={() => navigate('/finance/invoices')} className="text-primary text-xs font-bold hover:underline flex items-center gap-1">عرض الكل <ArrowLeft size={12} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="border-b-2 border-border text-text-muted text-xs">
                                    <th className="py-2 font-semibold">رقم الفاتورة</th>
                                    <th className="py-2 font-semibold">المستأجر</th>
                                    <th className="py-2 font-semibold">المبلغ المتبقي</th>
                                    <th className="py-2 font-semibold">أيام التأخير</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overdueInvoicesList.map(inv => (
                                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-background/50 cursor-pointer" onClick={() => navigate(`/finance/invoices?invoiceId=${inv.id}`)}>
                                        <td className="py-2.5 font-mono">{inv.no}</td>
                                        <td className="py-2.5">{inv.tenantName}</td>
                                        <td className="py-2.5 font-bold text-red-500" dir="ltr">{formatCurrency(inv.remaining, currency)}</td>
                                        <td className="py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${inv.daysOverdue > 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : inv.daysOverdue > 30 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                                {inv.daysOverdue} يوم
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-text flex items-center gap-2">
                        <Receipt size={18} className="text-primary" />
                        آخر سندات القبض
                    </h3>
                    <button onClick={() => navigate('/finance/receipts')} className="text-primary text-xs font-bold hover:underline flex items-center gap-1">عرض الكل <ArrowLeft size={12} /></button>
                </div>
                {latestReceiptsData.length > 0 ? (
                    <table className="w-full text-sm text-right">
                        <thead>
                            <tr className="border-b-2 border-border text-text-muted text-xs">
                                <th className="py-2 font-semibold">رقم السند</th>
                                <th className="py-2 font-semibold">المستأجر</th>
                                <th className="py-2 font-semibold">التاريخ</th>
                                <th className="py-2 font-semibold">المبلغ</th>
                                <th className="py-2 font-semibold">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {latestReceiptsData.map((r) => (
                                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-background/50 cursor-pointer" onClick={() => navigate(`/finance/receipts`)}>
                                    <td className="py-2.5 font-mono">{r.no}</td>
                                    <td className="py-2.5">{r.tenantName}</td>
                                    <td className="py-2.5 text-text-muted">{r.dateTime ? formatDate(r.dateTime.slice(0, 10)) : '-'}</td>
                                    <td className="py-2.5 font-bold" dir="ltr">{formatCurrency(r.amount, currency)}</td>
                                    <td className="py-2.5">
                                        <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${r.status === 'POSTED' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                                            {r.status === 'POSTED' ? 'مرحّل' : 'ملغى'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-8 text-text-muted">
                        <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">لا توجد سندات قبض بعد</p>
                    </div>
                )}
            </div>

            {/* Footer - Developer Info */}
            <footer className="mt-8 pt-6 border-t border-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Product Info */}
                    <div className="text-center sm:text-right">
                        <h4 className="font-bold text-text mb-2 flex items-center gap-2">
                            <Globe size={16} className="text-primary" />
                            Rentrix System
                        </h4>
                        <p className="text-xs text-text-muted leading-relaxed">
                            نظام إدارة عقارات متقدم مع محاسبة مزدوجة الدخول وتقارير مالية شاملة
                        </p>
                    </div>

                    {/* Developer Info */}
                    <div className="text-center">
                        <h4 className="font-bold text-text mb-2">Developed by</h4>
                        <p className="text-sm font-semibold text-primary mb-2">Mohamed Masoud</p>
                        <p className="text-xs text-text-muted">Full Stack Developer</p>
                    </div>

                    {/* Contact Info */}
                    <div className="text-center sm:text-left">
                        <h4 className="font-bold text-text mb-2">Contact & Links</h4>
                        <div className="space-y-1 text-xs text-text-muted">
                            <p className="flex items-center gap-2 justify-center sm:justify-start hover:text-primary transition-colors">
                                <Mail size={14} />
                                <a href="mailto:masoud.dev@outlook.com" className="hover:underline">masoud.dev@outlook.com</a>
                            </p>
                            <p className="flex items-center gap-2 justify-center sm:justify-start hover:text-primary transition-colors">
                                <Globe size={14} />
                                <a href="https://www.rentrix-system.com" target="_blank" rel="noopener noreferrer" className="hover:underline">www.rentrix-system.com</a>
                            </p>
                            <p className="flex items-center gap-2 justify-center sm:justify-start text-text-muted">
                                <span>Version 1.0.0 • 2026</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-6 pt-4 border-t border-border/30 text-center text-xs text-text-muted">
                    <p>© 2026 Rentrix. جميع الحقوق محفوظة | All Rights Reserved</p>
                </div>
            </footer>
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
            const revenue = receipts
                .filter(r => r.status === 'POSTED' && r.dateTime && isWithinInterval(new Date(r.dateTime), { start: monthStart, end: monthEnd }))
                .reduce((s, r) => s + r.amount, 0);
            const exp = expenses
                .filter(e => e.status === 'POSTED' && e.dateTime && isWithinInterval(new Date(e.dateTime), { start: monthStart, end: monthEnd }))
                .reduce((s, e) => s + e.amount, 0);
            return { name: label, revenue, expenses: exp };
        });
    }, [receipts, expenses]);

    return (
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-text flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" />
                    اتجاه الإيرادات والمصروفات
                </h3>
                <span className="text-xs text-text-muted">آخر 6 أشهر</span>
            </div>
            <div className="h-52 overflow-hidden" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="dashExpGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={11} tickFormatter={(v) => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, currency as 'OMR' | 'SAR' | 'EGP')} />
                        <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke="#10b981" fill="url(#dashRevGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expenses" name="المصروفات" stroke="#ef4444" fill="url(#dashExpGrad)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const KpiMini: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; onClick?: () => void }> = ({ label, value, icon, color, onClick }) => {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    };
    return (
        <div onClick={onClick} className={`bg-card p-4 rounded-lg border border-border shadow-sm text-center hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-primary hover:bg-primary/5' : ''}`}>
            <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 ${colorMap[color] || colorMap.blue}`}>{icon}</div>
            <p className="text-lg md:text-xl font-bold text-text">{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
        </div>
    );
};

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode; gradient: string; shadowColor: string; trend?: string }> = ({ title, value, icon, gradient, shadowColor, trend }) => (
    <div className={`bg-gradient-to-br ${gradient} p-5 rounded-2xl text-white shadow-lg ${shadowColor} hover:shadow-2xl transition-shadow`}>
        <div className="flex justify-between items-start">
            <p className="opacity-80 text-sm font-medium">{title}</p>
            <div className="opacity-60">{icon}</div>
        </div>
        <div className="mt-3 flex items-end justify-between">
            <h2 className="text-2xl md:text-3xl font-bold" dir="ltr">{value}</h2>
            {trend && <span className="text-xl opacity-80">{trend}</span>}
        </div>
    </div>
);

const AlertCard: React.FC<{ title: string; count: number; detail: string; icon: React.ReactNode; color: string; onClick: () => void }> = ({ title, count, detail, icon, color, onClick }) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
        red: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800', text: 'text-red-600', badge: 'bg-red-500' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600', badge: 'bg-amber-500' },
        blue: { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600', badge: 'bg-blue-500' },
    };
    const c = colorMap[color] || colorMap.blue;
    return (
        <div onClick={onClick} className={`${c.bg} p-4 rounded-xl border ${c.border} cursor-pointer hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className={c.text}>{icon}</span>
                    <span className="font-bold text-text text-sm">{title}</span>
                </div>
                {count > 0 && <span className={`${c.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center`}>{count}</span>}
            </div>
            <p className="text-xs text-text-muted">{detail}</p>
        </div>
    );
};

const BalanceRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
        <span className="text-sm text-text-muted">{label}</span>
        <span className={`font-bold text-sm ${color}`} dir="ltr">{value}</span>
    </div>
);

const QuickAction: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = ({ label, icon, onClick }) => (
    <button onClick={onClick} className="flex flex-col sm:flex-row items-center justify-center sm:items-center gap-2 p-3 rounded-lg border border-border/50 bg-background hover:bg-primary/5 hover:border-primary text-xs sm:text-sm font-medium text-text transition-all active:scale-95">
        <span className="text-primary text-base">{icon}</span>
        <span className="text-center sm:text-left">{label}</span>
    </button>
);


export default Dashboard;
