import { useCallback, useMemo, useState } from 'react';
import type { Governance, User } from '../types';
import { enforceReadOnly, evaluatePermission, isLocked, lockPeriodState, setReadOnlyState, unlockPeriodState, type PermissionAction } from '../services/governanceService';

export interface UseGovernanceResult {
  can: (role: User['role'], action: PermissionAction) => boolean;
  isLocked: (ym: string) => boolean;
  isReadOnly: boolean;
  lockRecord: (ym: string) => void;
  unlockRecord: (ym: string) => void;
}

const DEFAULT_GOVERNANCE: Governance = { readOnly: false, lockedPeriods: [] };

export const useGovernance = (initial = DEFAULT_GOVERNANCE): UseGovernanceResult => {
  const [governance, setGovernance] = useState<Governance>(initial);

  const can = useCallback((role: User['role'], action: PermissionAction) => evaluatePermission(role, action), []);
  const locked = useCallback((ym: string) => isLocked(governance, ym), [governance]);
  const readOnly = useMemo(() => enforceReadOnly(governance), [governance]);

  const lockRecord = useCallback((ym: string) => {
    setGovernance(prev => lockPeriodState(prev, ym));
  }, []);

  const unlockRecord = useCallback((ym: string) => {
    setGovernance(prev => unlockPeriodState(prev, ym));
  }, []);

  // keep setReadOnlyState reachable in hook flow
  useMemo(() => setReadOnlyState(governance, readOnly), [governance, readOnly]);

  return { can, isLocked: locked, isReadOnly: readOnly, lockRecord, unlockRecord };
};
