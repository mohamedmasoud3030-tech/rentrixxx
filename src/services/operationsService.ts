import type { Contract, MaintenanceRecord } from '../types';

export interface AutomationSummary {
  invoicesCreated: number;
  lateFeesApplied: number;
  notificationsCreated: number;
  errors: string[];
}

export const buildAutomationSummary = (
  invoicesCreated: number,
  lateFeesApplied: number,
  notificationsCreated: number,
): AutomationSummary => ({
  invoicesCreated,
  lateFeesApplied,
  notificationsCreated,
  errors: [],
});

export const renewContractState = (contract: Contract, nextEndDate: string): Contract => ({
  ...contract,
  end: nextEndDate,
  status: 'ACTIVE',
  updatedAt: Date.now(),
});

export const suspendContractState = (contract: Contract): Contract => ({
  ...contract,
  status: 'SUSPENDED',
  updatedAt: Date.now(),
});

export const terminateContractState = (contract: Contract, endDate: string): Contract => ({
  ...contract,
  end: endDate,
  status: 'ENDED',
  updatedAt: Date.now(),
});

export const transitionMaintenanceStatus = (
  current: MaintenanceRecord['status'],
  next: MaintenanceRecord['status'],
): MaintenanceRecord['status'] => {
  const allowed: Record<MaintenanceRecord['status'], MaintenanceRecord['status'][]> = {
    OPEN: ['IN_PROGRESS', 'DONE', 'CANCELED'],
    IN_PROGRESS: ['DONE', 'CANCELED'],
    DONE: ['DONE'],
    CANCELED: ['CANCELED'],
  };

  return allowed[current]?.includes(next) ? next : current;
};
