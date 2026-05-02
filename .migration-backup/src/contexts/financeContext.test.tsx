import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { FinanceContext, useFinanceContext } from './financeContext';

describe('FinanceContext', () => {
  it('throws when hook is used outside provider', () => {
    expect(() => renderHook(() => useFinanceContext())).toThrowError(
      'useFinanceContext must be used within FinanceContext.Provider',
    );
  });

  it('returns context value inside provider', () => {
    const value = {
      financeService: {} as any,
      getFinancialSummary: async () => null,
      rebuildSnapshotsFromJournal: async () => undefined,
      ownerBalances: {},
      contractBalances: {},
      tenantBalances: {},
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
    );

    const { result } = renderHook(() => useFinanceContext(), { wrapper });
    expect(result.current).toBe(value);
  });
});
