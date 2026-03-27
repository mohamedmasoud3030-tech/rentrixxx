
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice, Unit } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, getStatusBadgeClass, exportToCsv, INVOICE_STATUS_AR, INVOICE_TYPE_AR } from '../utils/helpers';
import { ReceiptText, RefreshCw, Download, CheckSquare, Square, CheckCircle, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Invoices: React.FC = () => {
    // FIX: Use financeService for financial operations
    const { db, financeService, settings, dataService } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isLateFeeLoading, setIsLateFeeLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    const handleGenerateInvoices = async () => {
        setIsMonthlyLoading(true);
        // FIX: Use financeService for financial operations
        const count = await financeService.generateMonthlyInvoices();
        toast.success(`تم إصدار ${count} فاتورة جديدة بنجاح.`);
        setIsMonthlyLoading(false);
    };

    const handleGenerateLateFees = async () => {
        setIsLateFeeLoading(true);
        // FIX: Use financeService for financial operations
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

    const handleBulkExport = () => {
        const selected = invoicesWithDetails.filter(i => selectedIds.has(i.id));
        const rows = selected.map(inv => ({
            'رقم الفاتورة': inv.no,
            'المستأجر': inv.tenant?.name || '',
            'الوحدة': inv.unit?.name || '',
            'النوع': getInvoiceTypeLabel(inv.type),
            'تاريخ الاستحقاق': inv.dueDate,
            'المبلغ': inv.amount,
            'المدفوع': inv.paidAmount,
            'الرصيد': inv.amount - inv.paidAmount,
            'الحالة': getInvoiceStatusLabel(inv.status),
        }));
        exportToCsv('فواتير_مختارة_rentrix', rows);
        toast.success(`تم تصدير ${rows.length} فاتورة.`);
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
    
        return filteredInvoices.map(inv => {
            const contract = db.contracts.find(c => c.id === inv.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
            return { ...inv, tenant, unit };
        }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [db.invoices, db.contracts, db.tenants, db.units, activeFilter]);

    const getInvoiceStatusLabel = (status: Invoice['status']) => INVOICE_STATUS_AR[status] || status;
    const getInvoiceTypeLabel = (type: Invoice['type']) => INVOICE_TYPE_AR[type] || type;

    const currency = settings.operational?.currency ?? 'OMR';

    const handleExportCsv = () => {
        const rows = invoicesWithDetails.map(inv => ({
            'رقم الفاتورة': inv.no,
            'المستأجر': inv.tenant?.name || '',
            'الوحدة': inv.unit?.name || '',
            'النوع': getInvoiceTypeLabel(inv.type),
            'تاريخ الاستحقاق': inv.dueDate,
            'المبلغ': inv.amount,
            'المدفوع': inv.paidAmount,
            'الرصيد': inv.amount - inv.paidAmount,
            'الحالة': getInvoiceStatusLabel(inv.status),
        }));
        exportToCsv('فواتير_rentrix', rows);
    };
    
    return (
        <Card>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ReceiptText />
                    الفواتير
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleOpenModal()} className="btn btn-secondary">
                        إضافة فاتورة يدوية
                    </button>
                    {settings.operational?.lateFee?.isEnabled && (
                         <button onClick={handleGenerateLateFees} disabled={isLateFeeLoading} className="btn btn-warning">
                            {isLateFeeLoading ? 'جاري...' : 'توليد رسوم التأخير'}
                        </button>
                    )}
                    <button onClick={handleExportCsv} className="btn btn-secondary">
                        <Download size={15} />
                        تصدير CSV
                    </button>
                    <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className="btn btn-primary flex items-center gap-2">
                        {isMonthlyLoading && <RefreshCw size={16} className="animate-spin" />}
                        {isMonthlyLoading ? 'جاري الإصدار...' : 'إصدار فواتير الإيجار'}
                    </button>
                </div>
            </div>
            <div className="border-b border-border mb-4">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    {filters.map(filter => (
                         <button
                            key={filter.key}
                            onClick={() => handleFilterChange(filter.key)}
                            className={`${activeFilter === filter.key ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </nav>
            </div>
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 mb-3 p-3 bg-primary/10 border border-primary/30 rounded-lg flex-wrap">
                    <span className="text-sm font-medium text-primary">تم اختيار {selectedIds.size} فاتورة</span>
                    <button onClick={handleBulkMarkOverdue} className="btn btn-warning text-xs flex items-center gap-1">
                        <CheckCircle size={13} />
                        تعليم كمتأخرة
                    </button>
                    <button onClick={handleBulkSendWhatsApp} className="btn btn-success text-xs flex items-center gap-1">
                        <MessageCircle size={13} />
                        إرسال واتساب
                    </button>
                    <button onClick={handleBulkExport} className="btn btn-secondary text-xs flex items-center gap-1">
                        <Download size={13} />
                        تصدير CSV
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="btn btn-secondary text-xs">
                        إلغاء التحديد
                    </button>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="text-xs uppercase bg-background text-text">
                        <tr>
                            <th scope="col" className="px-3 py-3 border border-border w-10">
                                <button onClick={toggleSelectAll} className="flex items-center justify-center w-full">
                                    {selectedIds.size === invoicesWithDetails.length && invoicesWithDetails.length > 0
                                        ? <CheckSquare size={16} className="text-primary" />
                                        : <Square size={16} className="text-text-muted" />
                                    }
                                </button>
                            </th>
                            <th scope="col" className="px-6 py-3 border border-border">رقم الفاتورة</th>
                            <th scope="col" className="px-6 py-3 border border-border">المستأجر / الوحدة</th>
                            <th scope="col" className="px-6 py-3 border border-border">النوع</th>
                            <th scope="col" className="px-6 py-3 border border-border">تاريخ الاستحقاق</th>
                            <th scope="col" className="px-6 py-3 border border-border">المبلغ</th>
                            <th scope="col" className="px-6 py-3 border border-border">الرصيد</th>
                            <th scope="col" className="px-6 py-3 border border-border">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoicesWithDetails.map(inv => (
                            <tr key={inv.id} className={`hover:bg-background cursor-pointer ${selectedIds.has(inv.id) ? 'bg-primary/5' : 'bg-card'}`}>
                                <td className="px-3 py-4 border border-border" onClick={() => toggleSelect(inv.id)}>
                                    <div className="flex items-center justify-center">
                                        {selectedIds.has(inv.id)
                                            ? <CheckSquare size={16} className="text-primary" />
                                            : <Square size={16} className="text-text-muted" />
                                        }
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono border border-border" onClick={() => handleOpenModal(inv)}>{inv.no}</td>
                                <td className="px-6 py-4 border border-border" onClick={() => handleOpenModal(inv)}>{inv.tenant?.name} / {inv.unit?.name}</td>
                                <td className="px-6 py-4 border border-border" onClick={() => handleOpenModal(inv)}>{getInvoiceTypeLabel(inv.type)}</td>
                                <td className="px-6 py-4 border border-border" onClick={() => handleOpenModal(inv)}>{formatDate(inv.dueDate)}</td>
                                <td className="px-6 py-4 border border-border" onClick={() => handleOpenModal(inv)}>{formatCurrency(inv.amount, currency)}</td>
                                <td className="px-6 py-4 font-bold text-red-500 border border-border" onClick={() => handleOpenModal(inv)}>{formatCurrency(inv.amount - inv.paidAmount, currency)}</td>
                                <td className="px-6 py-4 border border-border" onClick={() => handleOpenModal(inv)}>
                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(inv.status)}`}>
                                        {getInvoiceStatusLabel(inv.status)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <InvoiceForm isOpen={isModalOpen} onClose={handleCloseModal} invoice={editingInvoice} />
        </Card>
    );
};


const InvoiceForm: React.FC<{ isOpen: boolean, onClose: () => void, invoice: Invoice | null }> = ({ isOpen, onClose, invoice }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [unitId, setUnitId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [amount, setAmount] = useState(0);
    const [type, setType] = useState<Invoice['type']>('UTILITY');
    const [notes, setNotes] = useState('');

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!unitId || amount <= 0) {
            toast.error("يرجى تحديد الوحدة وإدخال مبلغ صحيح.");
            return;
        }
        if (!activeContractForUnit) {
            toast.error("لا يمكن إنشاء فاتورة لوحدة شاغرة. لإضافة تكاليف على المالك، يرجى إنشاء 'مصروف' من قسم المالية.");
            return;
        }
        
        const data = {
            contractId: activeContractForUnit.id,
            dueDate,
            amount,
            paidAmount: invoice ? invoice.paidAmount : 0,
            status: invoice ? invoice.status : 'UNPAID',
            type,
            notes,
        };

        if (invoice) {
            await dataService.update('invoices', invoice.id, data);
        } else {
            await dataService.add('invoices', data);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isReadOnly ? "عرض تفاصيل الفاتورة" : (invoice ? "تعديل فاتورة" : "إضافة فاتورة يدوية")}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {invoice && !isReadOnly && <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">لتعديل تاريخ استحقاق هذه الفاتورة، قم بتغيير حقل التاريخ واحفظ التغييرات.</p>}
                <div>
                    <label className="block text-sm font-medium mb-1">الوحدة</label>
                    <select value={unitId} onChange={e => setUnitId(e.target.value)} required disabled={isReadOnly}>
                        <option value="">-- اختر الوحدة --</option>
                        {unitsWithProperties.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.propertyName} - {u.name}
                            </option>
                        ))}
                    </select>
                     {unitId && !activeContractForUnit && !isReadOnly && (
                        <p className="text-xs text-red-500 mt-1">هذه الوحدة شاغرة. لا يمكن إنشاء فاتورة. لإضافة تكلفة على المالك، أنشئ مصروفاً.</p>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع الفاتورة</label>
                        <select value={type} onChange={e => setType(e.target.value as Invoice['type'])} disabled={isReadOnly}>
                            <option value="UTILITY">خدمات</option>
                            <option value="MAINTENANCE">صيانة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">المبلغ</label>
                        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} required disabled={isReadOnly} />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">تاريخ الاستحقاق</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required disabled={isReadOnly} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">ملاحظات (مثال: فاتورة كهرباء شهر يونيو)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} required disabled={isReadOnly} />
                </div>

                {!isReadOnly && (
                    <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                        <button type="submit" className="btn btn-primary" disabled={!activeContractForUnit}>حفظ</button>
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default Invoices;