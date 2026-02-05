
import Dexie, { Transaction } from 'dexie';
import { toast } from 'react-hot-toast';
import { dbEngine } from '../services/db';
import { postJournalEntry } from '../services/financeService';
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
    const finalEntry: { [key: string]: any } = { ...entry, id, createdAt: now };

    // FIX: Property 'tables' does not exist on type 'RentrixDB'. Cast dbEngine to Dexie to access it.
    await (dbEngine as Dexie).transaction('rw', (dbEngine as Dexie).tables, async (tx) => {
        if (serialKey) {
            await tx.table('serials').where({id: STATIC_ID}).modify(s => {
                (s as any)[serialKey]++;
                finalEntry.no = String((s as any)[serialKey]);
            });
        }
        
        await tx.table(table as string).add(finalEntry);
        await audit(user, 'CREATE', String(table), id);
        
        const mappings = settings.accounting.accountMappings;
        if (table === 'receipts') {
            const r = finalEntry as Receipt;
            await postJournalEntry(tx, { dr: mappings.paymentMethods[r.channel], cr: mappings.accountsReceivable, amount: r.amount, ref: r.id });
        } else if (table === 'expenses') {
            const e = finalEntry as Expense;
            const cashAccount = mappings.paymentMethods.CASH;
            if (e.chargedTo === 'OWNER') {
                await postJournalEntry(tx, { dr: '2121', cr: cashAccount, amount: e.amount, ref: e.id });
            } else {
                const expenseAccount = mappings.expenseCategories[e.category] || mappings.expenseCategories.default;
                await postJournalEntry(tx, { dr: expenseAccount, cr: cashAccount, amount: e.amount, ref: e.id });
            }
        } else if (table === 'ownerSettlements') {
            const s = finalEntry as OwnerSettlement;
            const cashAccount = mappings.paymentMethods[s.method === 'CASH' ? 'CASH' : 'BANK'];
            await postJournalEntry(tx, { dr: '2121', cr: cashAccount, amount: s.amount, ref: s.id });
        }
    });
    
    toast.success('تمت الإضافة بنجاح!');
    // FIX: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
    return finalEntry as any;
};

export const update = async <T extends keyof Database | 'users'>(table: T, id: string, updates: Partial<any>, user: User | null): Promise<void> => {
    await (dbEngine as any)[table].update(id, { ...updates, updatedAt: Date.now() });
    await audit(user, 'UPDATE', String(table), id);
    toast.success('تم التحديث بنجاح!');
};

export const remove = async <T extends keyof Database | 'users'>(table: T, id: string, user: User | null): Promise<void> => {
    if (window.confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            await (dbEngine as any)[table].delete(id);
            await audit(user, 'DELETE', String(table), id);
            toast.success('تم الحذف بنجاح 🗑️');
        } catch (error: any) {
            console.error("Delete error:", error);
            if (error.name === 'ConstraintError') toast.error('لا يمكن الحذف لوجود بيانات أخرى مرتبطة بهذا السجل.');
            else toast.error(error.message || 'حدث خطأ أثناء محاولة الحذف.');
        }
    }
};

// FIX: Renamed parameter from 'string' to 'table' for clarity and to fix an undefined variable error.
export const isFinancialTable = (table: string): boolean => {
    return FINANCIAL_TABLES.includes(table as keyof Database);
};
