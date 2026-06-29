import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Phase4TenantHubPage, validatePhase4TenantForm } from './phase4-tenant-hub';
import { TenantsRouteComponent } from '@/routes/_protected.tenants';

describe('Phase 4 tenant hub', () => {
  it('renders the Arabic-first tenant hub from the local mock model', () => {
    const html = renderToStaticMarkup(<Phase4TenantHubPage />);

    expect(html).toContain('مركز المستأجرين');
    expect(html).toContain('المستأجرين النشطين');
    expect(html).toContain('إضافة مستأجر جديد');
    expect(html).toContain('فيصل العتيبي');
    expect(html).toContain('نورة الحربي');
  });

  it('validates the Phase 4 tenant registration form before local creation', () => {
    expect(validatePhase4TenantForm({ name: '', phone: '', email: '' })).toBe('اسم المستأجر مطلوب.');
    expect(validatePhase4TenantForm({ name: 'مستأجر جديد', phone: '', email: '' })).toBe('رقم الهاتف مطلوب.');
    expect(validatePhase4TenantForm({ name: 'مستأجر جديد', phone: '0500000000', email: '' })).toBeNull();
  });

  it('uses the Phase 4 tenant hub on the active tenants route', () => {
    expect(TenantsRouteComponent).toBe(Phase4TenantHubPage);
  });
});
