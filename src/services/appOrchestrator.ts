import type { ContractModel } from '@/domain/contracts';
import { isActive } from '@/domain/contracts';
import { calculateBalance, isInvoiceOverdue, type FinancialInvoice } from '@/domain/financial';
import { runAutomationScheduler } from '@/services/edgeFunctions';
import type { AutomationResult } from '@/types/automation';

export const appOrchestrator = {
  runAutomation(payload?: { dryRun?: boolean }): Promise<AutomationResult> {
    return runAutomationScheduler(payload);
  },

  async runAI(prompt: string, payload: unknown): Promise<string> {
    const { runAI } = await import('@/ai/orchestrator');
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
