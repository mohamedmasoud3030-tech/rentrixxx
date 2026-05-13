import { describe, expect, it } from 'vitest';
import { Invoice } from '../../types';
import { getEffectiveStatus } from './invoiceCalculations';

const baseInvoice: Invoice = {
  id: 'inv-1',
  no: 'INV-1',
  contractId: 'c-1',
  dueDate: '2026-05-10',
  amount: 100,
  paidAmount: 0,
  status: 'UNPAID',
  type: 'RENT',
  notes: '',
  createdAt: Date.now(),
};

describe('getEffectiveStatus with referenceDate', () => {
  it('returns UNPAID before due date', () => {
    const status = getEffectiveStatus(baseInvoice, 0, new Date('2026-05-09T12:00:00Z'));
    expect(status).toBe('UNPAID');
  });

  it('returns UNPAID inside grace period', () => {
    const status = getEffectiveStatus(baseInvoice, 2, new Date('2026-05-11T12:00:00Z'));
    expect(status).toBe('UNPAID');
  });

  it('returns OVERDUE after due date and grace period', () => {
    const status = getEffectiveStatus(baseInvoice, 1, new Date('2026-05-12T00:00:00Z'));
    expect(status).toBe('OVERDUE');
  });

  it('handles timezone offsets consistently via referenceDate', () => {
    const status = getEffectiveStatus(
      { ...baseInvoice, dueDate: '2026-05-10' },
      0,
      new Date('2026-05-10T23:30:00-11:00')
    );
    expect(status).toBe('OVERDUE');
  });
});
