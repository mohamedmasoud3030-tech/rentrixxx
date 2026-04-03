import React from 'react';
import { Wallet, FileText, Download, CheckSquare, Square, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, getStatusBadgeClass, INVOICE_STATUS_AR, INVOICE_TYPE_AR } from '../../utils/helpers';
import { InvoiceWithDetails } from '../../utils/invoices/types';
import { exportInvoiceToPdf } from '../../services/pdfService';

interface InvoiceTableProps {
  invoices: InvoiceWithDetails[];
  selectedIds: Set<string>;
  onSelectToggle: (id: string) => void;
  onQuickPay: (invoice: InvoiceWithDetails) => void;
  onEdit: (invoice: InvoiceWithDetails) => void;
  onDelete: (invoice: InvoiceWithDetails) => void;
  db: any;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  selectedIds,
  onSelectToggle,
  onQuickPay,
  onEdit,
  onDelete,
  db,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead className="text-xs text-text-muted border-b border-border bg-background/50">
          <tr>
            <th className="px-2 py-3 w-10 font-semibold"></th>
            <th className="px-2 py-3 font-semibold">رقم</th>
            <th className="px-2 py-3 font-semibold">المستأجر/الوحدة</th>
            <th className="px-2 py-3 font-semibold">النوع</th>
            <th className="px-2 py-3 font-semibold">الاستحقاق</th>
            <th className="px-2 py-3 font-semibold">المبلغ</th>
            <th className="px-2 py-3 font-semibold">المتبقي</th>
            <th className="px-2 py-3 font-semibold">الحالة</th>
            <th className="px-2 py-3 font-semibold">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-2 py-8 text-center text-text-muted">
                لا توجد فواتير
              </td>
            </tr>
          ) : (
            invoices.map(inv => (
              <tr key={inv.id} className="border-t border-border hover:bg-background/50 transition-colors">
                <td className="px-2 py-3 cursor-pointer" onClick={() => onSelectToggle(inv.id)}>
                  {selectedIds.has(inv.id) ? (
                    <CheckSquare size={16} className="text-primary" />
                  ) : (
                    <Square size={16} className="text-text-muted" />
                  )}
                </td>
                <td className="px-2 py-3 font-mono text-xs">{inv.no}</td>
                <td className="px-2 py-3">
                  <div className="font-medium">{inv.tenant?.name || '-'}</div>
                  <div className="text-xs text-text-muted">{inv.unit?.name || '-'}</div>
                </td>
                <td className="px-2 py-3 text-xs">
                  {INVOICE_TYPE_AR[inv.type as keyof typeof INVOICE_TYPE_AR] || inv.type}
                </td>
                <td className="px-2 py-3 text-xs">{formatDate(inv.dueDate)}</td>
                <td className="px-2 py-3 font-mono text-xs" dir="ltr">
                  {formatCurrency(inv.total)}
                </td>
                <td className={`px-2 py-3 font-mono text-xs ${inv.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`} dir="ltr">
                  {inv.remaining > 0 ? formatCurrency(inv.remaining) : '—'}
                </td>
                <td className="px-2 py-3">
                  <span className={`px-2 py-1 rounded text-[10px] border inline-block ${getStatusBadgeClass(inv.effectiveStatus)}`}>
                    {INVOICE_STATUS_AR[inv.effectiveStatus as keyof typeof INVOICE_STATUS_AR]}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onQuickPay(inv)}
                      className="p-2 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      title="تسجيل دفع"
                    >
                      <Wallet size={14} />
                    </button>
                    <button
                      onClick={() => onEdit(inv)}
                      className="p-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      title="تعديل"
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      onClick={() => exportInvoiceToPdf(inv as any, db)}
                      className="p-2 rounded bg-background hover:bg-background/80 transition-colors"
                      title="تصدير PDF"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(inv)}
                      className="p-2 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
