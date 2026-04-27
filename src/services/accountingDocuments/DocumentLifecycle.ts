import type { AccountingDocumentStatus } from './types';

const ALLOWED_TRANSITIONS: Record<AccountingDocumentStatus, ReadonlySet<AccountingDocumentStatus>> = {
  draft: new Set(['posted']),
  approved: new Set([]),
  posted: new Set(['void']),
  void: new Set([]),
};

export const assertDocumentTransition = (from: AccountingDocumentStatus, to: AccountingDocumentStatus): void => {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed?.has(to)) {
    throw new Error(`Invalid document status transition: ${from} -> ${to}`);
  }
};

export const isLockedDocumentStatus = (status: AccountingDocumentStatus): boolean => {
  return status === 'posted' || status === 'void';
};
