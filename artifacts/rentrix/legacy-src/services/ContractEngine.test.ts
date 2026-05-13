import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContractEngine } from '../../core/contracts/ContractEngine';

describe('ContractEngine.end', () => {
  const update = vi.fn();

  beforeEach(() => {
    update.mockReset();
    ContractEngine.configure({
      update,
      add: vi.fn(),
      remove: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
    } as any);
  });

  it('ends a contract using today date', async () => {
    const today = new Date().toISOString().slice(0, 10);

    await ContractEngine.end('c-1', today);

    expect(update).toHaveBeenCalledWith('contracts', 'c-1', {
      status: 'ENDED',
      end: today,
    });
  });

  it('ends a contract using a past date', async () => {
    await ContractEngine.end('c-2', '2025-01-15');

    expect(update).toHaveBeenCalledWith('contracts', 'c-2', {
      status: 'ENDED',
      end: '2025-01-15',
    });
  });

  it('throws for invalid endDate', async () => {
    await expect(ContractEngine.end('c-3', 'invalid-date')).rejects.toThrow(
      '[ContractEngine] Invalid endDate. Expected YYYY-MM-DD',
    );
    expect(update).not.toHaveBeenCalled();
  });
});
