import type { Governance } from '../types';

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
