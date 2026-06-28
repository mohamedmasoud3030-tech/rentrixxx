import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Phase3OwnerHubPage, validatePhase3AgreementForm, validatePhase3OwnerForm, validatePhase3PropertyForm } from './phase3-owner-hub';
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
    expect(html).toContain('تسجيل عقار وربطه بمالك');
    expect(html).toContain('المالك التشغيلي');
    expect(html).toContain('اسم العقار');
    expect(html).toContain('إنشاء اتفاقية تشغيل');
    expect(html).toContain('إدارة أملاك');
    expect(html).toContain('استئجار رئيسي');
  });

  it('validates the Phase 3 owner registration form before local creation', () => {
    expect(validatePhase3OwnerForm({ name: '', phone: '', email: '' })).toBe('اسم المالك مطلوب.');
    expect(validatePhase3OwnerForm({ name: 'مالك جديد', phone: '', email: '' })).toBe('رقم الهاتف مطلوب.');
    expect(validatePhase3OwnerForm({ name: 'مالك جديد', phone: '+966555555555', email: '' })).toBeNull();
  });

  it('validates the Phase 3 property onboarding form before local creation', () => {
    expect(validatePhase3PropertyForm({ ownerId: '', name: '', address: '' })).toBe('اختيار المالك مطلوب قبل تسجيل العقار.');
    expect(validatePhase3PropertyForm({ ownerId: 'owner-1', name: '', address: '' })).toBe('اسم العقار مطلوب.');
    expect(validatePhase3PropertyForm({ ownerId: 'owner-1', name: 'برج الندى', address: '' })).toBe('عنوان العقار مطلوب.');
    expect(validatePhase3PropertyForm({ ownerId: 'owner-1', name: 'برج الندى', address: 'الرياض' })).toBeNull();
  });

  it('validates the Phase 3 owner agreement form before local creation', () => {
    expect(validatePhase3AgreementForm({ ownerId: '', propertyId: '', agreementType: 'property_management', startDate: '', endDate: '', commissionRate: '', fixedFee: '' })).toBe('اختيار المالك مطلوب قبل إنشاء الاتفاقية.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: '', agreementType: 'property_management', startDate: '', endDate: '', commissionRate: '', fixedFee: '' })).toBe('اختيار العقار مطلوب قبل إنشاء الاتفاقية.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'property_management', startDate: '2026-02-30', endDate: '', commissionRate: '8', fixedFee: '' })).toBe('تواريخ اتفاقية التشغيل غير صالحة.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'property_management', startDate: '2026-12-31', endDate: '2026-01-01', commissionRate: '8', fixedFee: '' })).toBe('تاريخ بداية الاتفاقية يجب أن يسبق تاريخ النهاية.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'property_management', startDate: '2026-01-01', endDate: '', commissionRate: '-1', fixedFee: '' })).toBe('نسبة العمولة يجب أن تكون رقماً موجباً.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'property_management', startDate: '2026-01-01', endDate: '', commissionRate: '', fixedFee: '' })).toBe('اتفاقية إدارة الأملاك تحتاج نسبة عمولة أو رسماً ثابتاً.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'master_lease', startDate: '2026-01-01', endDate: '', commissionRate: '', fixedFee: '' })).toBe('اتفاقية الاستئجار الرئيسي تحتاج التزاماً ثابتاً.');
    expect(validatePhase3AgreementForm({ ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'master_lease', startDate: '2026-01-01', endDate: '', commissionRate: '', fixedFee: '42000' })).toBeNull();
  });


  it('validates property ownership and active agreement overlap before local creation', () => {
    expect(validatePhase3AgreementForm(
      { ownerId: 'owner-1', propertyId: 'property-2', agreementType: 'property_management', startDate: '2026-01-01', endDate: '', commissionRate: '8', fixedFee: '' },
      { properties: [{ id: 'property-2', ownerId: 'owner-2', name: 'عقار آخر', address: 'الرياض', isArchived: false, createdAt: '2026-06-28T08:00:00.000Z' }] },
    )).toBe('العقار المحدد يجب أن يكون مرتبطاً بالمالك المختار.');

    expect(validatePhase3AgreementForm(
      { ownerId: 'owner-1', propertyId: 'property-1', agreementType: 'property_management', startDate: '2026-06-01', endDate: '2026-06-30', commissionRate: '8', fixedFee: '' },
      {
        agreements: [{
          id: 'agreement-existing',
          ownerId: 'owner-1',
          propertyId: 'property-1',
          agreementType: 'property_management',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'active',
          commissionRate: 8,
          isArchived: false,
          createdAt: '2026-06-28T08:00:00.000Z',
        }],
      },
    )).toBe('توجد اتفاقية تشغيل أخرى متداخلة في التواريخ لنفس العقار.');
  });


  it('uses the Phase 3 owner hub on the active owners route', () => {
    expect(OwnersRouteComponent).toBe(Phase3OwnerHubPage);
  });
});
