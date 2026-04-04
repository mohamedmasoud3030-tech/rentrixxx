import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Invoice } from '../types';
import Card from '../components/ui/Card';
import { formatCurrency } from '../utils/helpers';
import { AlertCircle, ArrowUpRight, Clock, RefreshCw, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
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
  getEffectiveStatus,
  filterInvoiceByStatus,
  filterInvoiceByType,
  filterInvoiceByDate,
  filterInvoiceBySearch,
} from '../utils/invoices/invoiceCalculations';

const MONTHLY_LAST_RUN_KEY = 'invoices.automation.monthly.lastRun';
const MONTHLY_LAST_COUNT_KEY = 'invoices.automation.monthly.lastCount';
const LATE_FEES_LAST_RUN_KEY = 'invoices.automation.lateFees.lastRun';
const LATE_FEES_LAST_COUNT_KEY = 'invoices.automation.lateFees.lastCount';

const Invoices: React.FC = () => {
  const { db, financeService, settings, dataService } = useApp();
  const location = useLocation();
  const { filters, setFilters } = useInvoiceFilters();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickPayInvoice, setQuickPayInvoice] = useState<Invoice | null>(null);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [isLateFeeLoading, setIsLateFeeLoading] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  const [monthlyLastRun, setMonthlyLastRun] = useState<string | null>(() => localStorage.getItem(MONTHLY_LAST_RUN_KEY));
  const [monthlyLastCount, setMonthlyLastCount] = useState<number | null>(() => {
    const value = localStorage.getItem(MONTHLY_LAST_COUNT_KEY);
    return value === null ? null : Number(value);
  });
  const [lateFeesLastRun, setLateFeesLastRun] = useState<string | null>(() => localStorage.getItem(LATE_FEES_LAST_RUN_KEY));
  const [lateFeesLastCount, setLateFeesLastCount] = useState<number | null>(() => {
    const value = localStorage.getItem(LATE_FEES_LAST_COUNT_KEY);
    return value === null ? null : Number(value);
  });

  const graceDays = settings.operational?.lateFee?.graceDays ?? 0;

  const getEffectiveInvoiceStatus = useCallback(
    (invoice: Invoice): Invoice['status'] => getEffectiveStatus(invoice, graceDays),
    [graceDays],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    if (filterParam && ['all', 'unpaid', 'overdue', 'paid'].includes(filterParam)) {
      setFilters(prev => ({ ...prev, status: filterParam as any }));
    }
  }, [location.search, setFilters]);

  const invoicesWithDetails = useMemo(() => {
    const invoices = db.invoices || [];
    let filtered = invoices;

    filtered = filterInvoiceByStatus(filtered, filters.status as any, getEffectiveInvoiceStatus, graceDays);
    filtered = filterInvoiceByType(filtered, filters.type as any);
    filtered = filterInvoiceByDate(filtered, filters.dateFrom, filters.dateTo);
    filtered = filterInvoiceBySearch(filtered, filters.search, db.contracts || [], db.tenants || []);

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
          effectiveStatus: getEffectiveInvoiceStatus(inv),
        };
      })
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [db, filters, getEffectiveInvoiceStatus, graceDays]);

  const financialStats = useMemo(() => {
    const invoices = db.invoices || [];
    const receipts = db.receipts || [];
    const unpaid = invoices
      .filter(i => ['UNPAID', 'PARTIALLY_PAID'].includes(getEffectiveInvoiceStatus(i)))
      .reduce((s, i) => s + getInvoiceRemaining(i), 0);
    const overdue = invoices
      .filter(i => getEffectiveInvoiceStatus(i) === 'OVERDUE')
      .reduce((s, i) => s + getInvoiceRemaining(i), 0);
    const month = new Date().toISOString().slice(0, 7);
    const collectedThisMonth = receipts
      .filter(r => r.status === 'POSTED' && r.dateTime.startsWith(month))
      .reduce((s, r) => s + r.amount, 0);
    return { unpaid, overdue, collectedThisMonth };
  }, [db.invoices, db.receipts, getEffectiveInvoiceStatus]);

  const invoiceStatusCounts = useMemo(() => {
    const invoices = db.invoices || [];
    return invoices.reduce(
      (acc, invoice) => {
        const status = getEffectiveInvoiceStatus(invoice);
        acc.total += 1;
        if (status === 'UNPAID') acc.unpaid += 1;
        if (status === 'OVERDUE') acc.overdue += 1;
        if (status === 'PARTIALLY_PAID') acc.partiallyPaid += 1;
        if (status === 'PAID') acc.paid += 1;
        return acc;
      },
      { total: 0, unpaid: 0, overdue: 0, partiallyPaid: 0, paid: 0 },
    );
  }, [db.invoices, getEffectiveInvoiceStatus]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleBulkSendWhatsApp = useCallback(() => {
    const selected = invoicesWithDetails.filter(i => selectedIds.has(i.id)).filter(i => i.effectiveStatus === 'OVERDUE');

    if (selected.length === 0) {
      toast.error('اختر فواتير متأخرة أولاً.');
      return;
    }

    let sent = 0;
    for (const inv of selected) {
      const phone = inv.tenant?.phone;
      if (!phone) continue;
      const msg = encodeURIComponent(
        `مرحباً ${inv.tenant?.name}،\nتذكير: فاتورتك رقم ${inv.no} متأخرة بمبلغ ${formatCurrency(inv.remaining, settings.operational?.currency ?? 'OMR')}.`,
      );
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
      sent += 1;
    }

    sent ? toast.success(`تم فتح واتساب لـ ${sent} مستأجر.`) : toast.error('لا توجد أرقام صالحة.');

    setSelectedIds(new Set());
  }, [invoicesWithDetails, selectedIds, settings.operational?.currency]);

  const handleGenerateInvoices = useCallback(async () => {
    setIsMonthlyLoading(true);
    try {
      const count = await financeService.generateMonthlyInvoices();
      const runAt = new Date().toISOString();
      localStorage.setItem(MONTHLY_LAST_RUN_KEY, runAt);
      localStorage.setItem(MONTHLY_LAST_COUNT_KEY, String(count));
      setMonthlyLastRun(runAt);
      setMonthlyLastCount(count);
      toast.success(`تم إنشاء ${count} فواتير.`);
    } finally {
      setIsMonthlyLoading(false);
    }
  }, [financeService]);

  const handleGenerateLateFees = useCallback(async () => {
    setIsLateFeeLoading(true);
    try {
      const count = await financeService.generateLateFees();
      const runAt = new Date().toISOString();
      localStorage.setItem(LATE_FEES_LAST_RUN_KEY, runAt);
      localStorage.setItem(LATE_FEES_LAST_COUNT_KEY, String(count));
      setLateFeesLastRun(runAt);
      setLateFeesLastCount(count);
      toast.success(`تم تطبيق رسوم التأخير على ${count} فاتورة.`);
    } finally {
      setIsLateFeeLoading(false);
    }
  }, [financeService]);

  const handleDeleteInvoice = useCallback(async () => {
    if (!deletingInvoice) return;

    try {
      await dataService.delete('invoices', deletingInvoice.id);
      toast.success('تم حذف الفاتورة بنجاح');
      setDeletingInvoice(null);
    } catch (error) {
      toast.error('حدث خطأ عند حذف الفاتورة');
      console.error(error);
    }
  }, [deletingInvoice, dataService]);

  const formatRunTime = (value: string | null) => {
    if (!value) return 'لم يتم التشغيل بعد';
    return new Date(value).toLocaleString('ar-OM');
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border border-outline-variant/40 bg-surface-container-low/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-sm font-black">لوحة أتمتة الفواتير</h2>
            <p className="text-xs text-text-muted mt-1">تشغيل أدوات الأتمتة الشهرية ورسوم التأخير مع تتبع آخر تنفيذ.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleGenerateInvoices} disabled={isMonthlyLoading} className="btn btn-primary flex items-center gap-2">
              {isMonthlyLoading ? <RefreshCw size={16} className="animate-spin" /> : <Clock size={16} />}
              توليد فواتير الشهر الحالي
            </button>
            <button onClick={handleGenerateLateFees} disabled={isLateFeeLoading} className="btn btn-secondary flex items-center gap-2">
              {isLateFeeLoading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
              تطبيق رسوم التأخير
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl border border-outline-variant/40 p-3 bg-background/40">
            <p className="text-xs font-bold">آخر تشغيل لتوليد فواتير الشهر</p>
            <p className="text-xs text-text-muted mt-1">{formatRunTime(monthlyLastRun)}</p>
            <p className="text-sm font-black mt-2">{monthlyLastCount === null ? 'لا توجد نتيجة بعد' : `تم إنشاء ${monthlyLastCount} فواتير`}</p>
          </div>
          <div className="rounded-xl border border-outline-variant/40 p-3 bg-background/40">
            <p className="text-xs font-bold">آخر تشغيل لرسوم التأخير</p>
            <p className="text-xs text-text-muted mt-1">{formatRunTime(lateFeesLastRun)}</p>
            <p className="text-sm font-black mt-2">{lateFeesLastCount === null ? 'لا توجد نتيجة بعد' : `تم تطبيق الرسوم على ${lateFeesLastCount} فواتير`}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 border border-outline-variant/40 bg-surface-container-low/50">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
          <div className="rounded-lg bg-background/50 py-2"><p className="text-[11px] text-text-muted">إجمالي</p><p className="font-black">{invoiceStatusCounts.total}</p></div>
          <div className="rounded-lg bg-background/50 py-2"><p className="text-[11px] text-text-muted">غير مدفوعة</p><p className="font-black">{invoiceStatusCounts.unpaid}</p></div>
          <div className="rounded-lg bg-background/50 py-2"><p className="text-[11px] text-text-muted">متأخرة</p><p className="font-black">{invoiceStatusCounts.overdue}</p></div>
          <div className="rounded-lg bg-background/50 py-2"><p className="text-[11px] text-text-muted">مدفوعة جزئياً</p><p className="font-black">{invoiceStatusCounts.partiallyPaid}</p></div>
          <div className="rounded-lg bg-background/50 py-2"><p className="text-[11px] text-text-muted">مدفوعة</p><p className="font-black">{invoiceStatusCounts.paid}</p></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="مستحقات غير محصلة" value={financialStats.unpaid} icon={<Clock className="text-amber-500" />} color="amber" />
        <StatCard title="فواتير متأخرة" value={financialStats.overdue} icon={<AlertCircle className="text-rose-500" />} color="rose" />
        <StatCard title="تحصيلات الشهر" value={financialStats.collectedThisMonth} icon={<ArrowUpRight className="text-emerald-500" />} color="emerald" />
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl bg-surface-container-low/50">
        <InvoiceFilters
          filters={filters}
          onStatusChange={(status) => setFilters(prev => ({ ...prev, status }))}
          onTypeChange={(type) => setFilters(prev => ({ ...prev, type }))}
          onSearchChange={(search) => setFilters(prev => ({ ...prev, search }))}
          onDateFromChange={(dateFrom) => setFilters(prev => ({ ...prev, dateFrom }))}
          onDateToChange={(dateTo) => setFilters(prev => ({ ...prev, dateTo }))}
          onGenerateInvoices={handleGenerateInvoices}
          onAddManualInvoice={() => setIsModalOpen(true)}
          onSendWhatsApp={handleBulkSendWhatsApp}
          onExport={() => undefined}
          invoices={invoicesWithDetails}
          isLoadingMonths={isMonthlyLoading}
        />

        <InvoiceTable
          invoices={invoicesWithDetails}
          selectedIds={selectedIds}
          onSelectToggle={toggleSelect}
          onQuickPay={setQuickPayInvoice as any}
          onEdit={(inv) => {
            setEditingInvoice(inv as Invoice);
            setIsModalOpen(true);
          }}
          onDelete={(inv) => setDeletingInvoice(inv as Invoice)}
          db={db}
        />
      </Card>

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
