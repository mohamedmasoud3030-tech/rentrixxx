import type { Contract, Invoice, Settings, Database } from '../types';
import { getEffectiveInvoiceStatus, getInvoiceRemaining } from '../utils/helpers';

const ROUND_SCALE = 3;

export const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const round3 = (value: number): number => Number(value.toFixed(ROUND_SCALE));

export function calcVAT(
  netAmount: number,
  vatRate: number,
): { net: number; vat: number; gross: number } {
  const vat = Math.round((netAmount * vatRate / 100) * 1000) / 1000;
  return {
    net: netAmount,
    vat,
    gross: Math.round((netAmount + vat) * 1000) / 1000,
  };
}

export function distributeAmount(
  total: number,
  parts: number[],
): number[] {
  if (!Number.isFinite(total) || total <= 0 || parts.length === 0) return parts.map(() => 0);
  const scale = 1000;
  const safeParts = parts.map(p => (Number.isFinite(p) && p > 0 ? p : 0));
  const sumParts = safeParts.reduce((a, b) => a + b, 0);
  if (sumParts <= 0) return parts.map(() => 0);
  const scaledTotal = Math.round(total * scale);
  const rawScaled = safeParts.map(p => (p / sumParts) * scaledTotal);
  const floors = rawScaled.map(Math.floor);
  let remainderUnits = scaledTotal - floors.reduce((a, b) => a + b, 0);
  const rankedIndices = rawScaled
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .map(item => item.index);
  let cursor = 0;
  while (remainderUnits > 0) {
    floors[rankedIndices[cursor % rankedIndices.length]] += 1;
    remainderUnits -= 1;
    cursor += 1;
  }
  return floors.map(value => value / scale);
}

export const deriveInvoiceStatus = (invoice: Invoice, settings: Settings | null): Invoice['status'] => {
  const graceDays = settings?.operational?.lateFee?.graceDays ?? 0;
  return getEffectiveInvoiceStatus(invoice, graceDays) as Invoice['status'];
};

export const getInvoiceOutstanding = (invoice: Invoice): number => round3(getInvoiceRemaining(invoice));

export const computeLateFeeAmount = (
  rentAmount: number,
  lateFee: Settings['operational']['lateFee'],
): number => {
  if (!lateFee.isEnabled) return 0;
  if (lateFee.type === 'FIXED_AMOUNT') return round3(Math.max(0, lateFee.value));
  return round3(Math.max(0, (toNumber(rentAmount) * lateFee.value) / 100));
};

export const deriveArrearsForContract = (invoices: Invoice[], contractId: string): number => {
  return round3(
    invoices
      .filter(invoice => invoice.contractId === contractId)
      .reduce((sum, invoice) => sum + getInvoiceOutstanding(invoice), 0),
  );
};

export const deriveArrearsForOwner = (
  contracts: Contract[],
  invoices: Invoice[],
  ownerContractIds: string[],
): number => {
  const contractSet = new Set(ownerContractIds.length ? ownerContractIds : contracts.map(contract => contract.id));
  return round3(
    invoices
      .filter(invoice => contractSet.has(invoice.contractId))
      .reduce((sum, invoice) => sum + getInvoiceOutstanding(invoice), 0),
  );
};

export const applyBalanceRule = (balance: number, min = 0): number => {
  const rounded = round3(balance);
  return rounded < min ? min : rounded;
};

// Reporting Helpers
const extractIsoDate = (dateTime?: string): string | null => {
  if (!dateTime) return null;
  const isoDate = dateTime.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : null;
};

const isWithinInclusiveRange = (dateIso: string, fromIso: string, toIso: string): boolean => {
  return dateIso >= fromIso && dateIso <= toIso;
};

export const getPostedReceiptsForDate = (receipts: Database['receipts'], dateIso: string) => {
  return receipts.filter((receipt) => {
    if (receipt.status !== 'POSTED') return false;
    const receiptDate = extractIsoDate(receipt.dateTime);
    return receiptDate === dateIso;
  });
};

export const getPostedExpensesInRange = (
  expenses: Database['expenses'],
  fromIso: string,
  toIso: string,
) => {
  return expenses.filter((expense) => {
    if (expense.status !== 'POSTED') return false;
    const expenseDate = extractIsoDate(expense.dateTime);
    if (!expenseDate) return false;
    return isWithinInclusiveRange(expenseDate, fromIso, toIso);
  });
};

// Backup Helpers
export const exportToJson = (data: unknown, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
};

export const importFromJson = (file: File): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = event => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const json = JSON.parse(result);
          resolve(json);
        } else {
          reject(new Error("File content is not a string."));
        }
      } catch (error) {
        reject(new Error("Error parsing JSON file."));
      }
    };
    fileReader.onerror = error => reject(error);
    fileReader.readAsText(file);
  });
};
