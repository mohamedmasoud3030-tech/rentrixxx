import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Bell, FileText, AlertTriangle, CheckCheck } from 'lucide-react';
import { toArabicDigits, formatDate, formatCurrency } from '../../../utils/helpers';
import { Link } from 'react-router-dom';

const Notifications: React.FC = () => {
    const { db, settings } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [readLog, setReadLog] = useState<Record<string, number>>(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('notif_read_log') || '{}');
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch {
            return {};
        }
    });
    const wrapperRef = useRef<HTMLDivElement>(null);

    const currency = settings.operational?.currency ?? 'OMR';
    const alertDays = settings.operational?.contractAlertDays ?? 30;

    const expiringContracts = (db.contracts || []).filter(c => {
        if (c.status !== 'ACTIVE') return false;
        const endDate = new Date(c.end);
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() + alertDays);
        return endDate <= alertDate && endDate > new Date();
    });

    const overdueInvoices = (db.invoices || []).filter(inv => inv.status === 'OVERDUE');

    const allItems: Array<
        | { id: string; type: 'overdue'; inv: (typeof overdueInvoices)[number] }
        | { id: string; type: 'expiring'; c: (typeof expiringContracts)[number] }
    > = [
        ...overdueInvoices.map(inv => ({ id: `inv-${inv.id}`, type: 'overdue' as const, inv })),
        ...expiringContracts.map(c => ({ id: `ctr-${c.id}`, type: 'expiring' as const, c })),
    ];

    const unreadCount = allItems.filter(item => !(item.id in readLog)).length;

    const filteredItems = (allItems || []).filter(item => {
        if (filter === 'unread') return !(item.id in readLog);
        if (filter === 'read') return item.id in readLog;
        return true;
    });
    const filteredOverdueInvoices = filteredItems
        .filter((i): i is Extract<(typeof allItems)[number], { type: 'overdue' }> => i.type === 'overdue')
        .map(i => i.inv);
    const filteredExpiringContracts = filteredItems
        .filter((i): i is Extract<(typeof allItems)[number], { type: 'expiring' }> => i.type === 'expiring')
        .map(i => i.c);

    const markAllRead = () => {
        const now = Date.now();
        const newLog = { ...readLog, ...Object.fromEntries(allItems.map(i => [i.id, now])) };
        setReadLog(newLog);
        localStorage.setItem('notif_read_log', JSON.stringify(newLog));
    };

    const markOneRead = (id: string) => {
        const newLog = { ...readLog, [id]: Date.now() };
        setReadLog(newLog);
        localStorage.setItem('notif_read_log', JSON.stringify(newLog));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-background transition-colors"
                title="التنبيهات"
            >
                <Bell className="w-4.5 h-4.5 text-text-muted" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                        {toArabicDigits(unreadCount > 9 ? '9+' : unreadCount)}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute left-0 mt-2 w-84 rounded-xl bg-card border border-border z-50"
                    style={{ boxShadow: 'var(--shadow-card-hover)', minWidth: '320px' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <span className="font-black text-text">التنبيهات</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors font-bold"
                            >
                                <CheckCheck size={13} />
                                تعليم الكل كمقروء
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex border-b border-border">
                        {([['all', 'الكل'], ['unread', 'غير مقروء'], ['read', 'مقروء']] as const).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`flex-1 py-2 text-xs font-bold transition-colors ${filter === key ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto">
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <Bell className="w-8 h-8 text-text-muted opacity-40" />
                                <p className="text-sm text-text-muted">{filter === 'unread' ? 'لا توجد تنبيهات غير مقروءة' : filter === 'read' ? 'لا توجد تنبيهات مقروءة' : 'لا توجد تنبيهات جديدة'}</p>
                            </div>
                        ) : (
                            <>
                                {filteredOverdueInvoices.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase text-text-muted px-4 pt-3 pb-1 tracking-widest opacity-70">
                                            فواتير متأخرة
                                        </h4>
                                        {filteredOverdueInvoices.map(inv => {
                                            const contract = (db.contracts || []).find(c => c.id === inv.contractId);
                                            const tenant = contract ? (db.tenants || []).find(t => t.id === contract.tenantId) : { name: 'غير معروف' };
                                            const itemId = `inv-${inv.id}`;
                                            const isRead = itemId in readLog;
                                            return (
                                                <Link
                                                    to="/financial/invoices?filter=overdue"
                                                    onClick={() => { setIsOpen(false); markOneRead(itemId); }}
                                                    key={inv.id}
                                                    className={`flex items-start gap-3 px-4 py-3 text-sm border-b border-border/50 last:border-0 transition-colors ${isRead ? 'opacity-60' : 'bg-danger-bg/20 hover:bg-danger-bg/40'}`}
                                                >
                                                    <AlertTriangle className="w-4 h-4 text-danger-text mt-0.5 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-text truncate">
                                                            فاتورة متأخرة — <span className="text-danger-text">{tenant?.name}</span>
                                                        </p>
                                                        <p className="text-xs text-text-muted mt-0.5">
                                                            المبلغ المتبقي: {formatCurrency(inv.amount - inv.paidAmount, currency)}
                                                        </p>
                                                        {isRead && readLog[itemId] && (
                                                            <p className="text-[10px] text-text-muted mt-0.5 opacity-60">
                                                                قُرئ: {new Date(readLog[itemId]).toLocaleString('ar')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {filteredExpiringContracts.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase text-text-muted px-4 pt-3 pb-1 tracking-widest opacity-70">
                                            عقود تنتهي قريباً
                                        </h4>
                                        {filteredExpiringContracts.map(c => {
                                            const tenant = (db.tenants || []).find(t => t.id === c.tenantId);
                                            const itemId = `ctr-${c.id}`;
                                            const isRead = itemId in readLog;
                                            return (
                                                <Link
                                                    to="/contracts"
                                                    onClick={() => { setIsOpen(false); markOneRead(itemId); }}
                                                    key={c.id}
                                                    className={`flex items-start gap-3 px-4 py-3 text-sm border-b border-border/50 last:border-0 transition-colors ${isRead ? 'opacity-60' : 'bg-warning-bg/20 hover:bg-warning-bg/40'}`}
                                                >
                                                    <FileText className="w-4 h-4 text-warning-text mt-0.5 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-text truncate">
                                                            عقد ينتهي قريباً — <span className="text-warning-text">{tenant?.name}</span>
                                                        </p>
                                                        <p className="text-xs text-text-muted mt-0.5">
                                                            تاريخ الانتهاء: {formatDate(c.end)}
                                                        </p>
                                                        {isRead && readLog[itemId] && (
                                                            <p className="text-[10px] text-text-muted mt-0.5 opacity-60">
                                                                قُرئ: {new Date(readLog[itemId]).toLocaleString('ar')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {!isRead && <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 mt-1.5" />}
                                                </Link>
                                            );
                                        })}
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
