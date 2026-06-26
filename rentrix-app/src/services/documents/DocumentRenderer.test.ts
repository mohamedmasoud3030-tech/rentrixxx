import { describe, expect, it } from 'vitest';
import { documentEngine } from './DocumentEngine';
import { collectDocumentTextChunks } from './DocumentRenderer';
import type { UnifiedDocumentModel } from './types';

const baseModel: UnifiedDocumentModel = {
  type: 'contract',
  header: { companyName: 'Rentrix', title: 'Contract' },
  kpis: [{ label: 'Tenant', value: 'John Doe' }],
  tables: [{ columns: ['Field', 'Value'], rows: [['Status', 'Active']] }],
  footer: { signatures: ['owner', 'tenant'], companyStampLabel: null, metadata: null },
  fileName: 'x',
};

describe('collectDocumentTextChunks', () => {
  it('does not inject default signature labels into Arabic detection chunks', () => {
    const chunks = collectDocumentTextChunks(baseModel);
    expect(chunks.join(' ')).not.toContain('توقيع');
  });

  it('keeps actual Arabic content in chunks', () => {
    const model: UnifiedDocumentModel = { ...baseModel, header: { ...baseModel.header, title: 'عقد إيجار' } };
    const chunks = collectDocumentTextChunks(model);
    expect(chunks.some((chunk) => /[\u0600-\u06FF]/.test(chunk))).toBe(true);
  });

  it('builds active invoice and expense documents with Arabic labels for RTL output', () => {
    const db = {
      settings: { general: { company: { name: 'Rentrix' } }, operational: { currency: 'OMR' } },
      contracts: [{ id: 'contract-1', tenant_id: 'tenant-1', unit_id: 'unit-1', property_id: 'property-1', start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 100, payment_cycle: 'monthly', status: 'active', cancellation_reason: null, renewed_from_id: null, notes: null, attachment_url: null, created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null }],
      tenants: [{ id: 'tenant-1', full_name: 'أحمد علي', phone: null, email: null, national_id: null, type: 'tenant', address: null, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null }],
      units: [{ id: 'unit-1', property_id: 'property-1', name: null, unit_number: 'A-1', floor: null, status: 'occupied', rent_amount: 100, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null }],
      properties: [{ id: 'property-1', title: 'برج النيل', type: 'residential', address: 'القاهرة', owner_name: null, purchase_value: null, current_value: null, status: 'active', notes: null, created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null }],
    };
    const invoice = documentEngine.build({ type: 'invoice', payload: { invoice: { id: 'invoice-1', contract_id: 'contract-1', issue_date: '2026-06-01', due_date: '2026-06-30', amount: 100, paid_amount: 25, status: 'PARTIALLY_PAID', notes: null, created_at: '2026-06-01', updated_at: '2026-06-01', deleted_at: null }, db } });
    const expense = documentEngine.build({ type: 'expense_voucher', payload: { expense: { id: 'expense-1', property_id: 'property-1', category: 'صيانة', amount: 50, expense_date: '2026-06-15', description: 'مصعد', attachment_url: null, created_at: '2026-06-15', updated_at: '2026-06-15', deleted_at: null }, db } });

    expect(collectDocumentTextChunks(invoice)).toEqual(expect.arrayContaining(['فاتورة', 'المستأجر', 'المتبقي']));
    expect(collectDocumentTextChunks(expense)).toEqual(expect.arrayContaining(['سند مصروف', 'العقار', 'برج النيل']));
  });
});
