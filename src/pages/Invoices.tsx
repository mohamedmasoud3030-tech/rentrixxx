import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice } from '../types';
import Card from '../components/ui/Card';
import { formatCurrency, exportToCsv, INVOICE_STATUS_AR, INVOICE_TYPE_AR } from '../utils/helpers';
import { AlertCircle, Clock, ArrowUpRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { exportInvoiceToPdf } from '../services/pdfService';
import { StatCard } from '../components/invoices/StatCard';
import { QuickPayModal } from '../components/invoices/QuickPayModal';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { InvoiceFilters } from '../components/invoices/InvoiceFilters';
import { InvoiceTable } from '../components/invoices/InvoiceTable';
import { useInvoiceFilters, useInvoiceStats } from '../hooks';
import {
    getInvoiceTotal,
    getInvoiceRemaining,
    getEffectiveStatus,
    filterInvoiceByStatus,
    filterInvoiceByType,
    filterInvoiceByDate,
    filterInvoiceBySearch,
} from '../utils/invoices/invoiceCalculations';

const Invoices: React.FC = () => {
    const { db, financeService, settings, dataService } = useApp();
    const location = useLocation();
    const { filters, setFilters } = useInvoiceFilters();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [quickPayInvoice, setQuickPayInvoice] = useState<Invoice | null>(null);
    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

    // Handle filter from URL parameter
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filterParam = params.get('filter');
        if (filterParam && ['all', 'unpaid', 'overdue', 'paid'].includes(filterParam)) {
            setFilters(prev => ({ ...prev, status: filterParam as any }));
        }
    }, [location.search]);

    const graceDays = settings.operational?.lateFee?.graceDays ?? 0;

    const invoicesWithDetails = useMemo(() => {
        let filtered = db.invoices;
        
        // Apply filters using utility functions
        filtered = filterInvoiceByStatus(filtered, filters.status as any, (inv) => getEffectiveStatus(inv, graceDays), graceDays);
        filtered = filterInvoiceByType(filtered, filters.type as any);
        filtered = filterInvoiceByDate(filtered, filters.dateFrom, filters.dateTo);
        filtered = filterInvoiceBySearch(filtered, filters.search, db.contracts, db.tenants);

        // Enrich with details
        return filtered
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
                    effectiveStatus: getEffectiveStatus(inv, graceDays),
                };
            })
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [db.invoices, db.contracts, db.tenants, db.units, db.properties, filters, graceDays]);

    const stats = useInvoiceStats(db.invoices, db.receipts, graceDays);

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
                    onFiltersChange={setFilters}
                    isMonthlyLoading={isMonthlyLoading}
                    onGenerateInvoices={handleGenerateInvoices}
                    onAddManual={() => setIsModalOpen(true)}
                    onBulkWhatsApp={handleBulkSendWhatsApp}
                    invoicesWithDetails={invoicesWithDetails}
                />

                {/* Table */}
                <InvoiceTable
                    invoices={invoicesWithDetails}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onQuickPay={setQuickPayInvoice}
                    onEdit={(inv) => {
                        setEditingInvoice(inv);
                        setIsModalOpen(true);
                    }}
                    currency={currency}
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
        </div>
    );
};

export default Invoices;
