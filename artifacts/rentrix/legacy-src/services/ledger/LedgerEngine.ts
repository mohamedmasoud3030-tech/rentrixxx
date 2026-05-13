import type { AccountingDocument, AccountingLedgerEntry } from '@/services/accountingDocuments';
import { AuditTrail } from '@/services/audit/AuditTrail';

export interface LedgerEntryEnvelope {
  id: string;
  documentId: string;
  documentType: string;
  date: string;
  description: string;
  lines: AccountingLedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  status: 'POSTED' | 'VOID';
}

const round3 = (n: number): number => Math.round((Number(n) || 0) * 1000) / 1000;

export class LedgerEngine {
  createFromDocument(doc: AccountingDocument): LedgerEntryEnvelope {
    const totalDebit = round3(doc.ledgerEntries.filter((l) => l.type === 'DEBIT').reduce((s, l) => s + (l.amount || 0), 0));
    const totalCredit = round3(doc.ledgerEntries.filter((l) => l.type === 'CREDIT').reduce((s, l) => s + (l.amount || 0), 0));

    return {
      id: crypto.randomUUID(),
      documentId: doc.id,
      documentType: doc.type,
      date: doc.date,
      description: doc.description || `${doc.type}:${doc.id}`,
      lines: doc.ledgerEntries,
      totalDebit,
      totalCredit,
      status: 'POSTED',
    };
  }

  async validateAndAudit(entry: LedgerEntryEnvelope): Promise<void> {
    if (round3(entry.totalDebit) !== round3(entry.totalCredit)) {
      throw new Error('Ledger imbalance detected');
    }

    await AuditTrail.log({
      action: 'POST_JOURNAL',
      entityType: 'LEDGER_ENTRY',
      entityId: entry.id,
      after: entry,
    });
  }

  async auditVoid(entryId: string): Promise<void> {
    await AuditTrail.log({
      action: 'VOID_JOURNAL',
      entityType: 'LEDGER_ENTRY',
      entityId: entryId,
    });
  }
}

export const ledgerEngine = new LedgerEngine();
