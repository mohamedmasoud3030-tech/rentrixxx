import React from 'react';
import { Wallet, FileText, Download, CheckSquare, Square, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, getStatusBadgeClass, INVOICE_STATUS_AR, INVOICE_TYPE_AR } from '../../utils/helpers';
import { InvoiceWithDetails } from '../../utils/invoices/types';
import { exportInvoiceToPdf } from '../../services/pdfService';
import { TableCell, TableContainer, TableHead, TableHeaderCell, TableRoot, TableRow } from '../shared/TablePrimitives';

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
    <TableContainer className="rounded-2xl">
      <TableRoot className="min-w-[860px]">
        <TableHead className="uppercase">
          <TableRow>
            <TableHeaderCell className="w-10"></TableHeaderCell>
            <TableHeaderCell className="whitespace-nowrap">رقم</TableHeaderCell>
            <TableHeaderCell className="whitespace-nowrap">المستأجر/الوحدة</TableHeaderCell>
            <TableHeaderCell className="whitespace-nowrap">النوع</TableHeaderCell>
            <TableHeaderCell className="whitespace-nowrap">الاستحقاق</TableHeaderCell>
            <TableHeaderCell className="whitespace-nowrap">المبلغ</TableHeaderCell>
            <TableHeaderCell className="whitespace-nowrap">المتبقي</TableHeaderCell>
            <TableHeaderCell className="whitespace-nowrap">الحالة</TableHeaderCell>
            <TableHeaderCell className="whitespace-nowrap">إجراءات</TableHeaderCell>
          </TableRow>
        </TableHead>
        <tbody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="table-system__empty">
                لا توجد فواتير
              </TableCell>
            </TableRow>
          ) : (
            invoices.map(inv => {
              const remainingAmount = Math.max(0, (inv.amount || 0) + (inv.taxAmount || 0) - (inv.paidAmount || 0));
              const overdueDays = inv.effectiveStatus === 'OVERDUE' ? getOverdueDays(inv.dueDate) : 0;

              return (
                <TableRow key={inv.id}>
                  <TableCell className="cursor-pointer" onClick={() => onSelectToggle(inv.id)}>
                    {selectedIds.has(inv.id) ? (
                      <CheckSquare size={16} className="text-primary" />
                    ) : (
                      <Square size={16} className="text-text-muted" />
                    )}
                  </TableCell>
                  <TableCell className="text-primary mono-data font-bold text-xs">{inv.no}</TableCell>
                  <TableCell>
                    <div className="font-medium">{inv.tenant?.name || '-'}</div>
                    <div className="text-xs text-text-muted">{inv.unit?.name || '-'}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {INVOICE_TYPE_AR[inv.type as keyof typeof INVOICE_TYPE_AR] || inv.type}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(inv.dueDate)}</TableCell>
                  <TableCell className="text-primary mono-data font-bold text-xs" dir="ltr">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell className={`mono-data font-bold text-xs ${remainingAmount > 0 ? 'text-error' : 'text-primary'}`} dir="ltr">
                    {remainingAmount > 0 ? formatOmani(remainingAmount) : '—'}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </tbody>
      </TableRoot>
    </TableContainer>
  );
};
