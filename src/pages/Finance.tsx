import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import { Wallet, ReceiptText, Wrench, Calculator, BookOpen } from 'lucide-react';
import FinanceIntelligenceHub from '../components/finance/FinanceIntelligenceHub';
import { AR_LABELS } from '../config/labels.ar';

const Invoices = lazy(() => import('./Invoices'));
const Financials = lazy(() => import('./Financials'));
const Maintenance = lazy(() => import('./Maintenance'));
const GeneralLedger = lazy(() => import('./GeneralLedger'));
const Accounting = lazy(() => import('./Accounting'));
const Arrears = lazy(() => import('./financial/Arrears'));

const FinanceTab: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                isActive
                    ? 'bg-surface-container-high text-primary border border-primary/30 shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`
        }
    >
        <span className="opacity-80">{icon}</span>
        {label}
    </NavLink>
);

const LAST_FINANCE_TAB_KEY = 'rentrix:last-finance-tab';
const SUPPORTED_FINANCE_PATHS = new Set([
    'invoices',
    'payments',
    'expenses',
    'receipts',
    'financials',
    'arrears',
    'maintenance',
    'gl',
    'accounting',
]);

const normalizeFinancePath = (savedPath: string | null, financeBasePath: string): string => {
    if (!savedPath) return `${financeBasePath}/invoices`;

    const pathMatch = /^\/(?:finance|financial)\/(.+)$/.exec(savedPath.trim());
    if (!pathMatch) return `${financeBasePath}/invoices`;

    const subPath = pathMatch[1];
    return SUPPORTED_FINANCE_PATHS.has(subPath)
        ? `${financeBasePath}/${subPath}`
        : `${financeBasePath}/invoices`;
};

const FinanceRouteLoader: React.FC = () => (
    <div className="flex min-h-[20rem] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
);

const Finance: React.FC = () => {
    const location = useLocation();
    const financeBasePath = location.pathname.startsWith('/financial') ? '/financial' : '/finance';

    useEffect(() => {
        if ((location.pathname.startsWith('/finance/') || location.pathname.startsWith('/financial/')) && location.pathname !== '/finance' && location.pathname !== '/financial') {
            window.localStorage.setItem(LAST_FINANCE_TAB_KEY, location.pathname);
        }
    }, [location.pathname]);

    const defaultFinancePath = useMemo(() => {
        const savedPath = window.localStorage.getItem(LAST_FINANCE_TAB_KEY);
        return normalizeFinancePath(savedPath, financeBasePath);
    }, [financeBasePath]);

    const renderFinanceRoute = (node: React.ReactNode) => (
        <Suspense fallback={<FinanceRouteLoader />}>{node}</Suspense>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 bg-background">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-primary">الإدارة المالية</h1>
                    <p className="text-text-muted text-sm mt-1">منصة موحدة للحسابات والمالية تربط العقود والفواتير والسندات والتقارير بذكاء</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-surface-container-low border border-outline-variant/40 rounded-2xl flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">النظام المالي متصل</span>
                    </div>
                </div>
            </div>

            <FinanceIntelligenceHub />

            {/* Navigation Tabs */}
            <Card className="p-1.5 overflow-hidden border border-outline-variant/40 bg-surface-container-low sticky top-4 z-10">
                <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <FinanceTab to={`${financeBasePath}/invoices`} icon={<ReceiptText size={20} />} label={AR_LABELS.invoices} />
                    <FinanceTab to={`${financeBasePath}/financials`} icon={<Wallet size={20} />} label={AR_LABELS.paymentsAndExpenses} />
                    <FinanceTab to={`${financeBasePath}/maintenance`} icon={<Wrench size={20} />} label="الصيانة" />
                    <FinanceTab to={`${financeBasePath}/gl`} icon={<Calculator size={20} />} label="الأستاذ العام" />
                    <FinanceTab to={`${financeBasePath}/accounting`} icon={<BookOpen size={20} />} label="دليل الحسابات" />
                </nav>
            </Card>

            {/* Content Area */}
            <div className="min-h-[60vh]">
                <Routes>
                    <Route path="invoices" element={renderFinanceRoute(<Invoices />)} />
                    <Route path="payments" element={renderFinanceRoute(<Financials initialTab="receipts" />)} />
                    <Route path="expenses" element={renderFinanceRoute(<Financials initialTab="expenses" />)} />
                    <Route path="receipts" element={renderFinanceRoute(<Financials initialTab="receipts" />)} />
                    <Route path="financials" element={<Navigate to="../receipts" replace />} />
                    <Route path="arrears" element={renderFinanceRoute(<Arrears />)} />
                    <Route path="maintenance" element={renderFinanceRoute(<Maintenance />)} />
                    <Route path="gl" element={renderFinanceRoute(<GeneralLedger />)} />
                    <Route path="accounting" element={renderFinanceRoute(<Accounting />)} />
                    <Route index element={<Navigate to={defaultFinancePath} replace />} />
                </Routes>
            </div>
        </div>
    );
};

export default Finance;
