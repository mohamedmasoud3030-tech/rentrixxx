
import Dexie, { Transaction } from 'dexie';
import { toast } from 'react-hot-toast';
import { dbEngine } from './db';
import { postJournalEntry } from './financeService';
import { Database, Serials, User, Receipt, Expense, OwnerSettlement } from '../types';

const STATIC_ID = 1;

const FINANCIAL_TABLES: (keyof Database)[] = ['receipts', 'expenses', 'invoices', 'ownerSettlements', 'maintenanceRecords', 'depositTxs', 'journalEntries', 'receiptAllocations'];

// Helper for auditing operations
const audit = async (user: User | null, action: string, entity: string, entityId: string, note: string = '') => {
    if (!user) return;
    await dbEngine.auditLog.add({ id: crypto.randomUUID(), ts: Date.now(), userId: user.id, username: user.username, action, entity, entityId, note });
};

export const add = async <T extends keyof Omit<Database, 'settings' | 'auth' | 'governance' | 'serials' | 'autoBackups' | 'ownerBalances' | 'accountBalances' | 'kpiSnapshots' | 'contractBalances' | 'tenantBalances'>>(
    table: T,
    entry: Omit<Database[T][number], 'id' | 'createdAt' | 'no'>,
    user: User | null,
    settings: Database['settings']
): Promise<Database[T][number]> => {
    
    const id = crypto.randomUUID();
    const now = Date.now();
    const serialKeyMap: Partial<Record<keyof Database, keyof Serials>> = {
        receipts: 'receipt', expenses: 'expense', invoices: 'invoice',
        ownerSettlements: 'ownerSettlement', maintenanceRecords: 'maintenance',
        leads: 'lead', missions: 'mission'
    };
    const serialKey = serialKeyMap[table as keyof Database];
    const mutableEntry: Record<string, unknown> = { ...entry, id, createdAt: now };

    // FIX: Cast dbEngine to Dexie to access the .tables property for the transaction.
    await (dbEngine as Dexie).transaction('rw', (dbEngine as Dexie).tables, async (tx) => {
        if (serialKey) {
            await tx.table('serials').where({id: STATIC_ID}).modify((s: Record<string, number>) => {
                s[serialKey]++;
                mutableEntry['no'] = String(s[serialKey]);
            });
        }
        
        await tx.table(table as string).add(mutableEntry);
        await audit(user, 'CREATE', String(table), id);
        
        // FIX: Corrected access to accountMappings.
        const mappings = settings.accounting.accountMappings;
        if (table === 'receipts') {
            const r = mutableEntry as unknown as Receipt;
            await postJournalEntry(tx, { dr: mappings.paymentMethods[r.channel], cr: mappings.accountsReceivable, amount: r.amount, ref: r.id });
        } else if (table === 'expenses') {
            const e = mutableEntry as unknown as Expense;
            const cashAccount = mappings.paymentMethods.CASH;
            if (e.chargedTo === 'OWNER') {
                await postJournalEntry(tx, { dr: '2121', cr: cashAccount, amount: e.amount, ref: e.id });
            } else {
                const expenseAccount = mappings.expenseCategories[e.category] || mappings.expenseCategories.default;
                await postJournalEntry(tx, { dr: expenseAccount, cr: cashAccount, amount: e.amount, ref: e.id });
            }
        } else if (table === 'ownerSettlements') {
            const s = mutableEntry as unknown as OwnerSettlement;
            const cashAccount = mappings.paymentMethods[s.method === 'CASH' ? 'CASH' : 'BANK'];
            await postJournalEntry(tx, { dr: '2121', cr: cashAccount, amount: s.amount, ref: s.id });
        }
    });
    
    toast.success('تمت الإضافة بنجاح!');
    return mutableEntry as unknown as Database[T][number];
};

export const update = async <T extends keyof Database | 'users'>(table: T, id: string, updates: Partial<Database[keyof Database][number]>, user: User | null): Promise<void> => {
    const dbRec = dbEngine as unknown as Record<string, Dexie.Table>;
    await dbRec[table as string].update(id, { ...updates, updatedAt: Date.now() });
    await audit(user, 'UPDATE', String(table), id);
    toast.success('تم التحديث بنجاح!');
};

export const remove = async <T extends keyof Database | 'users'>(table: T, id: string, user: User | null): Promise<void> => {
    if (window.confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            const dbRec = dbEngine as unknown as Record<string, Dexie.Table>;
            await dbRec[table as string].delete(id);
            await audit(user, 'DELETE', String(table), id);
            toast.success('تم الحذف بنجاح 🗑️');
        } catch (error: unknown) {
            console.error("Delete error:", error);
            const err = error as { name?: string; message?: string };
            if (err.name === 'ConstraintError') toast.error('لا يمكن الحذف لوجود بيانات أخرى مرتبطة بهذا السجل.');
            else toast.error(err.message || 'حدث خطأ أثناء محاولة الحذف.');
        }
    }
};

export const isFinancialTable = (table: string): boolean => {
    return FINANCIAL_TABLES.includes(table as keyof Database);
};