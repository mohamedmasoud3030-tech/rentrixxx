import type { Governance, User } from '../types';

export type PermissionAction =
  | 'READ'
  | 'WRITE'
  | 'DELETE'
  | 'LOCK_PERIOD'
  | 'UNLOCK_PERIOD'
  | 'SET_READ_ONLY';

const PERMISSION_MATRIX: Record<User['role'], Set<PermissionAction>> = {
  ADMIN: new Set(['READ', 'WRITE', 'DELETE', 'LOCK_PERIOD', 'UNLOCK_PERIOD', 'SET_READ_ONLY']),
  USER: new Set(['READ', 'WRITE']),
};

export const evaluatePermission = (role: User['role'], action: PermissionAction): boolean => {
  return PERMISSION_MATRIX[role].has(action);
};

export const lockPeriodState = (governance: Governance, ym: string): Governance => ({
  ...governance,
  lockedPeriods: [...new Set([...governance.lockedPeriods, ym])],
});

export const unlockPeriodState = (governance: Governance, ym: string): Governance => ({
  ...governance,
  lockedPeriods: governance.lockedPeriods.filter(period => period !== ym),
});

export const setReadOnlyState = (governance: Governance, readOnly: boolean): Governance => ({
  ...governance,
  readOnly,
});

export const isLocked = (governance: Governance, ym: string): boolean => governance.lockedPeriods.includes(ym);

export const enforceReadOnly = (governance: Governance): boolean => governance.readOnly;
