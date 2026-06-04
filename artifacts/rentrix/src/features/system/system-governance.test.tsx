import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuditLogView } from '@/features/audit/components/audit-log-view';
import { fetchAuditLog, normalizeAuditRecords } from '@/features/audit/services/audit-log-service';
import { canShowNavigationItem } from '@/features/auth/permissions';
import { assertSessionPermission } from '@/features/auth/route-guards';
import { DataIntegrityView } from './components/data-integrity-view';
import { buildDataIntegritySnapshot } from './services/data-integrity-service';
import { navGroups } from '@/layouts/app-nav-items';

vi.mock('@/lib/runtime-diagnostics', () => ({
  getEnvDiagnostics: vi.fn(() => []),
  parseSupabaseDiagnostics: vi.fn(() => []),
}));

const makeSession = (role: string) => ({
  user: {
    id: `user-${role}`,
    email: `${role.toLowerCase()}@example.com`,
    app_metadata: { user_role: role },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-06-04T00:00:00.000Z',
  },
});

const adminSession = makeSession('ADMIN');
const userSession = makeSession('USER');
const unknownRoleSession = makeSession('OWNER');

describe('system and governance route authorization', () => {
  it('allows a route when the current session has the required permission', () => {
    expect(() => assertSessionPermission(adminSession, 'audit.view')).not.toThrow();
  });

  it('denies direct route access when the current session lacks the required permission', () => {
    expect(() => assertSessionPermission(userSession, 'audit.view')).toThrow();
  });

  it('fails closed for missing and unknown role claims', () => {
    expect(() => assertSessionPermission(null, 'system.view')).toThrow();
    expect(() => assertSessionPermission(unknownRoleSession, 'system.view')).toThrow();
  });

  it('keeps navigation visibility permission-based', () => {
    const systemItems = navGroups
      .find(([sectionTitle]) => sectionTitle === 'التشغيل والنظام')?.[1]
      .filter(([to]) => ['/system', '/audit-log', '/data-integrity', '/change-password'].includes(to)) ?? [];
    const adminContext = { userId: 'user-1', email: 'admin@example.com', role: 'ADMIN' as const };
    const userContext = { userId: 'user-2', email: 'user@example.com', role: 'USER' as const };

    expect(systemItems.map(([to]) => to)).toEqual(['/system', '/audit-log', '/data-integrity', '/change-password']);
    expect(systemItems.filter(([, , , , permission]) => canShowNavigationItem(adminContext, permission)).map(([to]) => to)).toEqual(['/system', '/audit-log', '/data-integrity', '/change-password']);
    expect(systemItems.filter(([, , , , permission]) => canShowNavigationItem(userContext, permission)).map(([to]) => to)).toEqual(['/change-password']);
  });
});

describe('audit log recovery states', () => {
  it('renders the audit loading state', () => {
    expect(renderToStaticMarkup(<AuditLogView state={{ status: 'loading' }} />)).toContain('role="status"');
  });

  it('renders the audit empty state', () => {
    const html = renderToStaticMarkup(<AuditLogView state={{ status: 'ready', result: { status: 'available', records: [] } }} />);
    expect(html).toContain('لا توجد أحداث تدقيق');
  });

  it('renders the audit recoverable error state', () => {
    const html = renderToStaticMarkup(<AuditLogView state={{ status: 'error', error: new Error('audit failed') }} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('تعذر تحميل سجل التدقيق');
  });

  it('renders audit success rows when a verified source supplies records', () => {
    const records = normalizeAuditRecords([{ id: 'a-1', created_at: '2026-06-04T00:00:00.000Z', actor_email: 'admin@example.com', action: 'VIEW', entity_type: 'settings', entity_id: 's-1', note: 'opened settings' }]);
    const html = renderToStaticMarkup(<AuditLogView state={{ status: 'ready', result: { status: 'available', records } }} />);
    expect(html).toContain('admin@example.com');
    expect(html).toContain('VIEW');
    expect(html).toContain('settings / s-1');
  });

  it('returns a safe unavailable audit result until schema assumptions are verified', async () => {
    await expect(fetchAuditLog()).resolves.toMatchObject({ status: 'unavailable' });
  });
});

describe('data integrity audit recovery states', () => {
  it('renders the integrity loading state', () => {
    expect(renderToStaticMarkup(<DataIntegrityView state={{ status: 'loading' }} />)).toContain('role="status"');
  });

  it('renders the integrity unavailable state', () => {
    const html = renderToStaticMarkup(<DataIntegrityView state={{ status: 'ready', result: { status: 'unavailable', reason: 'schema unavailable' } }} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('schema unavailable');
  });

  it('renders supported integrity check results', () => {
    const result = buildDataIntegritySnapshot({
      properties: [{ id: 'property-1', deleted_at: null }],
      units: [{ id: 'unit-1', property_id: 'missing-property', deleted_at: null }],
      people: [{ id: 'tenant-1', deleted_at: null }],
      contracts: [{ id: 'contract-1', property_id: 'property-1', unit_id: 'unit-1', tenant_id: 'tenant-1', start_date: '2026-01-01', end_date: '2026-12-31', deleted_at: null }],
      invoices: [{ id: 'invoice-1', contract_id: 'contract-1', amount: 100, paid_amount: 150, deleted_at: null }],
    });
    const html = renderToStaticMarkup(<DataIntegrityView state={{ status: 'ready', result }} />);
    expect(html).toContain('تدقيق سلامة البيانات');
    expect(html).toContain('وحدات بلا عقار نشط');
    expect(html).toContain('فواتير مدفوعة بأكثر من قيمتها');
  });
});

describe('system governance dependency boundaries', () => {
  it('does not introduce historical AppContext or React Router dependencies', () => {
    const files = [
      '../audit/audit-log-page.tsx',
      '../audit/components/audit-log-view.tsx',
      './data-integrity-page.tsx',
      './components/data-integrity-view.tsx',
      './system-page.tsx',
      '../auth/change-password-page.tsx',
    ];

    for (const relativePath of files) {
      const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
      expect(source).not.toContain('AppContext');
      expect(source).not.toContain('useApp');
      expect(source).not.toContain('react-router-dom');
    }
  });

  it('keeps audit and integrity services free of write operations', () => {
    const files = ['../audit/services/audit-log-service.ts', './services/data-integrity-service.ts'];

    for (const relativePath of files) {
      const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
      expect(source).not.toMatch(/\.insert\s*\(/);
      expect(source).not.toMatch(/\.update\s*\(/);
      expect(source).not.toMatch(/\.delete\s*\(/);
      expect(source).not.toMatch(/\.rpc\s*\(/);
    }
  });
});
