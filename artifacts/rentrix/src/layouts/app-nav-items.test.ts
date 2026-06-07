import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mobileNavItems, navGroups, quickLinks, type NavItem } from './app-nav-items';

const routeTreeSource = readFileSync(new URL('../routeTree.ts', import.meta.url), 'utf8');
const routePaths = new Set(Array.from(routeTreeSource.matchAll(/path: '([^']+)'/g), (match) => match[1]));

const requiredOperationalRoutes = [
  '/login',
  '/',
  '/properties',
  '/properties/new',
  '/properties/$propertyId',
  '/properties/$propertyId/edit',
  '/units',
  '/people',
  '/people/new',
  '/people/$personId/edit',
  '/tenants',
  '/owners',
  '/owners-hub',
  '/owners/$ownerId',
  '/lands',
  '/leads',
  '/contracts',
  '/contracts/new',
  '/contracts/$contractId',
  '/contracts/$contractId/edit',
  '/financials',
  '/invoices',
  '/receipts',
  '/expenses',
  '/arrears',
  '/reports',
  '/maintenance',
  '/commissions',
  '/communication',
  '/system',
  '/audit-log',
  '/data-integrity',
  '/change-password',
  '/settings',
  '/accounting',
] as const;

const deferredBetaRoutes = [
  '/lands',
  '/leads',
  '/maintenance',
  '/commissions',
  '/communication',
  '/system',
  '/audit-log',
  '/data-integrity',
] as const;

const routePathList = Array.from(routePaths);
const navItems: NavItem[] = [];
for (const group of navGroups) {
  navItems.push(...group[1]);
}

function getRouteDefinition(path: string) {
  const pathToken = `path: '${path}'`;
  const pathIndex = routeTreeSource.indexOf(pathToken);
  if (pathIndex === -1) return '';

  const routeStart = routeTreeSource.lastIndexOf('createRoute({', pathIndex);
  const routeEnd = routeTreeSource.indexOf('});', pathIndex);
  if (routeStart === -1 || routeEnd === -1) return '';

  return routeTreeSource.slice(routeStart, routeEnd + 3);
}

describe('app route and navigation parity', () => {
  it('keeps the operational route matrix registered in TanStack Router', () => {
    expect(routePathList).toEqual(expect.arrayContaining([...requiredOperationalRoutes]));
    expect(routeTreeSource).toContain('notFoundComponent: NotFoundPage');
  });

  it('maps every visible navigation, mobile navigation, and quick link to registered routes without duplicates', () => {
    const navPaths = navItems.map(([to]) => to);
    const mobileNavPaths = mobileNavItems.map(([to]) => to);
    const quickLinkPaths = quickLinks.map(([to]) => to);

    expect(new Set(navPaths).size).toBe(navPaths.length);
    expect(new Set(mobileNavPaths).size).toBe(mobileNavPaths.length);
    expect(routePathList).toEqual(expect.arrayContaining([...navPaths, ...mobileNavPaths, ...quickLinkPaths]));
  });

  it('keeps permissioned navigation links aligned with route guards', () => {
    for (const [to, , , , permission] of navItems) {
      if (!permission) continue;

      expect(getRouteDefinition(to)).toContain(`requirePermission('${permission}')`);
    }
  });

  it('keeps deferred beta modules registered but hidden from visible navigation', () => {
    const navPaths = navItems.map(([to]) => to);
    const mobileNavPaths = mobileNavItems.map(([to]) => to);

    expect(routePathList).toEqual(expect.arrayContaining([...deferredBetaRoutes]));
    for (const route of deferredBetaRoutes) {
      expect(navPaths).not.toContain(route);
      expect(mobileNavPaths).not.toContain(route);
    }
  });
});
