import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Bell, FileText, AlertTriangle } from 'lucide-react';
import { toArabicDigits, formatDate, formatCurrency } from '../../../utils/helpers';
import { Link } from 'react-router-dom';

const Notifications: React.FC = () => {
    const { db, settings } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const expiringContracts = db.contracts.filter(c => {
        if (c.status !== 'ACTIVE') return false;
        const endDate = new Date(c.end);
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() + settings.operational.contractAlertDays);
        return endDate <= alertDate && endDate > new Date();
    });

    const overdueInvoices = db.invoices.filter(inv => inv.status === 'OVERDUE');

    const notificationCount = expiringContracts.length + overdueInvoices.length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {toArabicDigits(notificationCount)}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 rounded-lg shadow-lg bg-white dark:bg-slate-800 border dark:border-slate-700 z-50">
                    <div className="p-3 font-bold border-b dark:border-slate-700">التنبيهات</div>
                    <div className="max-h-96 overflow-y-auto">
                        {notificationCount === 0 ? (
                            <p className="text-sm text-slate-500 p-4 text-center">لا توجد تنبيهات جديدة.</p>
                        ) : (
                            <>
                                {overdueInvoices.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-slate-400 px-3 pt-3 pb-1">فواتير متأخرة</h4>
                                        {overdueInvoices.map(inv => {
                                             const contract = db.contracts.find(c => c.id === inv.contractId);
                                             const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : { name: 'غير معروف'};
                                            return (
                                            <Link to="/invoices" onClick={() => setIsOpen(false)} key={inv.id} className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                                    <div>
                                                        <p>فاتورة للمستأجر <strong>{tenant.name}</strong> متأخرة.</p>
                                                        <p className="text-xs text-slate-500">{formatCurrency(inv.amount - inv.paidAmount, settings.operational.currency)}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        )})}
                                    </div>
                                )}
                                {expiringContracts.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-slate-400 px-3 pt-3 pb-1">عقود على وشك الانتهاء</h4>
                                        {expiringContracts.map(c => {
                                            const tenant = db.tenants.find(t => t.id === c.tenantId);
                                            return(
                                            <Link to="/contracts" onClick={() => setIsOpen(false)} key={c.id} className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                                                <div className="flex items-start gap-2">
                                                    <FileText className="w-4 h-4 text-yellow-500 mt-0.5" />
                                                    <div>
                                                        <p>عقد المستأجر <strong>{tenant?.name}</strong> ينتهي قريباً.</p>
                                                        <p className="text-xs text-slate-500">تاريخ الانتهاء: {formatDate(c.end)}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        )})}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;