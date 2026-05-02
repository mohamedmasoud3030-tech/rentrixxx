import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency } from '../../utils/helpers';

const Arrears: React.FC = () => {
  const { db } = useApp();

  const overdueInvoices = useMemo(() => {
    const today = new Date();
    return db.invoices
      .filter(invoice => (invoice.status === 'OVERDUE' || invoice.status === 'UNPAID') && new Date(invoice.dueDate) < today)
      .map(invoice => {
        const contract = db.contracts.find(c => c.id === invoice.contractId);
        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
        return {
          ...invoice,
          tenantName: tenant?.name || 'غير معروف',
          remaining: Math.max(0, invoice.amount - invoice.paidAmount),
        };
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [db.invoices, db.contracts, db.tenants]);

  const totalArrears = useMemo(() => overdueInvoices.reduce((sum, invoice) => sum + invoice.remaining, 0), [overdueInvoices]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">المتأخرات</h2>
            <p className="text-sm text-text-muted">إجمالي المتأخرات الحالية: {formatCurrency(totalArrears)}</p>
          </div>
          <Link to="/financial/invoices" className="btn btn-secondary">عرض الفواتير</Link>
        </div>
      </Card>

      <Card>
        {overdueInvoices.length === 0 ? (
          <p className="text-text-muted">لا توجد متأخرات حالياً.</p>
        ) : (
          <div className="space-y-3">
            {overdueInvoices.map(invoice => (
              <div key={invoice.id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{invoice.no} — {invoice.tenantName}</p>
                  <p className="text-xs text-text-muted">تاريخ الاستحقاق: {invoice.dueDate}</p>
                </div>
                <p className="font-black text-danger-text">{formatCurrency(invoice.remaining)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Arrears;
