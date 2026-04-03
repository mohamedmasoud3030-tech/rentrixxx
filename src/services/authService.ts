import type { User } from '../types';

const CAPABILITY_MAP: Record<'ADMIN' | 'USER', Set<string>> = {
  ADMIN: new Set([
    'VIEW_DASHBOARD', 'VIEW_FINANCIALS', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'VIEW_AUDIT_LOG', 'USE_SMART_ASSISTANT',
    'MANAGE_PROPERTIES', 'MANAGE_TENANTS', 'MANAGE_OWNERS', 'MANAGE_CONTRACTS', 'MANAGE_MAINTENANCE', 'VIEW_REPORTS',
  ]),
  USER: new Set([
    'VIEW_DASHBOARD', 'VIEW_FINANCIALS', 'USE_SMART_ASSISTANT',
    'MANAGE_PROPERTIES', 'MANAGE_TENANTS', 'MANAGE_OWNERS', 'MANAGE_CONTRACTS', 'MANAGE_MAINTENANCE', 'VIEW_REPORTS',
  ]),
};

export const canUserAccess = (user: User | null | undefined, action: string): boolean => {
  if (!user) return false;
  return CAPABILITY_MAP[user.role]?.has(action) ?? false;
};
