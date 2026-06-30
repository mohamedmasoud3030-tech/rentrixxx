import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RoleSimulatorSection } from '@/features/settings/role-simulator-section';
import { getSimulatedRole, setSimulatedRole } from '@/services/mock-role-simulator';
import { AuditLogPage } from './audit-log-page';
import { AuditLogRouteComponent } from '@/routes/_protected.audit-log';

describe('audit-log route wiring', () => {
  it('AuditLogRouteComponent points to AuditLogPage (Supabase-backed)', () => {
    expect(AuditLogRouteComponent).toBe(AuditLogPage);
  });
});

describe('role simulator behavior', () => {
  it('toggles simulated role correctly through all three values', () => {
    setSimulatedRole('MANAGER');
    expect(getSimulatedRole()).toBe('MANAGER');
    setSimulatedRole('USER');
    expect(getSimulatedRole()).toBe('USER');
    setSimulatedRole('ADMIN');
    expect(getSimulatedRole()).toBe('ADMIN');
  });

  it('renders the RoleSimulatorSection with all three roles', () => {
    const html = renderToStaticMarkup(<RoleSimulatorSection />);
    expect(html).toContain('محاكي الصلاحيات وأدوار الموظفين');
    expect(html).toContain('ADMIN');
    expect(html).toContain('MANAGER');
    expect(html).toContain('USER');
  });
});
