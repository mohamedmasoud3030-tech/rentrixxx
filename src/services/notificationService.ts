import type { Contract, Invoice, Settings } from '@/types';

export const computeNotificationCount = (
  invoices: Invoice[] = [],
  contracts: Contract[] = [],
  settings?: Settings | null,
): number => {
  let count = 0;
  const nowMs = Date.now();
  const contractAlertDays = settings?.operational?.contractAlertDays ?? 30;

  for (const invoice of invoices) {
    if (invoice.status === 'OVERDUE' && invoice.paidAmount < invoice.amount) {
      count += 1;
    }
  }

  for (const contract of contracts) {
    const endMs = Date.parse(contract.end);
    if (!Number.isFinite(endMs)) continue;
    const daysUntilEnd = Math.floor((endMs - nowMs) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd > 0 && daysUntilEnd <= contractAlertDays) {
      count += 1;
    }
  }

  return count;
};
