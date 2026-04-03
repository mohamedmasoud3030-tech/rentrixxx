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

const DAY_MS = 24 * 60 * 60 * 1000;

const getOverdueDays = (dueDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / DAY_MS);
  return Math.max(0, diff);
};

const formatOmani = (value: number): string => `${value.toFixed(3)} ر.ع`;

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
    <div className="table-shell">
      <table className="w-full min-w-[860px] text-sm text-start">
        <thead className="text-xs text-text-muted border-b border-border bg-background/50">
          <tr>
            <th className="px-2 py-3 w-10 font-semibold"></th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">رقم</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">المستأجر/الوحدة</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">النوع</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">الاستحقاق</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">المبلغ</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">المتبقي</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">الحالة</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">إجراءات</th>
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
            invoices.map(inv => {
              const remainingAmount = Math.max(0, (inv.amount || 0) + (inv.taxAmount || 0) - (inv.paidAmount || 0));
              const overdueDays = inv.effectiveStatus === 'OVERDUE' ? getOverdueDays(inv.dueDate) : 0;

              return (
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
                  <td className={`px-2 py-3 font-mono text-xs ${remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`} dir="ltr">
                    {remainingAmount > 0 ? formatOmani(remainingAmount) : '—'}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2 py-1 rounded text-[10px] border inline-block ${getStatusBadgeClass(inv.effectiveStatus)}`}>
                        {INVOICE_STATUS_AR[inv.effectiveStatus as keyof typeof INVOICE_STATUS_AR]}
                      </span>
                      {inv.effectiveStatus === 'OVERDUE' && overdueDays > 0 && (
                        <span className="px-2 py-1 rounded text-[10px] border inline-block bg-rose-50 text-rose-700 border-rose-200">
                          متأخر {overdueDays} يوم
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onQuickPay(inv)}
                        className="icon-btn icon-btn-success"
                        title="تسجيل دفع"
                      >
                        <Wallet size={14} />
                      </button>
                      <button
                        onClick={() => onEdit(inv)}
                        className="icon-btn icon-btn-info"
                        title="تعديل"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => exportInvoiceToPdf(inv as any, db)}
                        className="icon-btn"
                        title="تصدير PDF"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(inv)}
                        className="icon-btn icon-btn-danger"
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
