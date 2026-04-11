import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice } from '../types';
import Card from '../components/ui/Card';
import { formatCurrency, getEffectiveInvoiceStatus } from '../utils/helpers';
import { AlertCircle, Clock, ArrowUpRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { StatCard } from '../components/invoices/StatCard';
import { QuickPayModal } from '../components/invoices/QuickPayModal';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { InvoiceFilters } from '../components/invoices/InvoiceFilters';
import { InvoiceTable } from '../components/invoices/InvoiceTable';
import { DeleteConfirmationModal } from '../components/shared/DeleteConfirmationModal';
import { useInvoiceFilters } from '../hooks';
import {
    getInvoiceTotal,
    getInvoiceRemaining,
    filterInvoiceByStatus,
    filterInvoiceByType,
    filterInvoiceByDate,
    filterInvoiceBySearch,
} from '../utils/invoices/invoiceCalculations';

const Invoices: React.FC = () => {
    const { db, financeService, settings, dataService } = useApp();
    const location = useLocation();
    const { filters, updateStatus, updateType, updateSearch, updateDateRange } = useInvoiceFilters();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [quickPayInvoice, setQuickPayInvoice] = useState<Invoice | null>(null);
    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

    const getEffectiveStatus = useCallback((invoice: Invoice): Invoice['status'] => {
        const graceDays = settings.operational?.lateFee?.graceDays ?? 0;
        return getEffectiveInvoiceStatus(invoice, graceDays);
    }, [settings.operational?.lateFee?.graceDays]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filterParam = params.get('filter');
        if (filterParam && ['all', 'unpaid', 'overdue', 'paid'].includes(filterParam)) {
            updateStatus(filterParam as any);
        }
    }, [location.search, updateStatus]);

    const graceDays = settings.operational?.lateFee?.graceDays ?? 0;

    const invoicesWithDetails = useMemo(() => {
        const invoices = db.invoices || [];
        let filtered = invoices;
        
        // Apply filters using utility functions
        filtered = filterInvoiceByStatus(filtered, filters.status as any, (inv) => getEffectiveStatus(inv), graceDays);
        filtered = filterInvoiceByType(filtered, filters.type as any);
        filtered = filterInvoiceByDate(filtered, filters.dateFrom, filters.dateTo);
        filtered = filterInvoiceBySearch(filtered, filters.search, db.contracts || [], db.tenants || []);

        // Enrich with details
        return filtered
            .map(inv => {
                const contracts = db.contracts || [];
                const tenants = db.tenants || [];
                const units = db.units || [];
                const properties = db.properties || [];
                const contract = contracts.find(c => c.id === inv.contractId);
                const tenant = contract ? tenants.find(t => t.id === contract.tenantId) : null;
                const unit = contract ? units.find(u => u.id === contract.unitId) : null;
                const property = unit ? properties.find(p => p.id === unit.propertyId) : null;
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
    }, [db, filters, getEffectiveStatus]);

    const stats = useMemo(() => {
        const unpaid = db.invoices.filter(i => ['UNPAID', 'PARTIALLY_PAID'].includes(getEffectiveStatus(i))).reduce((s, i) => s + getInvoiceRemaining(i), 0);
        const overdue = db.invoices.filter(i => getEffectiveStatus(i) === 'OVERDUE').reduce((s, i) => s + getInvoiceRemaining(i), 0);
        const month = new Date().toISOString().slice(0, 7);
        const collectedThisMonth = db.receipts
            .filter(r => r.status === 'POSTED' && r.dateTime.startsWith(month))
            .reduce((s, r) => s + r.amount, 0);
        return { unpaid, overdue, collectedThisMonth };
    }, [db.invoices, db.receipts, getEffectiveStatus]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleBulkSendWhatsApp = useCallback(() => {
        const selected = invoicesWithDetails
            .filter(i => selectedIds.has(i.id))
            .filter(i => i.effectiveStatus === 'OVERDUE');
        
        if (selected.length === 0) {
            toast.error('اختر فواتير متأخرة أولاً.');
            return;
        }

        let sent = 0;
        for (const inv of selected) {
            const phone = inv.tenant?.phone;
            if (!phone) continue;
            const msg = encodeURIComponent(
                `مرحباً ${inv.tenant?.name}،\nتذكير: فاتورتك رقم ${inv.no} متأخرة بمبلغ ${formatCurrency(inv.remaining, settings.operational?.currency ?? 'OMR')}.`
            );
            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
            sent++;
        }

        sent
            ? toast.success(`تم فتح واتساب لـ ${sent} مستأجر.`)
            : toast.error('لا توجد أرقام صالحة.');
        
        setSelectedIds(new Set());
    }, [invoicesWithDetails, selectedIds, settings.operational?.currency]);

    const handleGenerateInvoices = useCallback(async () => {
        setIsMonthlyLoading(true);
        try {
            const count = await financeService.generateMonthlyInvoices();
            toast.success(`تم إصدار ${count} فاتورة جديدة.`);
        } finally {
            setIsMonthlyLoading(false);
        }
    }, [financeService]);

    const handleDeleteInvoice = useCallback(async () => {
        if (!deletingInvoice) return;
        
        try {
            await dataService.remove('invoices', deletingInvoice.id);
            toast.success('تم حذف الفاتورة بنجاح');
            setDeletingInvoice(null);
        } catch (error) {
            toast.error('حدث خطأ عند حذف الفاتورة');
            console.error(error);
        }
    }, [deletingInvoice, dataService]);

    const currency = settings.operational?.currency ?? 'OMR';

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="مستحقات غير محصلة"
                    value={stats.unpaid}
                    icon={<Clock className="text-amber-500" />}
                    color="amber"
                />
                <StatCard
                    label="فواتير متأخرة"
                    value={stats.overdue}
                    icon={<AlertCircle className="text-rose-500" />}
                    color="rose"
                />
                <StatCard
                    label="تحصيلات الشهر"
                    value={stats.collectedThisMonth}
                    icon={<ArrowUpRight className="text-emerald-500" />}
                    color="emerald"
                />
            </div>

            {/* Main Card */}
            <Card className="p-0 overflow-hidden border-none shadow-xl bg-card/50">
                {/* Filters */}
                <InvoiceFilters
                    filters={filters}
                    onStatusChange={updateStatus as any}
                    onTypeChange={updateType as any}
                    onSearchChange={updateSearch}
                    onDateFromChange={(value) => updateDateRange(value, filters.dateTo)}
                    onDateToChange={(value) => updateDateRange(filters.dateFrom, value)}
                    onGenerateInvoices={handleGenerateInvoices}
                    onAddManualInvoice={() => setIsModalOpen(true)}
                    onSendWhatsApp={handleBulkSendWhatsApp}
                    onExport={() => undefined}
                    invoices={invoicesWithDetails as any}
                    isLoadingMonths={isMonthlyLoading}
                />

                {/* Table */}
                <InvoiceTable
                    invoices={invoicesWithDetails}
                    selectedIds={selectedIds}
                    onSelectToggle={toggleSelect}
                    onQuickPay={(inv) => {
                        const rawInvoice = db.invoices.find((row) => row.id === inv.id);
                        if (rawInvoice) setQuickPayInvoice(rawInvoice);
                    }}
                    onEdit={(inv) => {
                        const rawInvoice = db.invoices.find((row) => row.id === inv.id) || null;
                        setEditingInvoice(rawInvoice);
                        setIsModalOpen(true);
                    }}
                    onDelete={(inv) => setDeletingInvoice(inv as any)}
                    db={db}
                />
            </Card>

            {/* Modals */}
            {isModalOpen && (
                <InvoiceForm
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingInvoice(null);
                    }}
                    invoice={editingInvoice}
                />
            )}
            {quickPayInvoice && (
                <QuickPayModal
                    invoice={quickPayInvoice}
                    onClose={() => setQuickPayInvoice(null)}
                    onSaved={async (amount, channel) => {
                        try {
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
                        } catch (error) {
                            toast.error('حدث خطأ عند تسجيل الدفعة');
                            console.error(error);
                        }
                    }}
                />
            )}
            <DeleteConfirmationModal
                isOpen={!!deletingInvoice}
                title="حذف الفاتورة"
                message={`هل أنت متأكد من رغبتك في حذف الفاتورة رقم ${deletingInvoice?.no}؟ لا يمكن التراجع عن هذا الإجراء.`}
                onConfirm={handleDeleteInvoice}
                onCancel={() => setDeletingInvoice(null)}
            />
        </div>
    );
};

export default Invoices;
