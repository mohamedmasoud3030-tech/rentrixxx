import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import { useApp } from '../contexts/AppContext';
import { formatCurrency } from '../utils/helpers';
import { AR_LABELS } from '../config/labels.ar';

const OwnersHub: React.FC = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const { db } = useApp();

  const owner = useMemo(() => db.owners.find(item => item.id === ownerId), [db.owners, ownerId]);

  const ownerProperties = useMemo(() => db.properties.filter(property => property.ownerId === ownerId), [db.properties, ownerId]);
  const propertyIds = useMemo(() => new Set(ownerProperties.map(property => property.id)), [ownerProperties]);
  const unitIds = useMemo(() => new Set(db.units.filter(unit => propertyIds.has(unit.propertyId)).map(unit => unit.id)), [db.units, propertyIds]);
  const contracts = useMemo(() => db.contracts.filter(contract => unitIds.has(contract.unitId)), [db.contracts, unitIds]);
  const contractIds = useMemo(() => new Set(contracts.map(contract => contract.id)), [contracts]);

  const invoices = useMemo(() => db.invoices.filter(invoice => contractIds.has(invoice.contractId)), [db.invoices, contractIds]);
  const payments = useMemo(() => db.receipts.filter(receipt => contractIds.has(receipt.contractId)), [db.receipts, contractIds]);
  const expenses = useMemo(
    () => db.expenses.filter(expense => expense.ownerId === ownerId || (expense.propertyId && propertyIds.has(expense.propertyId))),
    [db.expenses, ownerId, propertyIds],
  );

  const arrears = useMemo(
    () => invoices.filter(invoice => invoice.status === 'OVERDUE' || (invoice.status === 'UNPAID' && new Date(invoice.dueDate) < new Date())),
    [invoices],
  );

  const summary = useMemo(() => ({
    totalInvoices: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    totalPayments: payments.reduce((sum, payment) => sum + payment.amount, 0),
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    totalArrears: arrears.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0),
  }), [invoices, payments, expenses, arrears]);

  if (!owner) {
    return <Card><p className="text-danger-text">المالك غير موجود.</p></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-2xl font-black text-primary">{AR_LABELS.ownersHub} — {owner.name}</h1>
        <p className="text-sm text-text-muted mt-1">عرض موحد للعقود والعقارات والفواتير والمدفوعات والمتأخرات.</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><p className="text-xs text-text-muted">إجمالي الفواتير</p><p className="font-black text-lg">{formatCurrency(summary.totalInvoices)}</p></Card>
        <Card><p className="text-xs text-text-muted">إجمالي المدفوعات</p><p className="font-black text-lg">{formatCurrency(summary.totalPayments)}</p></Card>
        <Card><p className="text-xs text-text-muted">إجمالي المصروفات</p><p className="font-black text-lg">{formatCurrency(summary.totalExpenses)}</p></Card>
        <Card><p className="text-xs text-text-muted">إجمالي المتأخرات</p><p className="font-black text-lg text-danger-text">{formatCurrency(summary.totalArrears)}</p></Card>
      </div>

      <Card>
        <h2 className="font-black mb-3">العقارات ({ownerProperties.length})</h2>
        <div className="space-y-2">
          {ownerProperties.map(property => <div key={property.id} className="text-sm">{property.name} — {property.location}</div>)}
          {ownerProperties.length === 0 && <p className="text-text-muted text-sm">لا توجد عقارات.</p>}
        </div>
      </Card>

      <Card>
        <h2 className="font-black mb-3">العقود ({contracts.length})</h2>
        <div className="space-y-2">
          {contracts.map(contract => <div key={contract.id} className="text-sm">{contract.no || contract.id} — {contract.start} → {contract.end}</div>)}
          {contracts.length === 0 && <p className="text-text-muted text-sm">لا توجد عقود.</p>}
        </div>
      </Card>
    </div>
  );
};

export default OwnersHub;
