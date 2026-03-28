import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice, Unit } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, getStatusBadgeClass, exportToCsv, INVOICE_STATUS_AR, INVOICE_TYPE_AR } from '../utils/helpers';
import NumberInput from '../components/ui/NumberInput';
import { 
    ReceiptText, RefreshCw, Download, CheckSquare, Square, 
    CheckCircle, MessageCircle, FileText, Plus, Search, 
    Filter, AlertCircle, Clock, CheckCircle2, MoreVertical, 
    Trash2, Edit2, Share2, Printer, ArrowUpRight, ArrowDownRight, Wallet
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { exportInvoiceToPdf } from '../services/pdfService';

const Invoices: React.FC = () => {
    const { db, financeService, settings, dataService } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isLateFeeLoading, setIsLateFeeLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const filters = [
        { key: 'all', label: 'الكل' },
        { key: 'unpaid', label: 'غير مدفوعة' },
        { key: 'overdue', label: 'متأخرة' },
        { key: 'paid', label: 'مدفوعة' },
    ];
    
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filterParam = params.get('filter') || 'all';
        if (filters.some(f => f.key === filterParam)) {
            setActiveFilter(filterParam);
        }
    }, [location.search]);

    const handleFilterChange = (filterKey: string) => {
        setActiveFilter(filterKey);
        navigate(`/finance/invoices?filter=${filterKey}`);
    };

    const stats = useMemo(() => {
        const unpaid = db.invoices.filter(i => ['UNPAID', 'PARTIALLY_PAID'].includes(i.status)).reduce((s, i) => s + (i.amount - i.paidAmount), 0);
        const overdue = db.invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + (i.amount - i.paidAmount), 0);
        const collectedThisMonth = db.receipts.filter(r => r.dateTime.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, r) => s + r.amount, 0);
        return { unpaid, overdue, collectedThisMonth };
    }, [db.invoices, db.receipts]);

    const handleGenerateInvoices = async () => {
        setIsMonthlyLoading(true);
        const count = await financeService.generateMonthlyInvoices();
        toast.success(`تم إصدار ${count} فاتورة جديدة بنجاح.`);
        setIsMonthlyLoading(false);
    };

    const handleGenerateLateFees = async () => {
        setIsLateFeeLoading(true);
        const count = await financeService.generateLateFees();
        toast.success(`تم إصدار ${count} فاتورة رسوم تأخير جديدة.`);
        setIsLateFeeLoading(false);
    };

    const handleOpenModal = (invoice: Invoice | null = null) => {
        setEditingInvoice(invoice);
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setEditingInvoice(null);
        setIsModalOpen(false);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === invoicesWithDetails.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(invoicesWithDetails.map(i => i.id)));
        }
    };

    const handleBulkMarkOverdue = async () => {
        if (selectedIds.size === 0) { toast.error('لم يتم اختيار أي فاتورة.'); return; }
        const toMark = invoicesWithDetails.filter(i => selectedIds.has(i.id) && (i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID'));
        if (toMark.length === 0) { toast.error('الفواتير المختارة لا تقبل التحديث.'); return; }
        for (const inv of toMark) {
            await dataService.update('invoices', inv.id, { status: 'OVERDUE' as Invoice['status'] });
        }
        toast.success(`تم تعليم ${toMark.length} فاتورة كمتأخرة.`);
        setSelectedIds(new Set());
    };

    const handleBulkSendWhatsApp = () => {
        const selected = invoicesWithDetails.filter(i => selectedIds.has(i.id));
        if (selected.length === 0) { toast.error('لم يتم اختيار أي فاتورة.'); return; }
        let sent = 0;
        for (const inv of selected) {
            const phone = (inv.tenant as any)?.phone;
            if (!phone) continue;
            const currency = settings.operational?.currency ?? 'OMR';
            const balance = formatCurrency(inv.amount - inv.paidAmount, currency);
            const msg = encodeURIComponent(
                `مرحباً ${inv.tenant?.name}،\nهذا تذكير بفاتورتك رقم ${inv.no} بمبلغ ${balance} مستحقة بتاريخ ${formatDate(inv.dueDate)}.\nيُرجى سداد المبلغ في أقرب وقت.\nشكراً — نظام Rentrix`
            );
            const cleanPhone = phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
            sent++;
        }
        if (sent > 0) {
            toast.success(`تم فتح واتساب لـ ${sent} مستأجر.`);
        } else {
            toast.error('لا تتوفر أرقام هاتف للمستأجرين المختارين.');
        }
        setSelectedIds(new Set());
    };

    const invoicesWithDetails = useMemo(() => {
        let filteredInvoices = db.invoices;
        if (activeFilter !== 'all') {
            filteredInvoices = db.invoices.filter(inv => {
                if (activeFilter === 'unpaid') return ['UNPAID', 'PARTIALLY_PAID'].includes(inv.status);
                if (activeFilter === 'overdue') return inv.status === 'OVERDUE';
                if (activeFilter === 'paid') return inv.status === 'PAID';
                return true;
            });
        }
        
        if (searchTerm) {
            filteredInvoices = filteredInvoices.filter(inv => {
                const contract = db.contracts.find(c => c.id === inv.contractId);
                const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                return inv.no.includes(searchTerm) || tenant?.name.includes(searchTerm);
            });
        }
    
        return filteredInvoices.map(inv => {
            const contract = db.contracts.find(c => c.id === inv.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
            const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
            return { ...inv, tenant, unit, propertyName: property?.name || '' };
        }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [db.invoices, db.contracts, db.tenants, db.units, db.properties, activeFilter, searchTerm]);

    const currency = settings.operational?.currency ?? 'OMR';

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="مستحقات غير محصلة" value={stats.unpaid} icon={<Clock className="text-amber-500" />} color="amber" />
                <StatCard label="فواتير متأخرة" value={stats.overdue} icon={<AlertCircle className="text-rose-500" />} color="rose" />
                <StatCard label="تحصيلات الشهر" value={stats.collectedThisMonth} icon={<ArrowUpRight className="text-emerald-500" />} color="emerald" />
            </div>

            <Card className="p-0 overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-border gap-4">
                    <div className="flex bg-background/50 p-1 rounded-xl border border-border overflow-x-auto self-start">
                        {filters.map(filter => (
                            <TabButton 
                                key={filter.key}
                                active={activeFilter === filter.key} 
                                onClick={() => handleFilterChange(filter.key)} 
                                label={filter.label} 
                                icon={filter.key === 'overdue' ? <AlertCircle size={14} /> : filter.key === 'paid' ? <CheckCircle2 size={14} /> : <ReceiptText size={14} />}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className="btn btn-primary flex-1 md:flex-none flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                            {isMonthlyLoading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                            إصدار فواتير الإيجار
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                type="text"
                                placeholder="بحث برقم الفاتورة أو اسم المستأجر..."
                                className="w-full pr-10 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenModal()} className="btn btn-secondary flex items-center gap-2">
                                <Plus size={16} /> إضافة فاتورة يدوية
                            </button>
                            <button onClick={() => exportToCsv('فواتير_rentrix', invoicesWithDetails.map(inv => ({
                                'رقم الفاتورة': inv.no,
                                'المستأجر': inv.tenant?.name || '',
                                'الوحدة': inv.unit?.name || '',
                                'العقار': inv.propertyName || '',
                                'النوع': INVOICE_TYPE_AR[inv.type],
                                'تاريخ الاستحقاق': inv.dueDate,
                                'المبلغ': inv.amount,
                                'المدفوع': inv.paidAmount,
                                'المتبقي': inv.amount - inv.paidAmount,
                                'الحالة': INVOICE_STATUS_AR[inv.status],
                            })))} className="btn btn-ghost border border-border flex items-center gap-2">
                                <Download size={16} /> تصدير
                            </button>
                        </div>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                            <span className="text-xs font-black text-primary px-3 py-1 bg-white rounded-full shadow-sm">تم اختيار {selectedIds.size} فاتورة</span>
                            <div className="h-4 w-px bg-primary/20 mx-1"></div>
                            <button onClick={handleBulkMarkOverdue} className="text-xs font-bold text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5">
                                <AlertCircle size={14} /> تعليم كمتأخرة
                            </button>
                            <button onClick={handleBulkSendWhatsApp} className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5">
                                <MessageCircle size={14} /> إرسال واتساب
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-text-muted hover:bg-background px-3 py-1.5 rounded-xl transition-all">إلغاء</button>
                        </div>
                    )}

                    <div className="overflow-x-auto border border-border rounded-2xl">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-background text-text-muted text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-4 w-10">
                                        <button onClick={toggleSelectAll} className="flex items-center justify-center p-2 hover:bg-background rounded-lg transition-all">
                                            {selectedIds.size === invoicesWithDetails.length && invoicesWithDetails.length > 0
                                                ? <CheckSquare size={18} className="text-primary" />
                                                : <Square size={18} className="text-text-muted" />
                                            }
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 font-black">رقم الفاتورة</th>
                                    <th className="px-6 py-4 font-black">المستأجر / الوحدة</th>
                                    <th className="px-6 py-4 font-black">النوع</th>
                                    <th className="px-6 py-4 font-black">تاريخ الاستحقاق</th>
                                    <th className="px-6 py-4 font-black text-left">المبلغ</th>
                                    <th className="px-6 py-4 font-black text-left">المتبقي</th>
                                    <th className="px-6 py-4 font-black text-center">الحالة</th>
                                    <th className="px-6 py-4 font-black text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-card/30">
                                {invoicesWithDetails.map(inv => (
                                    <tr key={inv.id} className={`hover:bg-primary/5 transition-colors group ${selectedIds.has(inv.id) ? 'bg-primary/5' : ''}`}>
                                        <td className="px-4 py-4" onClick={() => toggleSelect(inv.id)}>
                                            <div className="flex items-center justify-center">
                                                {selectedIds.has(inv.id)
                                                    ? <CheckSquare size={18} className="text-primary" />
                                                    : <Square size={18} className="text-text-muted opacity-50 group-hover:opacity-100 transition-opacity" />
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-primary" onClick={() => handleOpenModal(inv)}>{inv.no}</td>
                                        <td className="px-6 py-4" onClick={() => handleOpenModal(inv)}>
                                            <div className="flex flex-col">
                                                <span className="font-bold">{inv.tenant?.name || '—'}</span>
                                                <span className="text-[10px] text-text-muted">{inv.propertyName} — {inv.unit?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold" onClick={() => handleOpenModal(inv)}>{INVOICE_TYPE_AR[inv.type]}</td>
                                        <td className="px-6 py-4 text-text-muted" onClick={() => handleOpenModal(inv)}>{formatDate(inv.dueDate)}</td>
                                        <td className="px-6 py-4 font-bold text-left" dir="ltr" onClick={() => handleOpenModal(inv)}>{formatCurrency(inv.amount, currency)}</td>
                                        <td className="px-6 py-4 font-black text-rose-600 text-left" dir="ltr" onClick={() => handleOpenModal(inv)}>
                                            {inv.amount - inv.paidAmount > 0 ? formatCurrency(inv.amount - inv.paidAmount, currency) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center" onClick={() => handleOpenModal(inv)}>
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${getStatusBadgeClass(inv.status)}`}>
                                                {INVOICE_STATUS_AR[inv.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { try { exportInvoiceToPdf(inv, db); toast.success('تم تصدير PDF'); } catch(e) { toast.error('خطأ'); } }}
                                                    className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl"
                                                    title="تصدير PDF"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                                <button onClick={() => handleOpenModal(inv)} className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl"><Edit2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
            {isModalOpen && <InvoiceForm isOpen={isModalOpen} onClose={handleCloseModal} invoice={editingInvoice} />}
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => {
    const colorClasses: Record<string, string> = {
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    };
    return (
        <div className={`p-4 rounded-2xl border ${colorClasses[color]} flex items-center justify-between shadow-sm hover:shadow-md transition-all`}>
            <div className="flex items-center gap-3">
                <div className="p-3 bg-white/50 rounded-xl shadow-inner">{icon}</div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                    <p className="text-xl font-black" dir="ltr">{formatCurrency(value)}</p>
                </div>
            </div>
            <div className="opacity-10"><ArrowUpRight size={40} /></div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            active ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text hover:bg-background'
        }`}
    >
        {icon}
        {label}
    </button>
);

const InvoiceForm: React.FC<{ isOpen: boolean, onClose: () => void, invoice: Invoice | null }> = ({ isOpen, onClose, invoice }) => {
    const { db, dataService } = useApp();
    const [unitId, setUnitId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [amount, setAmount] = useState(0);
    const [type, setType] = useState<Invoice['type']>('UTILITY');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const isReadOnly = invoice && (invoice.type === 'RENT' || invoice.type === 'LATE_FEE');

    const unitsWithProperties = useMemo(() => {
        return db.units.map(u => {
            const property = db.properties.find(p => p.id === u.propertyId);
            return { ...u, propertyName: property?.name || '' };
        }).sort((a,b) => a.propertyName.localeCompare(b.propertyName) || a.name.localeCompare(b.name));
    }, [db.units, db.properties]);
    
    const activeContractForUnit = useMemo(() => {
        if (!unitId) return null;
        return db.contracts.find(c => c.unitId === unitId && c.status === 'ACTIVE');
    }, [unitId, db.contracts]);

    useEffect(() => {
        if (isOpen) {
            if (invoice) {
                const contract = db.contracts.find(c => c.id === invoice.contractId);
                setUnitId(contract?.unitId || '');
                setDueDate(invoice.dueDate);
                setAmount(invoice.amount);
                setType(invoice.type);
                setNotes(invoice.notes);
            } else {
                setUnitId(unitsWithProperties[0]?.id || '');
                setDueDate(new Date().toISOString().slice(0, 10));
                setAmount(0);
                setType('UTILITY');
                setNotes('');
            }
        }
    }, [isOpen, invoice, unitsWithProperties, db.contracts]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (isSavingRef.current) return;
        if (!unitId || amount <= 0) { toast.error("بيانات غير مكتملة."); return; }
        if (!activeContractForUnit) { toast.error("الوحدة شاغرة حالياً."); return; }

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = {
                contractId: activeContractForUnit.id,
                dueDate,
                amount,
                paidAmount: invoice ? invoice.paidAmount : 0,
                status: invoice ? invoice.status : 'UNPAID',
                type,
                notes,
            };
            if (invoice) await dataService.update('invoices', invoice.id, data); else await dataService.add('invoices', data);
            onClose();
        } finally { isSavingRef.current = false; setIsSaving(false); }
    }, [isReadOnly, unitId, amount, activeContractForUnit, dueDate, invoice, type, notes, dataService, onClose]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isReadOnly ? "تفاصيل الفاتورة" : (invoice ? "تعديل الفاتورة" : "إنشاء فاتورة يدوية")}>
            <form onSubmit={handleSubmit} className="space-y-6 p-1">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">الوحدة العقارية</label>
                    <select value={unitId} onChange={e => setUnitId(e.target.value)} required disabled={isReadOnly}>
                        <option value="">-- اختر الوحدة --</option>
                        {unitsWithProperties.map(u => (
                            <option key={u.id} value={u.id}>{u.propertyName} - {u.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">نوع الفاتورة</label>
                        <select value={type} onChange={e => setType(e.target.value as Invoice['type'])} disabled={isReadOnly}>
                            <option value="RENT">إيجار</option>
                            <option value="UTILITY">خدمات (كهرباء/ماء)</option>
                            <option value="MAINTENANCE">صيانة</option>
                            <option value="LATE_FEE">رسوم تأخير</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">تاريخ الاستحقاق</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required disabled={isReadOnly} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">المبلغ الإجمالي</label>
                    <NumberInput value={amount} onChange={setAmount} required disabled={isReadOnly} className="text-2xl font-black text-primary" />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">ملاحظات الفاتورة</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="اكتب تفاصيل إضافية تظهر في الفاتورة..." required disabled={isReadOnly} />
                </div>

                {!isReadOnly && (
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="btn btn-ghost flex-1 py-3" disabled={isSaving}>إلغاء</button>
                        <button type="submit" className="btn btn-primary flex-1 py-3 shadow-lg shadow-primary/20" disabled={isSaving || !activeContractForUnit}>
                            {isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default Invoices;
