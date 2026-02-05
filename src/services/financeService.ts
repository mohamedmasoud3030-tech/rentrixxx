import Dexie, { Transaction } from 'dexie';
import { toast } from 'react-hot-toast';
import { dbEngine } from './db';
import { Database, JournalEntry, Receipt, Invoice, User, Settings, Commission } from '../types';

const STATIC_ID = 1;

// --- Core Journaling ---

export const postJournalEntry = async (
    tx: Transaction,
    { dr, cr, amount, ref, no, entityType, entityId }: { dr: string, cr: string, amount: number, ref: string, no?: string, entityType?: 'CONTRACT' | 'TENANT', entityId?: string }
): Promise<JournalEntry[]> => {
    let finalNo = no;
    if (!finalNo) {
        const serialsTable = tx.table('serials');
        const currentSerials = await serialsTable.get(STATIC_ID);
        if (!currentSerials) throw new Error("Serials not found!");
        finalNo = String(currentSerials.journalEntry + 1);
        await serialsTable.update(STATIC_ID, { 'journalEntry': Number(finalNo) });
    }

    const now = new Date().toISOString().slice(0, 10);
    const timestamp = Date.now();

    const entryData = { no: finalNo, date: now, sourceId: ref, createdAt: timestamp, entityType, entityId };
    const debitEntry: JournalEntry = { id: crypto.randomUUID(), ...entryData, accountId: dr, amount, type: 'DEBIT' as const };
    const creditEntry: JournalEntry = { id: crypto.randomUUID(), ...entryData, accountId: cr, amount, type: 'CREDIT' as const };
    
    await tx.table('journalEntries').bulkAdd([debitEntry, creditEntry]);
    return [debitEntry, creditEntry];
};

const createReversingJE = async (tx: Transaction, sourceId: string) => {
    const entries = await tx.table('journalEntries').where('sourceId').equals(sourceId).toArray();
    const debitEntry = entries.find(e => e.type === 'DEBIT');
    const creditEntry = entries.find(e => e.type === 'CREDIT');
    if (debitEntry && creditEntry) {
        await postJournalEntry(tx, { dr: creditEntry.accountId, cr: debitEntry.accountId, amount: debitEntry.amount, ref: sourceId });
    }
};

// --- Financial Operations ---

const audit = async (user: User | null, action: string, entity: string, entityId: string, note: string = '') => {
    if (!user) return;
    await dbEngine.auditLog.add({ id: crypto.randomUUID(), ts: Date.now(), userId: user.id, username: user.username, action, entity, entityId, note });
};

export const voidReceipt = async (id: string, user: User | null): Promise<void> => {
    await (dbEngine as Dexie).transaction('rw', [dbEngine.receipts, dbEngine.receiptAllocations, dbEngine.invoices, dbEngine.auditLog, dbEngine.journalEntries], async (tx) => {
        await tx.table('receipts').update(id, { status: 'VOID', voidedAt: Date.now() });
        await audit(user, 'VOID', 'receipts', id);
        await createReversingJE(tx, id);
        
        const allocations = await tx.table('receiptAllocations').where({ receiptId: id }).toArray();
        if (allocations.length > 0) {
            const invoicesToUpdate = await tx.table('invoices').bulkGet(allocations.map(a => a.invoiceId));
            for (const invoice of invoicesToUpdate) {
                if (!invoice) continue;
                const allocation = allocations.find(a => a.invoiceId === invoice.id); if (!allocation) continue;
                invoice.paidAmount -= allocation.amount;
                invoice.status = invoice.paidAmount <= 0.001 ? (new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'UNPAID') : 'PARTIALLY_PAID';
                if (invoice.paidAmount <= 0.001) invoice.paidAmount = 0;
            }
            await tx.table('invoices').bulkPut(invoicesToUpdate as Invoice[]);
            await tx.table('receiptAllocations').where({ receiptId: id }).delete();
        }
    });
    toast.success('تم إلغاء السند وتحديث الفواتير بنجاح.');
};


export const voidExpense = async (id: string, user: User | null): Promise<void> => {
    await (dbEngine as Dexie).transaction('rw', [dbEngine.expenses, dbEngine.auditLog, dbEngine.journalEntries], async (tx) => {
        await tx.table('expenses').update(id, { status: 'VOID', voidedAt: Date.now() });
        await audit(user, 'VOID', 'expenses', id);
        await createReversingJE(tx, id);
    });
    toast.success('تم إلغاء المصروف بنجاح.');
};


export const addReceiptWithAllocations = async (receiptData: Omit<Receipt, 'id' | 'createdAt' | 'no' | 'status'>, allocations: { invoiceId: string, amount: number }[], user: User | null, settings: Settings): Promise<void> => {
    let newReceiptNo = '';
    
    await (dbEngine as Dexie).transaction('rw', [dbEngine.receipts, dbEngine.receiptAllocations, dbEngine.invoices, dbEngine.journalEntries, dbEngine.auditLog, dbEngine.serials], async (tx) => {
        await tx.table('serials').where('id').equals(STATIC_ID).modify(s => { s.receipt++; newReceiptNo = String(s.receipt); });
        
        const newReceipt: Receipt = { ...receiptData, id: crypto.randomUUID(), createdAt: Date.now(), no: newReceiptNo, status: 'POSTED' as const };
        await tx.table('receipts').add(newReceipt);

        const newAllocations = allocations.map(a => ({ id: crypto.randomUUID(), receiptId: newReceipt.id, ...a, createdAt: Date.now() }));
        await tx.table('receiptAllocations').bulkAdd(newAllocations);
        
        const invoicesToUpdate = await tx.table('invoices').bulkGet(allocations.map(a => a.invoiceId));
        for (const invoice of invoicesToUpdate) {
            if (!invoice) continue;
            const allocation = allocations.find(a => a.invoiceId === invoice.id);
            if (!allocation) continue;
            invoice.paidAmount += allocation.amount;
            invoice.status = (invoice.paidAmount >= (invoice.amount + (invoice.taxAmount || 0)) - 0.001) ? 'PAID' : 'PARTIALLY_PAID';
        }
        await tx.table('invoices').bulkPut(invoicesToUpdate as Invoice[]);

        const mappings = settings.accounting.accountMappings;
        await postJournalEntry(tx, { dr: mappings.paymentMethods[newReceipt.channel], cr: mappings.accountsReceivable, amount: newReceipt.amount, ref: newReceipt.id });
        await audit(user, 'CREATE', 'receipts', newReceipt.id, `Created receipt ${newReceipt.no} with ${allocations.length} allocations.`);
    });
    
    toast.success('تم تسجيل السند وتخصيص الدفعات بنجاح!');
};


export const addManualJournalVoucher = async (voucher: { date: string; notes: string; lines: { accountId: string; debit: number; credit: number }[] }, user: User | null): Promise<void> => {
    const totalDebits = voucher.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredits = voucher.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.001 || totalDebits === 0) {
        toast.error("القيد غير متوازن أو فارغ.");
        return;
    }
    
    let voucherNo = '';
    await (dbEngine as Dexie).transaction('rw', [dbEngine.journalEntries, dbEngine.serials, dbEngine.auditLog], async () => {
        await dbEngine.serials.where('id').equals(STATIC_ID).modify(s => { s.journalEntry++; voucherNo = String(s.journalEntry); });
        const sourceId = `MANUAL-${crypto.randomUUID().slice(0, 8)}`;
        const ts = Date.now();
        const entries = voucher.lines.flatMap(l => [
            l.debit > 0 && { id: crypto.randomUUID(), no: voucherNo, date: voucher.date, accountId: l.accountId, amount: l.debit, type: 'DEBIT' as 'DEBIT', sourceId, createdAt: ts },
            l.credit > 0 && { id: crypto.randomUUID(), no: voucherNo, date: voucher.date, accountId: l.accountId, amount: l.credit, type: 'CREDIT' as 'CREDIT', sourceId, createdAt: ts }
        ]).filter(Boolean);

        await dbEngine.journalEntries.bulkAdd(entries as JournalEntry[]);
        await audit(user, 'CREATE', 'journalEntries', sourceId, `Manual Voucher #${voucherNo}: ${voucher.notes}`);
    });

    toast.success(`تم إنشاء القيد اليدوي رقم ${voucherNo} بنجاح.`);
};

export const payoutCommission = async (commissionId: string, user: User | null, settings: Settings, addFn: Function): Promise<void> => {
    const commission = await dbEngine.commissions.get(commissionId);
    if (!commission) throw new Error("Commission not found.");
    if (commission.status === 'PAID') throw new Error("This commission has already been paid.");

    const staffMember = await dbEngine.users.get(commission.staffId);
    
    const newExpense = await addFn('expenses', {
        dateTime: new Date().toISOString(),
        category: 'عمولات موظفين',
        amount: commission.amount,
        status: 'POSTED',
        chargedTo: 'OFFICE',
        payee: staffMember?.username || 'Unknown Staff',
        notes: ` صرف عمولة للموظف ${staffMember?.username} عن عملية ${commission.type}`,
    }, user);

    if (newExpense) {
        await dbEngine.commissions.update(commissionId, {
            status: 'PAID',
            expenseId: newExpense.id,
            paidAt: Date.now()
        });
    } else {
        throw new Error("Failed to create payout expense record.");
    }
};