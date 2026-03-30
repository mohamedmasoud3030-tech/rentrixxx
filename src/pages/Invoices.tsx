import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, getStatusBadgeClass, exportToCsv, INVOICE_STATUS_AR, INVOICE_TYPE_AR } from '../utils/helpers';
import NumberInput from '../components/ui/NumberInput';
import { ReceiptText, RefreshCw, Download, CheckSquare, Square, MessageCircle, FileText, Plus, Search, AlertCircle, Clock, CheckCircle2, ArrowUpRight, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { exportInvoiceToPdf } from '../services/pdfService';

type InvoiceFiltersState = {
    status: 'all' | 'unpaid' | 'overdue' | 'paid';
    type: 'all' | 'RENT' | 'LATE_FEE' | 'UTILITY' | 'OTHER';
    dateFrom: string;
    dateTo: string;
    search: string;
};

const STORAGE_KEY = 'rentrix:invoices_filters';

const defaultFilters: InvoiceFiltersState = {
    status: 'all',
    type: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
};

const Invoices: React.FC = () => {
    const { db, financeService, settings, dataService } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filters, setFilters] = useState<InvoiceFiltersState>(() => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            return stored ? { ...defaultFilters, ...JSON.parse(stored) } : defaultFilters;
        } catch {
            return defaultFilters;
        }
    });
    const [quickPayInvoice, setQuickPayInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    }, [filters]);

    const getInvoiceTotal = useCallback((invoice: Invoice) => (invoice.amount || 0) + (invoice.taxAmount || 0), []);
    const getInvoiceRemaining = useCallback((invoice: Invoice) => Math.max(0, getInvoiceTotal(invoice) - (invoice.paidAmount || 0)), [getInvoiceTotal]);
    const getEffectiveStatus = useCallback((invoice: Invoice): Invoice['status'] => {
        const total = getInvoiceTotal(invoice);
        const paid = invoice.paidAmount || 0;
        if (paid >= total - 0.001) return 'PAID';
        const graceDays = settings.operational?.lateFee?.graceDays ?? 0;
        const dueWithGrace = new Date(invoice.dueDate);
        dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);
        if (dueWithGrace < new Date()) return 'OVERDUE';
        if (paid > 0.001) return 'PARTIALLY_PAID';
        return 'UNPAID';
    }, [getInvoiceTotal, settings.operational?.lateFee?.graceDays]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filterParam = params.get('filter');
        if (filterParam && ['all', 'unpaid', 'overdue', 'paid'].includes(filterParam)) {
            setFilters(prev => ({ ...prev, status: filterParam as InvoiceFiltersState['status'] }));
        }
    }, [location.search]);

    const invoicesWithDetails = useMemo(() => {
        return db.invoices
            .filter(inv => {
                const effectiveStatus = getEffectiveStatus(inv);
                if (filters.status === 'unpaid') return ['UNPAID', 'PARTIALLY_PAID'].includes(effectiveStatus);
                if (filters.status === 'overdue') return effectiveStatus === 'OVERDUE';
                if (filters.status === 'paid') return effectiveStatus === 'PAID';
                return true;
            })
            .filter(inv => {
                if (filters.type === 'all') return true;
                if (filters.type === 'OTHER') return !['RENT', 'LATE_FEE', 'UTILITY'].includes(inv.type);
                return inv.type === filters.type;
            })
            .filter(inv => (!filters.dateFrom || inv.dueDate >= filters.dateFrom) && (!filters.dateTo || inv.dueDate <= filters.dateTo))
            .filter(inv => {
                if (!filters.search.trim()) return true;
                const contract = db.contracts.find(c => c.id === inv.contractId);
                const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                return inv.no.includes(filters.search) || tenant?.name.includes(filters.search);
            })
            .map(inv => {
                const contract = db.contracts.find(c => c.id === inv.contractId);
                const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
                const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
                return {
                    ...inv,
                    tenant,
                    unit,
                    propertyName: property?.name || '',
                    total: getInvoiceTotal(inv),
                    remaining: getInvoiceRemaining(inv),
                    effectiveStatus: getEffectiveStatus(inv),
                };
            })
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [db, filters, getEffectiveStatus, getInvoiceRemaining, getInvoiceTotal]);

    const stats = useMemo(() => {
        const unpaid = db.invoices.filter(i => ['UNPAID', 'PARTIALLY_PAID'].includes(getEffectiveStatus(i))).reduce((s, i) => s + getInvoiceRemaining(i), 0);
        const overdue = db.invoices.filter(i => getEffectiveStatus(i) === 'OVERDUE').reduce((s, i) => s + getInvoiceRemaining(i), 0);
        const month = new Date().toISOString().slice(0, 7);
        const collectedThisMonth = db.receipts
            .filter(r => r.status === 'POSTED' && r.dateTime.startsWith(month))
            .reduce((s, r) => s + r.amount, 0);
        return { unpaid, overdue, collectedThisMonth };
    }, [db.invoices, db.receipts, getEffectiveStatus, getInvoiceRemaining]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleBulkSendWhatsApp = () => {
        const selected = invoicesWithDetails.filter(i => selectedIds.has(i.id)).filter(i => i.effectiveStatus === 'OVERDUE');
        if (selected.length === 0) {
            toast.error('اختر فواتير متأخرة أولاً.');
            return;
        }
        let sent = 0;
        for (const inv of selected) {
            const phone = inv.tenant?.phone;
            if (!phone) continue;
            const msg = encodeURIComponent(`مرحباً ${inv.tenant?.name}،\nتذكير: فاتورتك رقم ${inv.no} متأخرة بمبلغ ${formatCurrency(inv.remaining, settings.operational?.currency ?? 'OMR')}.`);
            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
            sent++;
        }
        sent ? toast.success(`تم فتح واتساب لـ ${sent} مستأجر.`) : toast.error('لا توجد أرقام صالحة.');
        setSelectedIds(new Set());
    };

    const handleGenerateInvoices = async () => {
        setIsMonthlyLoading(true);
        const count = await financeService.generateMonthlyInvoices();
        toast.success(`تم إصدار ${count} فاتورة جديدة.`);
        setIsMonthlyLoading(false);
    };

    const currency = settings.operational?.currency ?? 'OMR';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="مستحقات غير محصلة" value={stats.unpaid} icon={<Clock className="text-amber-500" />} color="amber" />
                <StatCard label="فواتير متأخرة" value={stats.overdue} icon={<AlertCircle className="text-rose-500" />} color="rose" />
                <StatCard label="تحصيلات الشهر" value={stats.collectedThisMonth} icon={<ArrowUpRight className="text-emerald-500" />} color="emerald" />
            </div>

            <Card className="p-0 overflow-hidden border-none shadow-xl bg-card/50">
                <div className="flex flex-col gap-3 p-4 border-b border-border">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'all', label: 'الكل' },
                            { key: 'unpaid', label: 'غير مدفوعة' },
                            { key: 'overdue', label: 'متأخرة' },
                            { key: 'paid', label: 'مدفوعة' },
                        ].map(filter => (
                            <button key={filter.key} onClick={() => setFilters(prev => ({ ...prev, status: filter.key as InvoiceFiltersState['status'] }))} className={`px-4 py-2 rounded-lg text-sm ${filters.status === filter.key ? 'bg-primary text-white' : 'bg-background'}`}>{filter.label}</button>
                        ))}
                    </div>

                    <div className="grid md:grid-cols-4 gap-2">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                            <input placeholder="بحث..." className="w-full pr-9" value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} />
                        </div>
                        <select value={filters.type} onChange={e => setFilters(prev => ({ ...prev, type: e.target.value as InvoiceFiltersState['type'] }))}>
                            <option value="all">الكل</option>
                            <option value="RENT">إيجار</option>
                            <option value="LATE_FEE">رسوم تأخير</option>
                            <option value="UTILITY">مرافق</option>
                            <option value="OTHER">أخرى</option>
                        </select>
                        <input type="date" value={filters.dateFrom} onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
                        <input type="date" value={filters.dateTo} onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className="btn btn-primary">
                            {isMonthlyLoading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />} إصدار فواتير الإيجار
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="btn btn-secondary"><Plus size={16} /> إضافة فاتورة يدوية</button>
                        <button onClick={handleBulkSendWhatsApp} className="btn btn-ghost"><MessageCircle size={16} /> إرسال تذكير واتساب للمتأخرين</button>
                        <button onClick={() => exportToCsv('فواتير_rentrix', invoicesWithDetails)} className="btn btn-ghost"><Download size={16} /> تصدير</button>
                    </div>
                </div>

                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-text-muted">
                            <tr>
                                <th className="px-2 py-2 w-10"></th>
                                <th className="px-2 py-2">رقم</th>
                                <th className="px-2 py-2">المستأجر/الوحدة</th>
                                <th className="px-2 py-2">النوع</th>
                                <th className="px-2 py-2">الاستحقاق</th>
                                <th className="px-2 py-2">المبلغ</th>
                                <th className="px-2 py-2">المتبقي</th>
                                <th className="px-2 py-2">الحالة</th>
                                <th className="px-2 py-2">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoicesWithDetails.map(inv => (
                                <tr key={inv.id} className="border-t border-border hover:bg-background/50">
                                    <td className="px-2 py-2" onClick={() => toggleSelect(inv.id)}>{selectedIds.has(inv.id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}</td>
                                    <td className="px-2 py-2 font-mono">{inv.no}</td>
                                    <td className="px-2 py-2">{inv.tenant?.name || '-'}<div className="text-xs text-text-muted">{inv.unit?.name || '-'}</div></td>
                                    <td className="px-2 py-2">{INVOICE_TYPE_AR[inv.type] || inv.type}</td>
                                    <td className="px-2 py-2">{formatDate(inv.dueDate)}</td>
                                    <td className="px-2 py-2" dir="ltr">{formatCurrency(inv.total, currency)}</td>
                                    <td className="px-2 py-2 text-rose-600" dir="ltr">{inv.remaining > 0 ? formatCurrency(inv.remaining, currency) : '—'}</td>
                                    <td className="px-2 py-2"><span className={`px-2 py-1 rounded text-[10px] border ${getStatusBadgeClass(inv.effectiveStatus)}`}>{INVOICE_STATUS_AR[inv.effectiveStatus]}</span></td>
                                    <td className="px-2 py-2">
                                        <div className="flex gap-1">
                                            <button onClick={() => setQuickPayInvoice(inv)} className="p-2 rounded bg-emerald-50 text-emerald-700" title="تسجيل دفع"><Wallet size={15} /></button>
                                            <button onClick={() => { setEditingInvoice(inv); setIsModalOpen(true); }} className="p-2 rounded bg-blue-50 text-blue-700"><FileText size={15} /></button>
                                            <button onClick={() => exportInvoiceToPdf(inv, db)} className="p-2 rounded bg-background"><Download size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && <InvoiceForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingInvoice(null); }} invoice={editingInvoice} />}
            {quickPayInvoice && (
                <QuickPayModal
                    invoice={quickPayInvoice}
                    onClose={() => setQuickPayInvoice(null)}
                    onSaved={async (amount, channel) => {
                        const contractId = quickPayInvoice.contractId;
                        await dataService.add('receipts', {
                            contractId,
                            dateTime: new Date().toISOString(),
                            channel,
                            amount,
                            ref: '',
                            notes: `سداد فاتورة ${quickPayInvoice.no}`,
                            status: 'POSTED',
                        });
                        toast.success('تم تسجيل الدفعة بنجاح');
                        setQuickPayInvoice(null);
                    }}
                />
            )}
        </div>
    );
};

const QuickPayModal: React.FC<{ invoice: Invoice; onClose: () => void; onSaved: (amount: number, channel: 'CASH' | 'BANK' | 'POS' | 'CHECK' | 'OTHER') => Promise<void> }> = ({ invoice, onClose, onSaved }) => {
    const total = (invoice.amount || 0) + (invoice.taxAmount || 0);
    const remaining = Math.max(0, total - (invoice.paidAmount || 0));
    const [amount, setAmount] = useState(remaining);
    const [channel, setChannel] = useState<'CASH' | 'BANK' | 'POS' | 'CHECK' | 'OTHER'>('CASH');
    const [saving, setSaving] = useState(false);

    return (
        <Modal isOpen onClose={onClose} title="تسجيل دفع">
            <div className="space-y-4">
                <div className="text-sm">رقم الفاتورة: <span className="font-mono">{invoice.no}</span></div>
                <div className="text-sm">المبلغ المتبقي: {formatCurrency(remaining)}</div>
                <NumberInput value={amount} onChange={setAmount} />
                <select value={channel} onChange={e => setChannel(e.target.value as typeof channel)}>
                    <option value="CASH">نقد</option>
                    <option value="BANK">بنك</option>
                    <option value="POS">نقطة بيع</option>
                    <option value="CHECK">شيك</option>
                    <option value="OTHER">أخرى</option>
                </select>
                <div className="flex gap-2 justify-end">
                    <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
                    <button className="btn btn-primary" disabled={saving || amount <= 0} onClick={async () => { setSaving(true); await onSaved(amount, channel); setSaving(false); }}>حفظ</button>
                </div>
            </div>
        </Modal>
    );
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => {
    const colorClasses: Record<string, string> = {
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    };
    return (
        <div className={`p-4 rounded-2xl border ${colorClasses[color]} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
                <div className="p-3 bg-white/50 rounded-xl">{icon}</div>
                <div>
                    <p className="text-[10px] font-black opacity-70">{label}</p>
                    <p className="text-xl font-black" dir="ltr">{formatCurrency(value)}</p>
                </div>
            </div>
            <div className="opacity-10"><ArrowUpRight size={40} /></div>
        </div>
    );
};

const InvoiceForm: React.FC<{ isOpen: boolean; onClose: () => void; invoice: Invoice | null }> = ({ isOpen, onClose, invoice }) => {
    const { db, dataService } = useApp();
    const [unitId, setUnitId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [amount, setAmount] = useState(0);
    const [type, setType] = useState<Invoice['type']>('UTILITY');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const activeContractForUnit = useMemo(() => db.contracts.find(c => c.unitId === unitId && c.status === 'ACTIVE'), [unitId, db.contracts]);

    useEffect(() => {
        if (!isOpen) return;
        if (invoice) {
            const contract = db.contracts.find(c => c.id === invoice.contractId);
            setUnitId(contract?.unitId || '');
            setDueDate(invoice.dueDate);
            setAmount(invoice.amount);
            setType(invoice.type);
            setNotes(invoice.notes);
        } else {
            setUnitId(db.units[0]?.id || '');
            setDueDate(new Date().toISOString().slice(0, 10));
            setAmount(0);
            setType('UTILITY');
            setNotes('');
        }
    }, [isOpen, invoice, db]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current || !activeContractForUnit || amount <= 0) return;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = { contractId: activeContractForUnit.id, dueDate, amount, paidAmount: invoice ? invoice.paidAmount : 0, status: invoice ? invoice.status : 'UNPAID', type, notes };
            if (invoice) await dataService.update('invoices', invoice.id, data);
            else await dataService.add('invoices', data);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [activeContractForUnit, amount, dataService, dueDate, invoice, notes, onClose, type]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'تعديل الفاتورة' : 'إنشاء فاتورة يدوية'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select value={unitId} onChange={e => setUnitId(e.target.value)}>
                    {db.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select value={type} onChange={e => setType(e.target.value as Invoice['type'])}>
                    <option value="RENT">إيجار</option>
                    <option value="UTILITY">مرافق</option>
                    <option value="MAINTENANCE">صيانة</option>
                    <option value="LATE_FEE">رسوم تأخير</option>
                </select>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                <NumberInput value={amount} onChange={setAmount} />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} />
                <div className="flex gap-2 justify-end">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default Invoices;
