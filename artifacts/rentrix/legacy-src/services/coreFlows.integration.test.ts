import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calcVAT, distributeAmount } from './financeService';
import { canUserAccess, mapProfileToUser } from './authService';
import { ContractEngine } from '../core/contracts/ContractEngine';
import { runManualAutomation } from './automationService';
import * as edgeFunctions from './edgeFunctions';

describe('core integration flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('register payment flow: amount distribution + VAT calculation remain consistent', () => {
    const allocations = distributeAmount(1000, [2, 1, 1]);
    expect(allocations).toEqual([500, 250, 250]);

    const vatResult = calcVAT(allocations[0], 15);
    expect(vatResult.gross).toBe(575);
  });

  it('invoice creation flow: profile mapping and finance access checks for ADMIN', () => {
    const user = mapProfileToUser(
      { user: { id: 'u-1', email: 'admin@rentrix.app' } },
      { id: 'u-1', role: 'ADMIN', username: 'admin' },
    );

    expect(canUserAccess(user, 'VIEW_FINANCIALS')).toBe(true);
    expect(canUserAccess(user, 'MANAGE_CONTRACTS')).toBe(true);
  });

  it('contract renewal flow: updates contract end date through ContractEngine', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    ContractEngine.configure({ update, add: vi.fn(), remove: vi.fn(), getById: vi.fn(), list: vi.fn() } as any);

    await ContractEngine.end('contract-001', '2026-12-31');

    expect(update).toHaveBeenCalledWith('contracts', 'contract-001', {
      status: 'ENDED',
      end: '2026-12-31',
    });
  });

  it('automation run flow: triggers configured scheduler tasks', async () => {
    vi.spyOn(edgeFunctions, 'runAutomationScheduler').mockResolvedValue({
      success: true,
      errors: [],
      snapshotsRebuilt: 0,
      lateFeesApplied: 3,
      notificationsSent: 5,
      ts: new Date('2026-05-02T00:00:00.000Z').toISOString(),
    });

    const result = await runManualAutomation({} as any, {} as any, {
      invoices: true,
      lateFees: true,
      notifications: true,
      snapshots: false,
    });

    expect(result.success).toBe(true);
    expect(result.lateFeesApplied).toBe(3);
  });
});
