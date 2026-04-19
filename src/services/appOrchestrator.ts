import type { ContractModel } from '@/domain/contracts';
import { isActive } from '@/domain/contracts';
import { calculateBalance, isInvoiceOverdue, type FinancialInvoice } from '@/domain/financial';
import { runAutomationScheduler } from '@/services/edgeFunctions';
import { runAI } from '@/ai/orchestrator';
import type { AutomationResult } from '@/types/automation';

export const appOrchestrator = {
  runAutomation(payload?: { dryRun?: boolean }): Promise<AutomationResult> {
    return runAutomationScheduler(payload);
  },

  runAI(prompt: string, payload: unknown): Promise<string> {
    return runAI({ query: prompt, context: payload });
  },

  contractIsActive(contract: Pick<ContractModel, 'status' | 'startDate' | 'endDate'>): boolean {
    return isActive(contract);
  },

  getBalance(debit: number, credit: number) {
    return calculateBalance(debit, credit);
  },

  invoiceIsOverdue(invoice: FinancialInvoice): boolean {
    return isInvoiceOverdue(invoice);
  },
};
