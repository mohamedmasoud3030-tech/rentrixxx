import React, { useState } from 'react';
import Modal from '../ui/Modal';
import NumberInput from '../ui/NumberInput';
import { formatCurrency } from '../../utils/helpers';
import { Invoice } from '../../types';

interface QuickPayModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSaved: (amount: number, channel: 'CASH' | 'BANK' | 'POS' | 'CHECK' | 'OTHER') => Promise<void>;
}

export const QuickPayModal: React.FC<QuickPayModalProps> = ({ invoice, onClose, onSaved }) => {
  const total = (invoice.amount || 0) + (invoice.taxAmount || 0);
  const remaining = Math.max(0, total - (invoice.paidAmount || 0));

  const [amount, setAmount] = useState(remaining);
  const [channel, setChannel] = useState<'CASH' | 'BANK' | 'POS' | 'CHECK' | 'OTHER'>('CASH');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (amount <= 0) return;
    setSaving(true);
    try {
      await onSaved(amount, channel);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="تسجيل دفع">
      <div className="space-y-4">
        <div className="text-sm">
          رقم الفاتورة: <span className="font-mono">{invoice.no}</span>
        </div>
        <div className="text-sm">المبلغ المتبقي: {formatCurrency(remaining)}</div>
        <NumberInput value={amount} onChange={setAmount} />
        <select value={channel} onChange={e => setChannel(e.target.value as typeof channel)}>
          <option value="CASH">نقد</option>
          <option value="BANK">بنك</option>
          <option value="POS">نقطة بيع</option>
          <option value="CHECK">شيك</option>
          <option value="OTHER">أخرى</option>
        </select>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button
            className="btn btn-primary"
            disabled={saving || amount <= 0}
            onClick={handleSubmit}
          >
            {saving ? 'جاري...' : 'حفظ'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
