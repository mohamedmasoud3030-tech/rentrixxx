import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Phase3OwnerHubPage, validatePhase3OwnerForm } from './phase3-owner-hub';
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
  });

  it('validates the Phase 3 owner registration form before local creation', () => {
    expect(validatePhase3OwnerForm({ name: '', phone: '', email: '' })).toBe('اسم المالك مطلوب.');
    expect(validatePhase3OwnerForm({ name: 'مالك جديد', phone: '', email: '' })).toBe('رقم الهاتف مطلوب.');
    expect(validatePhase3OwnerForm({ name: 'مالك جديد', phone: '+966555555555', email: '' })).toBeNull();
  });

  it('uses the Phase 3 owner hub on the active owners route', () => {
    expect(OwnersRouteComponent).toBe(Phase3OwnerHubPage);
  });
});
