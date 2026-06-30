import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Phase4ContractHubPage, validatePhase4ContractForm } from './phase4-contract-hub';
import { ContractsListPage } from './ContractsListPage';
import { ContractsRouteComponent } from '@/routes/_protected.contracts';

describe('Phase 4 contract hub', () => {
  it('renders the Arabic-first contract hub from the local mock model', () => {
    const html = renderToStaticMarkup(<Phase4ContractHubPage />);

    expect(html).toContain('مركز العقود');
    expect(html).toContain('إجمالي العقود');
    expect(html).toContain('إنشاء عقد جديد');
    expect(html).toContain('contract-yasmin-101-faisal');
  });

  it('validates the Phase 4 contract creation form before local creation', () => {
    expect(validatePhase4ContractForm({ propertyId: '', unitId: '', tenantId: '', agreementId: '', startDate: '', endDate: '', rentAmount: '', paymentFrequency: 'monthly' })).toBe('يجب اختيار الوحدة.');
    expect(validatePhase4ContractForm({ propertyId: 'p-1', unitId: 'u-1', tenantId: '', agreementId: '', startDate: '', endDate: '', rentAmount: '', paymentFrequency: 'monthly' })).toBe('يجب اختيار المستأجر.');
    expect(validatePhase4ContractForm({ propertyId: 'p-1', unitId: 'u-1', tenantId: 't-1', agreementId: '', startDate: '', endDate: '', rentAmount: '', paymentFrequency: 'monthly' })).toBe('يجب تحديد اتفاقية التشغيل.');
    expect(validatePhase4ContractForm({ propertyId: 'p-1', unitId: 'u-1', tenantId: 't-1', agreementId: 'a-1', startDate: '', endDate: '', rentAmount: '', paymentFrequency: 'monthly' })).toBe('تاريخ البداية مطلوب.');
    expect(validatePhase4ContractForm({ propertyId: 'p-1', unitId: 'u-1', tenantId: 't-1', agreementId: 'a-1', startDate: '2026-01-01', endDate: '', rentAmount: '', paymentFrequency: 'monthly' })).toBe('تاريخ النهاية مطلوب.');
    expect(validatePhase4ContractForm({ propertyId: 'p-1', unitId: 'u-1', tenantId: 't-1', agreementId: 'a-1', startDate: '2026-12-31', endDate: '2026-01-01', rentAmount: '', paymentFrequency: 'monthly' })).toBe('تاريخ البداية يجب أن يسبق تاريخ النهاية.');
    expect(validatePhase4ContractForm({ propertyId: 'p-1', unitId: 'u-1', tenantId: 't-1', agreementId: 'a-1', startDate: '2026-01-01', endDate: '2026-12-31', rentAmount: '-500', paymentFrequency: 'monthly' })).toBe('قيمة الإيجار يجب أن تكون رقماً موجباً.');
    expect(validatePhase4ContractForm({ propertyId: 'p-1', unitId: 'u-1', tenantId: 't-1', agreementId: 'a-1', startDate: '2026-01-01', endDate: '2026-12-31', rentAmount: '12000', paymentFrequency: 'monthly' })).toBeNull();
  });

  it('uses the Supabase-backed contracts list on the active contracts route', () => {
    expect(ContractsRouteComponent).toBe(ContractsListPage);
  });
});
