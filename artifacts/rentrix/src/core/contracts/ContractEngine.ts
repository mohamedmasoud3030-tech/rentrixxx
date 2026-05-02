/**
 * ContractEngine
 * Centralized contract operations facade.
 * Used by Contracts.tsx for create/update/end operations.
 */

import type { AppContextType, Contract } from '../../src/types';

type DataService = AppContextType['dataService'];

let _dataService: DataService | null = null;

export const ContractEngine = {
  configure(dataService: DataService) {
    _dataService = dataService;
  },

  async create(
    payload: Partial<Contract> & {
      unitId: string;
      tenantId: string;
      rent: number;
      dueDay: number;
      start: string;
      end: string;
      deposit: number;
      status: Contract['status'];
    },
  ): Promise<Contract | null> {
    if (!_dataService) {
      console.error('[ContractEngine] dataService not configured');
      return null;
    }

    const { id, ...rest } = payload;

    if (id) {
      // Update existing contract
      await _dataService.update('contracts', id, rest);
      return null;
    }

    // Create new contract
    const result = await _dataService.add('contracts', rest);
    return result as Contract | null;
  },

  async end(contractId: string, endDate: string): Promise<void> {
    if (!_dataService) {
      console.error('[ContractEngine] dataService not configured');
      return;
    }
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(endDate) && !Number.isNaN(Date.parse(`${endDate}T00:00:00.000Z`));
    if (!isValidDate) {
      throw new Error('[ContractEngine] Invalid endDate. Expected YYYY-MM-DD');
    }
    await _dataService.update('contracts', contractId, {
      status: 'ENDED',
      end: endDate,
    });
  },

  async suspend(contractId: string): Promise<void> {
    if (!_dataService) {
      console.error('[ContractEngine] dataService not configured');
      return;
    }
    await _dataService.update('contracts', contractId, { status: 'SUSPENDED' });
  },
};
