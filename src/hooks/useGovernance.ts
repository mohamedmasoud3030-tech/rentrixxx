import { useMemo } from 'react';
import { lockPeriodState, setReadOnlyState, unlockPeriodState } from '../services/governanceService';

export interface UseGovernanceResult {
  lockPeriodState: typeof lockPeriodState;
  unlockPeriodState: typeof unlockPeriodState;
  setReadOnlyState: typeof setReadOnlyState;
}

export const useGovernance = (): UseGovernanceResult => {
  return useMemo(() => ({ lockPeriodState, unlockPeriodState, setReadOnlyState }), []);
};
