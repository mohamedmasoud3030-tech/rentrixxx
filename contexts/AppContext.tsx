import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
// FIX: Added Attachment to import
import { Database, User, Settings, Owner, Property, Unit, Tenant, Contract, Receipt, Expense, MaintenanceRecord, DepositTx, AuditLogEntry, Governance, Serials, Snapshot, Invoice, ReceiptAllocation, Account, JournalEntry, NotificationTemplate, OutgoingNotification, AppContextType, PerformanceMetrics, OperationType, ContractBalance, TenantBalance, OwnerSettlement, DerivedData, AppNotification, Lead, Attachment, OwnerBalance } from '../types';
// FIX: Aliased import to prevent naming collision and implemented the correct function call.
// FIX: Import postJournalEntry from financialEngine
import { rebuildSnapshotsFromJournal as rebuildSnapshots, postJournalEntry } from '../services/financialEngine';
import { dbEngine, SettingsWithId, SerialsWithId, GovernanceWithId } from '../services/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie, { Transaction } from 'dexie';
import { toast } from 'react-hot-toast';
// FIX: Import IntegrationService for sendWhatsApp functionality
import { IntegrationService } from '../services/integrationService';


async function sha256(msg: string): Promise<string> {
  const enc = new TextEncoder().encode(msg);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randSalt(): string {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_ACCOUNTS: Omit<Account, 'id'|'createdAt'>[] = [
    { no: '1000', name: 'الأصول', type: 'ASSET', isParent: true, parentId: null },
    { no: '1111', name: 'الصندوق', type: 'ASSET', isParent: false, parentId: '1000' },
    { no: '1112', name: 'حساب البنك', type: 'ASSET', isParent: false, parentId: '1000' },
    { no: '1201', name: 'ذمم المستأجرين', type: 'ASSET', isParent: false, parentId: '1000'},
    { no: '2121', name: 'ذمم الملاك', type: 'LIABILITY', isParent: false, parentId: null },
    { no: '4110', name: 'إيرادات الإيجارات', type: 'REVENUE', isParent: false, parentId: null },
    { no: '4120', name: 'إيرادات عمولة المكتب', type: 'REVENUE', isParent: false, parentId: null },
    { no: '5110', name: 'مصروفات الصيانة', type: 'EXPENSE', isParent: false, parentId: null },
    { no: '5102', name: 'مصروفات عمولات الموظفين', type: 'EXPENSE', isParent: false, parentId: null },
];

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
    { id: 'RENT_OVERDUE', name: 'تذكير بفاتورة متأخرة', template: 'السيد/ {tenantName}، نود تذكيركم بوجود فاتورة مستحقة بقيمة {amountDue}.', isEnabled: true },
    { id: 'CONTRACT_EXPIRING', name: 'تنبيه قرب انتهاء العقد', template: 'السيد/ {tenantName}، نود إعلامكم بأن عقدكم سينتهي قريباً.', isEnabled: true },
];

const STATIC_ID = 1;

const initialPerformanceMetrics: PerformanceMetrics = {
    addReceipt: [], addExpense: [], voidReceipt: [], voidExpense: [], generateInvoices: [], addManualJournalVoucher: [], gateChecks: []
};

const FINANCIAL_TABLES: (keyof Database)[] = ['receipts', 'expenses', 'invoices', 'ownerSettlements', 'maintenanceRecords', 'depositTxs', 'journalEntries', 'receiptAllocations'];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [isDataStale, setIsDataStale] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(initialPerformanceMetrics);

  const settings = useLiveQuery(() => dbEngine.settings.get(STATIC_ID));
  const users = useLiveQuery(() => dbEngine.users.toArray());
  const governance = useLiveQuery(() => dbEngine.governance.get(STATIC_ID));
  const ownerBalancesData = useLiveQuery(() => dbEngine.ownerBalances.toArray());
  const contractBalancesData = useLiveQuery(() => dbEngine.contractBalances.toArray());
  const tenantBalancesData = useLiveQuery(() => dbEngine.tenantBalances.toArray());

  // FIX: Load all database tables to provide a complete 'db' object in the context, resolving widespread 'db is null' errors.
  const db = useLiveQuery(() => dbEngine.getAllData(), null);

  const ownerBalances = useMemo(() => {
      if (!ownerBalancesData) return {};
      return Object.fromEntries(ownerBalancesData.map(ob => [ob.ownerId, ob]));
  }, [ownerBalancesData]);

  const contractBalances = useMemo(() => {
      if (!contractBalancesData) return {};
      return Object.fromEntries(contractBalancesData.map(cb => [cb.contractId, cb]));
  }, [contractBalancesData]);

  const tenantBalances = useMemo(() => {
      if (!tenantBalancesData) return {};
      return Object.fromEntries(tenantBalancesData.map(tb => [tb.tenantId, tb]));
  }, [tenantBalancesData]);
  
  const isReadOnly = useMemo(() => governance?.readOnly || false, [governance]);

  const logOperationTime = useCallback((operation: OperationType | 'gateChecks', duration: number) => {
    setPerformanceMetrics(prev => {
        const newHistory = [...(prev[operation as keyof PerformanceMetrics] || []), duration];
        if (newHistory.length > 10) newHistory.shift(); // Keep last 10
        return { ...prev, [operation]: newHistory };
    });
  }, []);
  
  const rebuildSnapshotsFromJournal = useCallback(async () => {
    toast('بدء إعادة الحساب الكاملة...');
    const startTime = performance.now();
    // FIX: Replaced undefined function with the correct one from the financial engine service.
    await rebuildSnapshots();
    setIsDataStale(false);
    const endTime = performance.now();
    const duration = endTime - startTime;
    toast.success(`اكتملت إعادة الحساب في ${duration.toFixed(2)} مللي ثانية.`);
    return { duration };
  }, []);


  const audit = useCallback(async (action: string, entity: string, entityId: string, note: string = '') => {
    const user = currentUser; if (!user) return;
    await dbEngine.auditLog.add({ id: crypto.randomUUID(), ts: Date.now(), userId: user.id, username: user.username, action, entity, entityId, note });
  }, [currentUser]);

  const canAccess = useCallback((action: string) => {
    if (!currentUser) return false; if (currentUser.role === 'ADMIN') return true;
    return action === 'VIEW_FINANCIALS';
  }, [currentUser]);

  const addUser: AppContextType['auth']['addUser'] = useCallback(async (user, pass) => {
      const existing = await dbEngine.users.where('username').equals(user.username).first();
      if (existing) return { ok: false, msg: 'اسم المستخدم موجود بالفعل' };
      const salt = randSalt(); const hash = await sha256(pass + salt); const id = crypto.randomUUID(); const now = Date.now();
      const newUser: User = { ...user, id, createdAt: now, salt, hash, mustChange: false };
      await dbEngine.users.add(newUser);
      await audit('CREATE', 'users', id, `Created user ${user.username}`);
      return { ok: true, msg: 'User created' };
  }, [audit]);

  useEffect(() => {
    const seed = async () => {
        if (await dbEngine.settings.count() === 0) {
            const data = {
                settings: {
                    theme: 'light' as 'light' | 'dark',
                    appearance: { primaryColor: '#1e3a8a' },
                    currency: 'OMR' as 'OMR', contractAlertDays: 30,
                    company: { name: 'مشاريع جودة الانطلاقة', address: 'مسقط، سلطنة عمان', phone: '91928186', crNumber: '', taxNumber: '' },
                    maintenance: { defaultChargedTo: 'OWNER' as 'OWNER' }, geminiApiKey: '',
                    lateFee: { isEnabled: false, type: 'FIXED_AMOUNT' as 'FIXED_AMOUNT', value: 10, graceDays: 5 },
                    autoBackup: { isEnabled: true, passphraseIsSet: false, lastBackupTime: null, lastBackupStatus: null, operationCounter: 0, operationsThreshold: 25 },
                    googleDriveSync: { isEnabled: false },
                    taxRate: 5,
                    accountMappings: {
                        paymentMethods: { CASH: '1111', BANK: '1112', POS: '1112', OTHER: '1111' },
                        expenseCategories: { 'صيانة': '5110', 'عمولات موظفين': '5102', default: '5120' },
                        revenue: { RENT: '4110', OFFICE_COMMISSION: '4120' },
                        accountsReceivable: '1201', vatPayable: '2130', vatReceivable: '1130', ownersPayable: '2121',
                    },
                },
                governance: { readOnly: false, lockedPeriods: [] },
                serials: { receipt: 1000, expense: 1000, maintenance: 1000, invoice: 1000, lead: 1000, ownerSettlement: 1000, journalEntry: 1000, mission: 1000 },
                accounts: DEFAULT_ACCOUNTS.map(acc => ({...acc, id: acc.no, createdAt: Date.now()})),
                notificationTemplates: DEFAULT_TEMPLATES,
            };
            await dbEngine.settings.put({ ...data.settings, id: STATIC_ID });
            await dbEngine.governance.put({ ...data.governance, id: STATIC_ID });
            await dbEngine.serials.put({ ...data.serials, id: STATIC_ID });
            await dbEngine.accounts.bulkPut(data.accounts);
            await dbEngine.notificationTemplates.bulkPut(data.notificationTemplates);
        }
        if (await dbEngine.users.count() === 0) {
            console.log("No users found, creating default admin user...");
            const salt = randSalt(); const hash = await sha256('123' + salt);
            const newUser: User = { id: crypto.randomUUID(), username: 'admin', role: 'ADMIN', mustChange: true, createdAt: Date.now(), salt, hash };
            await dbEngine.users.add(newUser);
            toast.success('تم إنشاء حساب المدير الافتراضي. استخدم admin / 123 للدخول.');
        }
        if (currentUser === undefined) { setCurrentUser(null); }
    };
    seed();
  }, [currentUser]);

  const login = useCallback(async (username: string, password: string) => {
    const user = users?.find(u => u.username === username);
    if (!user || await sha256(password + user.salt) !== user.hash) return { ok: false, msg: 'بيانات غير صحيحة' };
    setCurrentUser(user); audit('LOGIN', 'SESSION', user.id);
    return { ok: true, msg: 'Ok', mustChange: user.mustChange };
  }, [users, audit]);

  const logout = useCallback(async () => {
        if (currentUser) { await audit('LOGOUT', 'SESSION', currentUser.id); }
        setCurrentUser(null);
  }, [currentUser, audit]);

  const changePassword: AppContextType['auth']['changePassword'] = useCallback(async (userId, newPass) => {
    const salt = randSalt(); const hash = await sha256(newPass + salt);
    await dbEngine.users.update(userId, { hash, salt, mustChange: false });
    setCurrentUser(prev => prev ? { ...prev, mustChange: false } : null);
    await audit('UPDATE', 'users', userId, 'Password changed');
    return { ok: true };
  }, [audit]);

  const updateUser: AppContextType['auth']['updateUser'] = useCallback(async (id, updates) => {
        await dbEngine.users.update(id, updates);
        await audit('UPDATE', 'users', id, `Updated user details for ${updates.username || id}`);
  }, [audit]);

  const forcePasswordReset = useCallback(async (userId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في فرض إعادة تعيين كلمة المرور لهذا المستخدم؟ سيُطلب منه تغييرها عند تسجيل الدخول التالي.')) {
        await dbEngine.users.update(userId, { mustChange: true });
        await audit('FORCE_RESET_PASSWORD', 'users', userId);
        toast.success('تم فرض إعادة تعيين كلمة المرور بنجاح.');
    }
  }, [audit]);

  // FIX: Change signature to match AppContextType
  const add: AppContextType['dataService']['add'] = useCallback(async (table, entry) => {
      if (isReadOnly || !settings) return null;
      if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
      const id = crypto.randomUUID(); const now = Date.now();
      const serialKeyMap: Partial<Record<keyof Database, keyof Serials>> = {
          receipts: 'receipt', expenses: 'expense', invoices: 'invoice',
          ownerSettlements: 'ownerSettlement', maintenanceRecords: 'maintenance',
          leads: 'lead', missions: 'mission'
      };
      const serialKey = serialKeyMap[table as keyof Database];
      const finalEntry: { [key: string]: any } = { ...entry, id, createdAt: now };

      const tablesToLock = [dbEngine.serials, (dbEngine as any)[table], dbEngine.journalEntries, dbEngine.auditLog];

      await (dbEngine as Dexie).transaction('rw', tablesToLock, async (tx) => {
          if (serialKey) {
              await tx.table('serials').where({id: STATIC_ID}).modify(s => {
                  (s as any)[serialKey]++;
                  finalEntry.no = String((s as any)[serialKey]);
              });
          }
          
          await tx.table(table as string).add(finalEntry);
          await audit('CREATE', String(table), id);
          
          const mappings = settings.accountMappings;
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
      return finalEntry as any;
  }, [isReadOnly, settings, audit]);

  // FIX: Change signature to match AppContextType
  const addReceiptWithAllocations: AppContextType['financeService']['addReceiptWithAllocations'] = useCallback(async (receiptData, allocations) => {
    if (isReadOnly || !settings) return;
    const startTime = performance.now();
    let newReceiptNo = '';
    await dbEngine.serials.where('id').equals(STATIC_ID).modify(s => { s.receipt++; newReceiptNo = String(s.receipt); });
    const newReceipt: Receipt = { ...receiptData, id: crypto.randomUUID(), createdAt: Date.now(), no: newReceiptNo, status: 'POSTED' as const };
    await (dbEngine as Dexie).transaction('rw', [dbEngine.receipts, dbEngine.receiptAllocations, dbEngine.invoices, dbEngine.journalEntries, dbEngine.auditLog, dbEngine.serials], async (tx) => {
        await dbEngine.receipts.add(newReceipt);
        const newAllocations = allocations.map(a => ({ id: crypto.randomUUID(), receiptId: newReceipt.id, ...a, createdAt: Date.now() }));
        await dbEngine.receiptAllocations.bulkAdd(newAllocations);
        const invoicesToUpdate = await dbEngine.invoices.bulkGet(allocations.map(a => a.invoiceId));
        for (const invoice of invoicesToUpdate) {
            if (!invoice) continue;
            const allocation = allocations.find(a => a.invoiceId === invoice.id);
            if (!allocation) continue;
            invoice.paidAmount += allocation.amount;
            invoice.status = (invoice.paidAmount >= (invoice.amount + (invoice.taxAmount || 0)) - 0.001) ? 'PAID' : 'PARTIALLY_PAID';
        }
        await dbEngine.invoices.bulkPut(invoicesToUpdate as Invoice[]);
        const mappings = settings.accountMappings;
        await postJournalEntry(tx, { dr: mappings.paymentMethods[newReceipt.channel], cr: mappings.accountsReceivable, amount: newReceipt.amount, ref: newReceipt.id });
        await audit('CREATE', 'receipts', newReceipt.id, `Created receipt ${newReceipt.no} with ${allocations.length} allocations.`);
    });
    const endTime = performance.now();
    logOperationTime('addReceipt', endTime - startTime);
    setIsDataStale(true);
    toast.success('تم تسجيل السند وتخصيص الدفعات بنجاح!');
}, [isReadOnly, settings, audit, logOperationTime]);

// FIX: Change signature to match AppContextType
const addManualJournalVoucher: AppContextType['financeService']['addManualJournalVoucher'] = useCallback(async (voucher) => {
    if (isReadOnly) { toast.error("النظام في وضع القراءة فقط."); return; }
    const totalDebits = voucher.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredits = voucher.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.001 || totalDebits === 0) { toast.error("القيد غير متوازن أو فارغ."); return; }
    let voucherNo = '';
    await (dbEngine as Dexie).transaction('rw', [dbEngine.journalEntries, dbEngine.serials, dbEngine.auditLog], async () => {
        await dbEngine.serials.where('id').equals(STATIC_ID).modify(s => { s.journalEntry++; voucherNo = String(s.journalEntry); });
        const sourceId = `MANUAL-${crypto.randomUUID().slice(0, 8)}`; const ts = Date.now();
        const entries = voucher.lines.flatMap(l => [
            l.debit > 0 && { id: crypto.randomUUID(), no: voucherNo, date: voucher.date, accountId: l.accountId, amount: l.debit, type: 'DEBIT' as 'DEBIT', sourceId, createdAt: ts },
            l.credit > 0 && { id: crypto.randomUUID(), no: voucherNo, date: voucher.date, accountId: l.accountId, amount: l.credit, type: 'CREDIT' as 'CREDIT', sourceId, createdAt: ts }
        ]).filter(Boolean);
        await dbEngine.journalEntries.bulkAdd(entries as JournalEntry[]);
        await audit('CREATE', 'journalEntries', sourceId, `Manual Voucher #${voucherNo}: ${voucher.notes}`);
    });
    setIsDataStale(true);
    toast.success(`تم إنشاء القيد اليدوي رقم ${voucherNo} بنجاح.`);
}, [isReadOnly, audit]);

  // FIX: Change signature to match AppContextType
  const update: AppContextType['dataService']['update'] = useCallback(async (table, id, updates) => {
      await (dbEngine as any)[table].update(id, { ...updates, updatedAt: Date.now() });
      await audit('UPDATE', String(table), id);
      if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
      toast.success('تم التحديث بنجاح!');
  }, [audit]);

  // FIX: Change signature to match AppContextType
  const remove: AppContextType['dataService']['remove'] = useCallback(async (table, id) => {
      if (window.confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            await (dbEngine as any)[table].delete(id);
            await audit('DELETE', String(table), id);
            if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
            toast.success('تم الحذف بنجاح 🗑️');
        } catch (error: any) {
            console.error("Delete error:", error);
            if (error.name === 'ConstraintError') toast.error('لا يمكن الحذف لوجود بيانات أخرى مرتبطة بهذا السجل.');
            else toast.error(error.message || 'حدث خطأ أثناء محاولة الحذف.');
        }
      }
  }, [audit]);
  
  const createReversingJE = useCallback(async (tx: Transaction, sourceId: string) => {
      const entries = await tx.table('journalEntries').where('sourceId').equals(sourceId).toArray();
      const debitEntry = entries.find(e => e.type === 'DEBIT');
      const creditEntry = entries.find(e => e.type === 'CREDIT');
      if (debitEntry && creditEntry) {
        await postJournalEntry(tx, { dr: creditEntry.accountId, cr: debitEntry.accountId, amount: debitEntry.amount, ref: sourceId });
      }
  }, []);

  // FIX: Change signature to match AppContextType
  const voidReceipt: AppContextType['financeService']['voidReceipt'] = useCallback(async (id) => {
      const startTime = performance.now();
      await (dbEngine as Dexie).transaction('rw', [dbEngine.receipts, dbEngine.receiptAllocations, dbEngine.invoices, dbEngine.auditLog, dbEngine.journalEntries, dbEngine.serials], async (tx) => {
          await dbEngine.receipts.update(id, { status: 'VOID', voidedAt: Date.now() });
          await audit('VOID', 'receipts', id);
          await createReversingJE(tx, id);
          const allocations = await dbEngine.receiptAllocations.where({ receiptId: id }).toArray();
          if (allocations.length > 0) {
              const invoicesToUpdate = await dbEngine.invoices.bulkGet(allocations.map(a => a.invoiceId));
              for (const invoice of invoicesToUpdate) {
                  if (!invoice) continue;
                  const allocation = allocations.find(a => a.invoiceId === invoice.id); if (!allocation) continue;
                  invoice.paidAmount -= allocation.amount;
                  invoice.status = invoice.paidAmount <= 0.001 ? (new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'UNPAID') : 'PARTIALLY_PAID';
                  if (invoice.paidAmount <= 0.001) invoice.paidAmount = 0;
              }
              await dbEngine.invoices.bulkPut(invoicesToUpdate as Invoice[]);
              await dbEngine.receiptAllocations.where({ receiptId: id }).delete();
          }
      });
      const endTime = performance.now();
      logOperationTime('voidReceipt', endTime - startTime);
      setIsDataStale(true);
      toast.success('تم إلغاء السند وتحديث الفواتير بنجاح.');
  }, [audit, createReversingJE, logOperationTime]);


  // FIX: Change signature to match AppContextType
  const voidExpense: AppContextType['financeService']['voidExpense'] = useCallback(async (id) => {
      const startTime = performance.now();
      await (dbEngine as Dexie).transaction('rw', [dbEngine.expenses, dbEngine.auditLog, dbEngine.journalEntries, dbEngine.serials], async (tx) => {
        await dbEngine.expenses.update(id, { status: 'VOID', voidedAt: Date.now() });
        await audit('VOID', 'expenses', id);
        await createReversingJE(tx, id);
      });
      const endTime = performance.now();
      logOperationTime('voidExpense', endTime - startTime);
      setIsDataStale(true);
      toast.success('تم إلغاء المصروف بنجاح.');
  }, [audit, createReversingJE, logOperationTime]);
  
  // FIX: Change signature to match AppContextType
  const generateMonthlyInvoices: AppContextType['financeService']['generateMonthlyInvoices'] = useCallback(async () => {
    if (!settings) return 0;
    const startTime = performance.now();
    const today = new Date(); const currentMonthYm = today.toISOString().slice(0, 7);
    const activeContracts = await dbEngine.contracts.where('status').equals('ACTIVE').toArray();
    const currentMonthInvoices = await dbEngine.invoices.where('dueDate').startsWith(currentMonthYm).toArray();
    let count = 0;
    
    const newInvoices: Omit<Invoice, 'id'|'createdAt'|'no'>[] = [];
    for (const c of activeContracts) {
        const hasInvoice = currentMonthInvoices.some(i => i.contractId === c.id && i.type === 'RENT');
        if (!hasInvoice) {
            const taxAmount = (c.rent * (settings.taxRate || 0)) / 100;
            newInvoices.push({ contractId: c.id, dueDate: `${currentMonthYm}-${String(c.dueDay).padStart(2, '0')}`, amount: c.rent, taxAmount: taxAmount > 0 ? taxAmount : undefined, paidAmount: 0, status: 'UNPAID', type: 'RENT', notes: `فاتورة إيجار شهر ${today.toLocaleString('ar-EG', { month: 'long' })}` });
        }
    }
    
    for (const inv of newInvoices) {
        await add('invoices', inv);
        count++;
    }

    const endTime = performance.now();
    if(count > 0) {
      logOperationTime('generateInvoices', endTime - startTime);
      setIsDataStale(true);
    }
    return count;
  }, [add, logOperationTime, settings]);

  const payoutCommission = useCallback(async (commissionId: string) => {
    if (isReadOnly) {
        toast.error("النظام في وضع القراءة فقط.");
        return;
    }
    const commission = await dbEngine.commissions.get(commissionId);
    if (!commission) throw new Error("Commission not found.");
    if (commission.status === 'PAID') throw new Error("This commission has already been paid.");

    const staffMember = await dbEngine.users.get(commission.staffId);
    
    const newExpense = await add('expenses', {
        dateTime: new Date().toISOString(),
        category: 'عمولات موظفين',
        amount: commission.amount,
        status: 'POSTED',
        chargedTo: 'OFFICE',
        payee: staffMember?.username || 'Unknown Staff',
        notes: ` صرف عمولة للموظف ${staffMember?.username} عن عملية ${commission.type}`,
        contractId: null,
        ref: `COMM-${commissionId.slice(0,6)}`,
    });

    if (newExpense) {
        await dbEngine.commissions.update(commissionId, {
            status: 'PAID',
            expenseId: newExpense.id,
            paidAt: Date.now()
        });
    } else {
        throw new Error("Failed to create payout expense record.");
    }
  }, [isReadOnly, add]);

  const updateNotificationTemplate: AppContextType['updateNotificationTemplate'] = useCallback(async (id, updates) => {
    await dbEngine.notificationTemplates.update(id, updates);
    await audit('UPDATE', 'notificationTemplates', id, `Updated template ${id}`);
    toast.success('تم تحديث القالب بنجاح.');
  }, [audit]);

  const lockPeriod: AppContextType['lockPeriod'] = useCallback(async (ym) => {
      if (!governance) return;
      await dbEngine.governance.update(STATIC_ID, { lockedPeriods: [...new Set([...governance.lockedPeriods, ym])] });
      await audit('LOCK_PERIOD', 'governance', ym);
      toast.success(`تم إغلاق الفترة ${ym} مالياً.`);
  }, [governance, audit]);

  const unlockPeriod: AppContextType['unlockPeriod'] = useCallback(async (ym) => {
      if (!governance) return;
      await dbEngine.governance.update(STATIC_ID, { lockedPeriods: governance.lockedPeriods.filter(p => p !== ym) });
      await audit('UNLOCK_PERIOD', 'governance', ym);
      toast.success(`تم إعادة فتح الفترة ${ym} مالياً.`);
  }, [governance, audit]);

  const generateOwnerPortalLink = useCallback(async (ownerId: string): Promise<string> => {
      const owner = await dbEngine.owners.get(ownerId);
      if (!owner) return '';
      let token = owner.portalToken; if (!token) { token = crypto.randomUUID(); await update('owners', ownerId, { portalToken: token }); }
      return `${window.location.href.split('#')[0]}#/portal/${ownerId}?auth=${token}`;
  }, [update]);

  // Render nothing until essential settings are loaded
  if (!db || !settings || currentUser === undefined || !ownerBalances || !contractBalances || !tenantBalances) return null;

  // FIX: Assemble service objects to match AppContextType
  const dataService: AppContextType['dataService'] = { add, update, remove };
  const financeService: AppContextType['financeService'] = {
    addReceiptWithAllocations,
    addManualJournalVoucher,
    voidReceipt,
    voidExpense,
    generateMonthlyInvoices,
    payoutCommission,
    generateLateFees: async () => 0, // Placeholder as per original
  };

  return (
    <AppContext.Provider value={{
      db: db,
      auth: { currentUser, login, logout, changePassword, addUser, updateUser, forcePasswordReset },
      settings: settings, 
      updateSettings: async (s) => { await dbEngine.settings.update(STATIC_ID, s); await audit('UPDATE', 'settings', 'main', `Updated settings: ${Object.keys(s).join(', ')}`); },
      rebuildSnapshotsFromJournal, isReadOnly,
      // FIX: Provide services instead of individual functions
      dataService,
      financeService,
      generateNotifications: async () => 0,
      updateNotificationTemplate, lockPeriod, unlockPeriod,
      setReadOnly: async (ro) => { await dbEngine.governance.update(STATIC_ID, { readOnly: ro }); await audit(ro ? 'SET_READ_ONLY' : 'UNSET_READ_ONLY', 'governance', 'main'); },
      createBackup: async () => JSON.stringify(await dbEngine.getAllData()), restoreBackup: async (s) => { await (dbEngine as Dexie).delete(); await (dbEngine as Dexie).open(); (dbEngine as any).on('populate').fire(JSON.parse(s)); window.location.reload(); }, 
      generateOwnerPortalLink,
      canAccess,
      isDataStale, performanceMetrics, logOperationTime, ownerBalances: ownerBalances as any, contractBalances: contractBalances as any, tenantBalances: tenantBalances as any,
      createSnapshot: async (note) => { await dbEngine.snapshots.add({ id: crypto.randomUUID(), ts: Date.now(), note, data: await dbEngine.getAllData() }); toast.success("تم إنشاء نقطة الاستعادة بنجاح.") },
      // FIX: Implement or provide placeholders for missing context methods
      sendWhatsApp: (phone: string, message: string) => IntegrationService.sendWhatsApp(phone, message),
    }}>
      {children}
    </AppContext.Provider>
  );
};
