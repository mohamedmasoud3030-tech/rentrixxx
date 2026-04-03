import type { AgentDefinition } from '../core/types';

export interface FinancialAgentContext {
  trigger: 'manual' | 'scheduled';
}

export interface FinancialAgentReport {
  generatedAt: number;
  message: string;
}

export const financialAgent: AgentDefinition<FinancialAgentContext, FinancialAgentReport> = {
  id: 'financial-agent',
  name: 'Financial Agent',
  description: 'Placeholder for financial workflows and cross-agent handoffs.',
  run: async () => ({
    steps: [],
    result: {
      generatedAt: Date.now(),
      message: 'Financial agent is ready for future workflow expansion.',
    },
  }),
};
