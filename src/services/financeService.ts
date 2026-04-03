import type { Invoice, Settings } from '../types';
import { getEffectiveInvoiceStatus, getInvoiceRemaining } from '../utils/helpers';

const ROUND_SCALE = 3;

export const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const round3 = (value: number): number => Number(value.toFixed(ROUND_SCALE));

export const deriveInvoiceStatus = (invoice: Invoice, settings: Settings | null): Invoice['status'] => {
  const graceDays = settings?.operational?.lateFee?.graceDays ?? 0;
  return getEffectiveInvoiceStatus(invoice, graceDays) as Invoice['status'];
};

export const getInvoiceOutstanding = (invoice: Invoice): number => round3(getInvoiceRemaining(invoice));
