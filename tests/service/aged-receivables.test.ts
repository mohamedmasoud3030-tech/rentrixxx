import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAgedReceivables } from '../../src/services/accountingService';
import type { Database } from '../../src/types';

const baseDb = (): Database => ({
  tenants: [{ id: 't1', name: 'Tenant One', phone: '', email: '', idNo: '', status: 'ACTIVE', notes: '', createdAt: 0 }],
  contracts: [{
    id: 'c1',
    unitId: 'u1',
    tenantId: 't1',
    start: '2026-01-01',
    end: '2026-12-31',
    rent: 100,
    dueDay: 1,
    deposit: 0,
    status: 'ACTIVE',
    createdAt: 0,
  }],
  invoices: [],
} as unknown as Database);

test('calculateAgedReceivables includes invoices due on asOfDate regardless of time component', () => {
  const db = baseDb();
  db.invoices.push({
    id: 'i1',
    no: 'INV-1',
    contractId: 'c1',
    type: 'RENT',
    dueDate: '2026-04-04T23:00:00.000Z',
    amount: 10,
    taxAmount: 1,
    paidAmount: 0,
    status: 'UNPAID',
    notes: '',
    createdAt: 0,
  });

  const report = calculateAgedReceivables(db, '2026-04-04');

  assert.equal(report.totals.total, 11);
  assert.equal(report.totals.current, 11);
  assert.equal(report.lines.length, 1);
});
