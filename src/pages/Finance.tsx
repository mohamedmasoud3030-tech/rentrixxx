import React, { useEffect, useMemo } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Invoices from './Invoices';
import Financials from './Financials';
import Maintenance from './Maintenance';
import Card from '../components/ui/Card';
import { Wallet, ReceiptText, Wrench, Calculator, BookOpen } from 'lucide-react';
import GeneralLedger from './GeneralLedger';
import Accounting from './Accounting';
import FinanceIntelligenceHub from '../components/finance/FinanceIntelligenceHub';
import Arrears from './financial/Arrears';

const FinanceTab: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) => 
            `flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                isActive 
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
                    : 'text-text-muted hover:text-primary hover:bg-primary/5'
            }`
        }
    >
        <span className="opacity-80">{icon}</span>
        {label}
    </NavLink>
);

const LAST_FINANCE_TAB_KEY = 'rentrix:last-finance-tab';

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
        const isSupportedSavedPath = savedPath && (savedPath.startsWith('/finance/') || savedPath.startsWith('/financial/'));
        return isSupportedSavedPath ? savedPath : `${financeBasePath}/invoices`;
    }, [financeBasePath]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-primary">الإدارة المالية</h1>
                    <p className="text-text-muted text-sm mt-1">منصة موحدة للحسابات والمالية تربط العقود والفواتير والسندات والتقارير بذكاء</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">النظام المالي متصل</span>
                    </div>
                </div>
            </div>

            <FinanceIntelligenceHub />

            {/* Navigation Tabs */}
            <Card className="p-1.5 overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-md sticky top-4 z-10">
                <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <FinanceTab to="/finance/invoices" icon={<ReceiptText size={20}/>} label="Invoices" />
                    <FinanceTab to="/finance/financials" icon={<Wallet size={20}/>} label="Payments & Expenses" />
                    <FinanceTab to="/finance/maintenance" icon={<Wrench size={20}/>} label="الصيانة" />
                    <FinanceTab to="/finance/gl" icon={<Calculator size={20}/>} label="الأستاذ العام" />
                    <FinanceTab to="/finance/accounting" icon={<BookOpen size={20}/>} label="دليل الحسابات" />
                </nav>
            </Card>

            {/* Content Area */}
            <div className="min-h-[60vh]">
                <Routes>
                    <Route path="invoices" element={<Invoices />} />
                    <Route path="payments" element={<Financials initialTab="receipts" />} />
                    <Route path="expenses" element={<Financials initialTab="expenses" />} />
                    <Route path="receipts" element={<Financials initialTab="receipts" />} />
                    <Route path="financials" element={<Navigate to="../receipts" replace />} />
                    <Route path="arrears" element={<Arrears />} />
                    <Route path="maintenance" element={<Maintenance />} />
                    <Route path="gl" element={<GeneralLedger />} />
                    <Route path="accounting" element={<Accounting />} />
                    <Route index element={<Navigate to={defaultFinancePath} replace />} />
                </Routes>
            </div>
        </div>
    );
};

export default Finance;
