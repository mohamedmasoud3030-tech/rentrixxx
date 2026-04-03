import { useMemo } from 'react';
import { buildAutomationSummary } from '../services/operationsService';

export interface UseOperationsResult {
  buildAutomationSummary: typeof buildAutomationSummary;
}

export const useOperations = (): UseOperationsResult => {
  return useMemo(() => ({ buildAutomationSummary }), []);
};
