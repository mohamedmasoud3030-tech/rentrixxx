
import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Invoices from './Invoices';
import Financials from './Financials';
import Maintenance from './Maintenance';
import Card from '../components/ui/Card';
import { Wallet, ReceiptText, Wrench, Calculator, BookOpen } from 'lucide-react';
import GeneralLedger from './GeneralLedger';
import Accounting from './Accounting';

type RouteErrorBoundaryProps = {
    title: string;
    children: React.ReactNode;
};

type RouteErrorBoundaryState = {
    hasError: boolean;
};

class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
    constructor(props: RouteErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        console.error('[FinanceRouteError]', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Card className="p-6 text-center">
                    <h3 className="text-lg font-bold mb-2">حدث خطأ أثناء فتح هذه الصفحة</h3>
                    <p className="text-sm text-text-muted">
                        الصفحة: {this.props.title}. حاول تحديث الصفحة، وإذا تكرر الخطأ سنقوم بتتبع السبب من السجلات.
                    </p>
                </Card>
            );
        }
        return this.props.children;
    }
}

const withSafeRoute = (title: string, node: React.ReactNode) => (
    <RouteErrorBoundary title={title}>{node}</RouteErrorBoundary>
);

const FinanceTab: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) => 
            `flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                isActive ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-background'
            }`
        }
    >
        {icon}
        {label}
    </NavLink>
);

const Finance: React.FC = () => {
    return (
        <div className="space-y-6">
            <Card className="p-2 overflow-hidden">
                <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
                    <FinanceTab to="invoices" icon={<ReceiptText size={18}/>} label="الفواتير" />
                    <FinanceTab to="financials" icon={<Wallet size={18}/>} label="السندات والمصروفات" />
                    <FinanceTab to="maintenance" icon={<Wrench size={18}/>} label="الصيانة" />
                    <FinanceTab to="gl" icon={<Calculator size={18}/>} label="دفتر الأستاذ العام" />
                    <FinanceTab to="accounting" icon={<BookOpen size={18}/>} label="المحاسبة" />
                </nav>
            </Card>

            <div>
                <Routes>
                    <Route path="invoices" element={withSafeRoute('الفواتير', <Invoices />)} />
                    <Route path="financials" element={withSafeRoute('السندات والمصروفات', <Financials />)} />
                    <Route path="maintenance" element={withSafeRoute('الصيانة', <Maintenance />)} />
                    <Route path="gl" element={withSafeRoute('دفتر الأستاذ العام', <GeneralLedger />)} />
                    <Route path="accounting" element={withSafeRoute('المحاسبة', <Accounting />)} />
                    {/* Backward-compatible routes to avoid blank pages on old links */}
                    <Route path="receipts" element={withSafeRoute('السندات والمصروفات', <Financials />)} />
                    <Route path="expenses" element={withSafeRoute('السندات والمصروفات', <Financials />)} />
                    <Route path="deposits" element={withSafeRoute('السندات والمصروفات', <Financials />)} />
                    <Route path="settlements" element={withSafeRoute('السندات والمصروفات', <Financials />)} />
                    <Route path="ledger" element={withSafeRoute('دفتر الأستاذ العام', <GeneralLedger />)} />
                    <Route index element={<Navigate to="invoices" replace />} />
                    <Route path="*" element={<Navigate to="invoices" replace />} />
                </Routes>
            </div>
        </div>
    );
};

export default Finance;
