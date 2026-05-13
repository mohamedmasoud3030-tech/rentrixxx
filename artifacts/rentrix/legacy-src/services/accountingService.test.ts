import { describe, it, expect } from 'vitest';
import { 
  calculateIncomeStatementData,
  calculateTrialBalanceData
} from './accountingService';
import { Database } from '../types';

describe('AccountingService', () => {
  const mockDb: Partial<Database> = {
    accounts: [
      { id: 'a1', no: '4001', name: 'Sales', type: 'REVENUE', isParent: false },
      { id: 'a2', no: '5001', name: 'Rent Expense', type: 'EXPENSE', isParent: false },
      { id: 'a3', no: '1001', name: 'Cash', type: 'ASSET', isParent: false },
    ],
    journalEntries: [
      { 
        id: 'je1', 
        no: 'JV-001', 
        accountId: 'a1', 
        amount: 1000, 
        type: 'CREDIT', 
        date: '2024-01-15', 
        sourceId: 's1', 
        createdAt: Date.now() 
      },
      { 
        id: 'je2', 
        no: 'JV-002', 
        accountId: 'a2', 
        amount: 400, 
        type: 'DEBIT', 
        date: '2024-01-20', 
        sourceId: 's2', 
        createdAt: Date.now() 
      },
    ]
  };

  describe('calculateIncomeStatementData', () => {
    it('should calculate net income correctly within date range', () => {
      const result = calculateIncomeStatementData(
        mockDb as Database, 
        '2024-01-01', 
        '2024-01-31'
      );

      expect(result.totalRevenue).toBe(1000);
      expect(result.totalExpense).toBe(400);
      expect(result.netIncome).toBe(600);
      expect(result.revenues).toHaveLength(1);
      expect(result.expenses).toHaveLength(1);
    });

    it('should return zeros if no entries in date range', () => {
      const result = calculateIncomeStatementData(
        mockDb as Database, 
        '2024-02-01', 
        '2024-02-28'
      );

      expect(result.totalRevenue).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.netIncome).toBe(0);
    });
  });

  describe('calculateTrialBalanceData', () => {
    it('should calculate trial balance correctly', () => {
      const result = calculateTrialBalanceData(mockDb as Database, '2024-12-31');
      
      // Debit: Rent Expense (400)
      // Credit: Sales (1000)
      // Note: Cash is not in JEs, so not in lines
      expect(result.totalDebit).toBe(400);
      expect(result.totalCredit).toBe(1000);
      expect(result.isBalanced).toBe(false); // Since we only have partial entries
      expect(result.lines).toHaveLength(2);
    });
  });
});
