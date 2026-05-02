import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFinance } from './useFinance';
import { Settings, Invoice, Contract } from '../types';

describe('useFinance Hook', () => {
  const mockSettings: Partial<Settings> = {
    operational: {
      lateFee: {
        isEnabled: true,
        type: 'FIXED_AMOUNT',
        value: 50,
        graceDays: 5
      }
    }
  } as any;

  const mockInvoices: Partial<Invoice>[] = [
    { id: 'i1', contractId: 'c1', amount: 1000, paidAmount: 0, status: 'UNPAID', dueDate: '2024-01-01' },
  ];

  const mockContracts: Partial<Contract>[] = [
    { id: 'c1', rent: 1000 },
  ];

  it('should compute late fees correctly', () => {
    const { result } = renderHook(() => useFinance(mockSettings as Settings));
    const fee = result.current.computeLateFeesForContract(mockContracts[0] as Contract);
    expect(fee).toBe(50);
  });

  it('should return 0 for late fees if settings are missing', () => {
    const { result } = renderHook(() => useFinance(null));
    const fee = result.current.computeLateFeesForContract(mockContracts[0] as Contract);
    expect(fee).toBe(0);
  });

  it('should derive owner arrears', () => {
    const { result } = renderHook(() => 
      useFinance(mockSettings as Settings, mockInvoices as Invoice[], mockContracts as Contract[])
    );
    const arrears = result.current.deriveArrearsForOwner(['c1']);
    expect(arrears).toBe(1000);
  });
});
