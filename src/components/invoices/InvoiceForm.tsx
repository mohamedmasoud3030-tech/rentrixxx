import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Modal from '../ui/Modal';
import NumberInput from '../ui/NumberInput';
import { Invoice } from '../../types';
import { useApp } from '../../contexts/AppContext';

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ isOpen, onClose, invoice }) => {
  const { db, dataService } = useApp();
  const isSavingRef = useRef(false);

  const [unitId, setUnitId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<Invoice['type']>('UTILITY');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activeContractForUnit = useMemo(
    () => db.contracts.find(c => c.unitId === unitId && c.status === 'ACTIVE'),
    [unitId, db.contracts]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (invoice) {
      const contract = db.contracts.find(c => c.id === invoice.contractId);
      setUnitId(contract?.unitId || '');
      setDueDate(invoice.dueDate);
      setAmount(invoice.amount);
      setType(invoice.type);
      setNotes(invoice.notes || '');
    } else {
      setUnitId(db.units[0]?.id || '');
      setDueDate(new Date().toISOString().slice(0, 10));
      setAmount(0);
      setType('UTILITY');
      setNotes('');
    }
  }, [isOpen, invoice, db]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSavingRef.current || !activeContractForUnit || amount <= 0) return;

      isSavingRef.current = true;
      setIsSaving(true);

      try {
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
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [activeContractForUnit, amount, dataService, dueDate, invoice, notes, onClose, type]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'تعديل الفاتورة' : 'إنشاء فاتورة يدوية'}>
      <form onSubmit={handleSubmit} className="modal-content">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="invoice-unit" className="block text-sm font-medium mb-1">
              الوحدة
            </label>
            <select
              id="invoice-unit"
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
            >
              <option value="">اختر وحدة</option>
              {db.units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="invoice-type" className="block text-sm font-medium mb-1">
              النوع
            </label>
            <select
              id="invoice-type"
              value={type}
              onChange={e => setType(e.target.value as Invoice['type'])}
            >
              <option value="RENT">إيجار</option>
              <option value="UTILITY">مرافق</option>
              <option value="MAINTENANCE">صيانة</option>
              <option value="LATE_FEE">رسوم تأخير</option>
            </select>
          </div>

          <div>
            <label htmlFor="invoice-duedate" className="block text-sm font-medium mb-1">
              تاريخ الاستحقاق
            </label>
            <input
              id="invoice-duedate"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="invoice-amount" className="block text-sm font-medium mb-1">
              المبلغ
            </label>
            <NumberInput value={amount} onChange={setAmount} />
          </div>
        </div>

        <div>
          <label htmlFor="invoice-notes" className="block text-sm font-medium mb-1.5">
            ملاحظات
          </label>
          <textarea
            id="invoice-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full"
          />
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving || !activeContractForUnit || amount <= 0}>
            {isSaving ? 'جاري...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
