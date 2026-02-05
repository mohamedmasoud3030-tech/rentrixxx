
import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Invoices from './Invoices';
import Financials from './Financials';
import Maintenance from './Maintenance';
import Card from '../components/ui/Card';
import { Wallet, ReceiptText, Wrench, Calculator } from 'lucide-react';
import GeneralLedger from './GeneralLedger';

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
                </nav>
            </Card>

            <div>
                <Routes>
                    <Route path="invoices" element={<Invoices />} />
                    <Route path="financials" element={<Financials />} />
                    <Route path="maintenance" element={<Maintenance />} />
                    <Route path="gl" element={<GeneralLedger />} />
                    <Route index element={<Navigate to="invoices" replace />} />
                </Routes>
            </div>
        </div>
    );
};

export default Finance;
