import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { canAccess, canShowNavigationItem, getAuthorizationContextFromUser } from '@/features/auth/permissions';
import { navGroups, type NavItem } from '@/layouts/app-nav-items';
import { CommissionsView } from '@/features/commissions/components/commissions-view';
import { CommunicationHubView } from '@/features/communication/components/communication-hub-view';
import { LandsView } from '@/features/lands/components/lands-view';
import { LeadsView } from '@/features/leads/components/leads-view';

const sourceRoot = fileURLToPath(new URL('../..', import.meta.url));
const forbiddenNamePieces = [
  ['App', 'Context'],
  ['use', 'App'],
  ['react-router', '-dom'],
] as const;
const writeMethodCalls = ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc('] as const;

function userWithRole(role: unknown) {
  return { id: 'user-1', email: 'user@example.com', app_metadata: { user_role: role } };
}

function readFeatureSources(relativePath: string): string {
  const absolutePath = join(sourceRoot, relativePath);
  if (!statSync(absolutePath).isDirectory()) return readFileSync(absolutePath, 'utf8');

  const entries = readdirSync(absolutePath).flatMap((entry) => {
    const entryPath = join(absolutePath, entry);
    if (statSync(entryPath).isDirectory()) return readFeatureSources(join(relativePath, entry));
    return entry.endsWith('.ts') || entry.endsWith('.tsx') ? readFileSync(entryPath, 'utf8') : '';
  });

  return entries.join('\n');
}

describe('Owners and CRM route authorization', () => {
  it('allows admin and manager CRM read access while denying regular users', () => {
    const admin = getAuthorizationContextFromUser(userWithRole('ADMIN'));
    const manager = getAuthorizationContextFromUser(userWithRole('MANAGER'));
    const user = getAuthorizationContextFromUser(userWithRole('USER'));

    expect(canAccess(admin, 'owners.hub.view')).toBe(true);
    expect(canAccess(manager, 'communication.view')).toBe(true);
    expect(canAccess(user, 'lands.view')).toBe(false);
  });

  it('fails closed for missing and unknown role claims', () => {
    expect(getAuthorizationContextFromUser(userWithRole(undefined))).toBeNull();
    expect(getAuthorizationContextFromUser(userWithRole('OWNER'))).toBeNull();
    expect(canAccess(null, 'owners.hub.view')).toBe(false);
  });
});

describe('Owners and CRM navigation visibility', () => {
  it('keeps owner management visible while hiding deferred CRM surfaces from beta navigation', () => {
    const manager = getAuthorizationContextFromUser(userWithRole('MANAGER'));
    const user = getAuthorizationContextFromUser(userWithRole('USER'));
    const allNavItems: NavItem[] = [];
    for (const [, items] of navGroups) {
      allNavItems.push(...items);
    }
    const crmNavItems = allNavItems.filter(([, labelKey]) => ['owners', 'ownersHub', 'lands', 'leads', 'commissions', 'communication'].includes(labelKey));
    const crmNavKeys = crmNavItems.map(([, labelKey]) => labelKey);

    expect(crmNavKeys).toEqual(['owners']);
    expect(crmNavKeys).not.toEqual(expect.arrayContaining(['lands', 'leads', 'commissions', 'communication']));
    expect(crmNavItems.every(([, , , , permission]) => canShowNavigationItem(manager, permission))).toBe(true);
    expect(crmNavItems.every(([, , , , permission]) => !canShowNavigationItem(user, permission))).toBe(true);
  });
});

describe('Safe unavailable CRM modules', () => {
  it('renders lands unavailable state', () => {
    expect(renderToStaticMarkup(<LandsView state={{ status: 'unavailable', reason: 'schema unavailable' }} />)).toContain('schema unavailable');
  });

  it('renders leads unavailable state without invented pipeline statuses', () => {
    const html = renderToStaticMarkup(<LeadsView state={{ status: 'unavailable', reason: 'schema unavailable' }} />);

    expect(html).toContain('schema unavailable');
    expect(html).not.toContain('pipeline');
  });

  it('keeps commissions read-only without settlement behavior', () => {
    const html = renderToStaticMarkup(<CommissionsView state={{ status: 'unavailable', reason: 'schema unavailable' }} />);

    expect(html).toContain('قراءة فقط');
    expect(html).not.toContain('تسوية');
  });

  it('keeps communication hub read-only without provider sends', () => {
    const html = renderToStaticMarkup(<CommunicationHubView state={{ status: 'unavailable', reason: 'schema unavailable' }} />);

    expect(html).toContain('قراءة فقط');
    expect(html).not.toContain('WhatsApp');
  });
});

describe('Owners and CRM source safety', () => {
  it('does not reintroduce historical app context or router dependencies', () => {
    const source = ['owners', 'lands', 'leads', 'commissions', 'communication']
      .map((feature) => readFeatureSources(`features/${feature}`))
      .join('\n');

    for (const [left, right] of forbiddenNamePieces) {
      expect(source).not.toContain(`${left}${right}`);
    }
  });

  it('preserves verified owner management writes while keeping recovered surfaces read-only', () => {
    const ownerManagementSource = readFeatureSources('features/owners/ownerService.ts');
    const recoveredReadOnlySource = [
      'features/owners/owner-detail-page.tsx',
      'features/owners/components/owner-detail-view.tsx',
      'features/lands',
      'features/leads',
      'features/commissions',
      'features/communication',
    ].map(readFeatureSources).join('\n');

    expect(ownerManagementSource).toContain('.insert(');
    expect(ownerManagementSource).toContain('.update(');
    expect(ownerManagementSource).not.toContain('.delete(');
    for (const writeMethodCall of writeMethodCalls) {
      expect(recoveredReadOnlySource).not.toContain(writeMethodCall);
    }
  });
});
