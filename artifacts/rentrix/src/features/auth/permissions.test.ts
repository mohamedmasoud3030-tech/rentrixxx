import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  canAccess,
  canAccessRoute,
  canShowNavigationItem,
  getAuthorizationContextFromUser,
  hasRole,
  normalizeRole,
} from './permissions';

const sourcePath = fileURLToPath(new URL('./permissions.ts', import.meta.url));

const userWithRole = (role: unknown) => ({
  id: 'user-1',
  email: 'user@example.com',
  app_metadata: { user_role: role },
});

describe('canonical authorization permissions', () => {
  it('allows settings access for a known authorized role', () => {
    const context = getAuthorizationContextFromUser(userWithRole('ADMIN'));

    expect(context).toEqual({ userId: 'user-1', email: 'user@example.com', role: 'ADMIN' });
    expect(canAccess(context, 'settings.manage')).toBe(true);
    expect(canAccessRoute(context, 'settings.manage')).toBe(true);
    expect(canShowNavigationItem(context, 'settings.manage')).toBe(true);
  });

  it('denies settings access for a known unauthorized role', () => {
    const context = getAuthorizationContextFromUser(userWithRole('USER'));

    expect(context?.role).toBe('USER');
    expect(canAccess(context, 'settings.manage')).toBe(false);
    expect(canAccessRoute(context, 'settings.manage')).toBe(false);
  });

  it('denies access when the user context is missing', () => {
    expect(getAuthorizationContextFromUser(null)).toBeNull();
    expect(canAccess(null, 'app.dashboard.view')).toBe(false);
    expect(canAccessRoute(null, 'app.dashboard.view')).toBe(false);
    expect(canShowNavigationItem(null, undefined)).toBe(false);
  });

  it('denies access when the role is unknown', () => {
    const context = getAuthorizationContextFromUser(userWithRole('OWNER'));

    expect(context).toBeNull();
    expect(normalizeRole('OWNER')).toBeNull();
    expect(canAccess(context, 'app.dashboard.view')).toBe(false);
  });

  it('checks explicit permissions without granting unrelated permissions', () => {
    const adminContext = getAuthorizationContextFromUser(userWithRole('ADMIN'));
    const userContext = getAuthorizationContextFromUser(userWithRole('USER'));

    expect(canAccess(adminContext, 'app.dashboard.view')).toBe(true);
    expect(canAccess(userContext, 'app.dashboard.view')).toBe(true);
    expect(canAccess(userContext, 'settings.manage')).toBe(false);
  });

  it('normalizes roles safely', () => {
    const context = getAuthorizationContextFromUser(userWithRole(' manager '));

    expect(normalizeRole(' admin ')).toBe('ADMIN');
    expect(normalizeRole('user')).toBe('USER');
    expect(context?.role).toBe('MANAGER');
    expect(hasRole(context, 'MANAGER')).toBe(true);
  });

  it('fails closed for malformed users and metadata', () => {
    expect(getAuthorizationContextFromUser(userWithRole(null))).toBeNull();
    expect(getAuthorizationContextFromUser({ ...userWithRole('ADMIN'), id: '' })).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });

  it('does not depend on historical AppContext or React Router', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('AppContext');
    expect(source).not.toContain('useApp');
    expect(source).not.toContain('react-router-dom');
    expect(source).not.toContain('@tanstack/react-router');
  });

  it('does not perform Supabase client writes or queries', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('@/integrations/supabase');
    expect(source).not.toMatch(/\.(from|insert|update|upsert|delete|rpc)\s*\(/);
  });
});
