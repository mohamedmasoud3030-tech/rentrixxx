import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Phase3OwnerHubPage, validatePhase3AgreementForm, validatePhase3OwnerForm } from './phase3-owner-hub';
import { OwnersRouteComponent } from '@/routes/_protected.owners';

describe('Phase 3 owner hub', () => {
  it('renders the Arabic-first owner hub from the local mock model', () => {
    const html = renderToStaticMarkup(<Phase3OwnerHubPage />);

    expect(html).toContain('مركز الملاك');
    expect(html).toContain('شركة الشريف العقارية');
    expect(html).toContain('مؤسسة النور للاستثمار');
    expect(html).toContain('برج الياسمين');
    expect(html).toContain('شبكة البطاقات');
    expect(html).toContain('تسجيل مالك جديد');
    expect(html).toContain('اسم المالك');
    expect(html).toContain('الهاتف');
    expect(html).toContain('إنشاء اتفاقية تشغيل');
    expect(html).toContain('إدارة أملاك');
    expect(html).toContain('استئجار رئيسي');
  });

  it('validates the Phase 3 owner registration form before local creation', () => {
    expect(validatePhase3OwnerForm({ name: '', phone: '', email: '' })).toBe('اسم المالك مطلوب.');
    expect(validatePhase3OwnerForm({ name: 'مالك جديد', phone: '', email: '' })).toBe('رقم الهاتف مطلوب.');
    expect(validatePhase3OwnerForm({ name: 'مالك جديد', phone: '+966555555555', email: '' })).toBeNull();
  });

  it('validates the Phase 3 owner agreement form before local creation', () => {
    expect(validatePhase3AgreementForm({ ownerId: '', propertyId: '', agreementType: 'property_management', startDate: '', endDate: '', commissionRate: '', fixedFee: '' })).toBe('اختيار المالك مطلوب قبل إنشاء الاتفاقية.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: '', agreementType: 'property_management', startDate: '', endDate: '', commissionRate: '', fixedFee: '' })).toBe('اختيار العقار مطلوب قبل إنشاء الاتفاقية.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'property_management', startDate: '2026-12-31', endDate: '2026-01-01', commissionRate: '8', fixedFee: '' })).toBe('تاريخ بداية الاتفاقية يجب أن يسبق تاريخ النهاية.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'property_management', startDate: '2026-01-01', endDate: '', commissionRate: '', fixedFee: '' })).toBe('اتفاقية إدارة الأملاك تحتاج نسبة عمولة أو رسماً ثابتاً.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'master_lease', startDate: '2026-01-01', endDate: '', commissionRate: '', fixedFee: '' })).toBe('اتفاقية الاستئجار الرئيسي تحتاج التزاماً ثابتاً.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'master_lease', startDate: '2026-01-01', endDate: '', commissionRate: '', fixedFee: '42000' })).toBeNull();
  });


  it('uses the Phase 3 owner hub on the active owners route', () => {
    expect(OwnersRouteComponent).toBe(Phase3OwnerHubPage);
  });
});
