import React from 'react';
import { Search, Plus, MessageCircle, Download, RefreshCw } from 'lucide-react';
import { InvoiceFiltersState } from '../../utils/invoices/types';
import { exportToCsv, INVOICE_STATUS_AR, INVOICE_TYPE_AR } from '../../utils/helpers';
import { InvoiceWithDetails } from '../../utils/invoices/types';

interface InvoiceFiltersProps {
  filters: InvoiceFiltersState;
  onStatusChange: (status: 'all' | 'unpaid' | 'overdue' | 'paid') => void;
  onTypeChange: (type: 'all' | 'RENT' | 'LATE_FEE' | 'UTILITY' | 'OTHER') => void;
  onSearchChange: (search: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onGenerateInvoices: () => void;
  onAddManualInvoice: () => void;
  onSendWhatsApp: () => void;
  onExport: (data: any[]) => void;
  invoices: InvoiceWithDetails[];
  isLoadingMonths?: boolean;
}

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  filters,
  onStatusChange,
  onTypeChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onGenerateInvoices,
  onAddManualInvoice,
  onSendWhatsApp,
  onExport,
  invoices,
  isLoadingMonths = false,
}) => {
  const handleExport = () => {
    const exportData = invoices.map(inv => ({
      'رقم الفاتورة': inv.no,
      'المستأجر': inv.tenant?.name || '',
      'الوحدة': inv.unit?.name || '',
      'العقار': inv.propertyName || '',
      'النوع': INVOICE_TYPE_AR[inv.type as keyof typeof INVOICE_TYPE_AR] || inv.type,
      'تاريخ الاستحقاق': inv.dueDate,
      'المبلغ': inv.total,
      'المدفوع': inv.paidAmount || 0,
      'المتبقي': inv.remaining,
      'الحالة': INVOICE_STATUS_AR[inv.effectiveStatus as keyof typeof INVOICE_STATUS_AR] || inv.effectiveStatus,
    }));

    exportToCsv('فواتير_rentrix', exportData);
  };

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-border">
      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'unpaid', label: 'غير مدفوعة' },
          { key: 'overdue', label: 'متأخرة' },
          { key: 'paid', label: 'مدفوعة' },
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => onStatusChange(filter.key as InvoiceFiltersState['status'])}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.status === filter.key
                ? 'bg-primary text-white'
                : 'bg-background hover:bg-background/80'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="grid md:grid-cols-4 gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            placeholder="بحث برقم الفاتورة أو اسم المستأجر..."
            className="w-full pr-9"
            value={filters.search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        {/* Type Select */}
        <select
          value={filters.type}
          onChange={e => onTypeChange(e.target.value as InvoiceFiltersState['type'])}
          className="rounded px-3 py-2 border border-border"
        >
          <option value="all">جميع الأنواع</option>
          <option value="RENT">إيجار</option>
          <option value="LATE_FEE">رسوم تأخير</option>
          <option value="UTILITY">مرافق</option>
          <option value="OTHER">أخرى</option>
        </select>

        {/* Date From */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => onDateFromChange(e.target.value)}
          className="rounded px-3 py-2 border border-border"
        />

        {/* Date To */}
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => onDateToChange(e.target.value)}
          className="rounded px-3 py-2 border border-border"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onGenerateInvoices}
          disabled={isLoadingMonths}
          className="btn btn-primary flex items-center gap-2"
        >
          {isLoadingMonths ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
          إصدار فواتير الإيجار
        </button>

        <button onClick={onAddManualInvoice} className="btn btn-secondary flex items-center gap-2">
          <Plus size={16} /> إضافة فاتورة يدوية
        </button>

        <button onClick={onSendWhatsApp} className="btn btn-ghost flex items-center gap-2">
          <MessageCircle size={16} /> إرسال تذكير واتساب
        </button>

        <button onClick={handleExport} className="btn btn-ghost flex items-center gap-2">
          <Download size={16} /> تصدير
        </button>
      </div>
    </div>
  );
};
