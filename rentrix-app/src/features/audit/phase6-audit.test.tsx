import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Phase6AuditHubPage } from './phase6-audit-hub';
import { RoleSimulatorSection } from '@/features/settings/role-simulator-section';
import { requestApproval, getPendingActions } from '@/services/mock-approvals';
import { getSimulatedRole, setSimulatedRole } from '@/services/mock-role-simulator';
import { AuditLogRouteComponent } from '@/routes/_protected.audit-log';

describe('Phase 6 roles, permissions simulator and audit log behavior', () => {
  it('toggles simulated role correctly', () => {
    setSimulatedRole('MANAGER');
    expect(getSimulatedRole()).toBe('MANAGER');
    setSimulatedRole('USER');
    expect(getSimulatedRole()).toBe('USER');
    setSimulatedRole('ADMIN');
    expect(getSimulatedRole()).toBe('ADMIN');
  });

  it('renders the role simulator section cleanly', () => {
    const html = renderToStaticMarkup(<RoleSimulatorSection />);
    expect(html).toContain('محاكي الصلاحيات وأدوار الموظفين');
    expect(html).toContain('ADMIN');
    expect(html).toContain('MANAGER');
    expect(html).toContain('USER');
  });

  it('restricts audit log view when simulated role is USER', () => {
    setSimulatedRole('USER');
    const html = renderToStaticMarkup(<Phase6AuditHubPage />);
    expect(html).toContain('وصول مقيَّد');
    expect(html).toContain('MANAGER / ADMIN');
  });

  it('displays pending approvals queue and audit log when role is MANAGER or ADMIN', () => {
    setSimulatedRole('ADMIN');
    const html = renderToStaticMarkup(<Phase6AuditHubPage />);
    expect(html).toContain('طابور موافقات المديرين');
    expect(html).toContain('سجل عمليات المكتب');
  });

  it('wires Phase 6 audit hub into protected audit route', () => {
    expect(AuditLogRouteComponent).toBe(Phase6AuditHubPage);
  });
});
