import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef } from 'react';
import { Database, User, Settings, Owner, Property, Unit, Tenant, Contract, Receipt, Expense, MaintenanceRecord, DepositTx, AuditLogEntry, Governance, Serials, Snapshot, Invoice, ReceiptAllocation, Account, JournalEntry, NotificationTemplate, OutgoingNotification, AppContextType, PerformanceMetrics, OperationType, ContractBalance, TenantBalance, OwnerSettlement, DerivedData, AppNotification, Lead, Attachment, OwnerBalance } from '../types';
import { supabaseData } from '../services/supabaseDataService';
import { IntegrationService } from '../services/integrationService';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';

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

const DEFAULT_SETTINGS: Settings = {
    general: { company: { name: 'مشاريع جودة الانطلاقة', address: 'مسقط، سلطنة عمان', phone: '91928186', crNumber: '', taxNumber: '' } },
    operational: {
        currency: 'OMR', taxRate: 5, contractAlertDays: 30,
        lateFee: { isEnabled: false, type: 'FIXED_AMOUNT', value: 10, graceDays: 5 },
        documentNumbering: { invoicePrefix: 'INV', receiptPrefix: 'REC', expensePrefix: 'EXP', contractPrefix: 'CTR' },
        maintenance: { defaultChargedTo: 'OWNER' },
    },
    accounting: { accountMappings: { paymentMethods: { CASH: '1111', BANK: '1112', POS: '1112', CHECK: '1112', OTHER: '1111' }, expenseCategories: { 'صيانة': '5110', 'عمولات موظفين': '5102', default: '5120' }, revenue: { RENT: '4110', OFFICE_COMMISSION: '4120' }, accountsReceivable: '1201', vatPayable: '2130', vatReceivable: '1130', ownersPayable: '2121' } },
    appearance: { theme: 'light', primaryColor: '#1e3a8a' },
    backup: { autoBackup: { isEnabled: true, passphraseIsSet: false, lastBackupTime: null, lastBackupStatus: null, operationCounter: 0, operationsThreshold: 25 } },
    security: { sessionTimeout: 0 },
    integrations: { geminiApiKey: '', googleDriveSync: { isEnabled: false } },
};

const DEFAULT_SERIALS: Serials = { receipt: 1000, expense: 1000, maintenance: 1000, invoice: 1000, lead: 1000, ownerSettlement: 1000, journalEntry: 1000, mission: 1000, contract: 1000 };

const FINANCIAL_TABLES: (keyof Database)[] = ['receipts', 'expenses', 'invoices', 'ownerSettlements', 'maintenanceRecords', 'depositTxs', 'journalEntries', 'receiptAllocations'];

const initialPerformanceMetrics: PerformanceMetrics = {
    addReceipt: [], addExpense: [], voidReceipt: [], voidExpense: [], generateInvoices: [], addManualJournalVoucher: [], gateChecks: []
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [db, setDb] = useState<Database | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [governance, setGovernance] = useState<Governance | null>(null);
  const [isDataStale, setIsDataStale] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(initialPerformanceMetrics);
  const refreshRef = useRef<() => Promise<void>>();

  const isReadOnly = useMemo(() => governance?.readOnly || false, [governance]);

  const ownerBalances = useMemo(() => {
    if (!db?.ownerBalances) return {};
    return Object.fromEntries(db.ownerBalances.map(ob => [ob.ownerId, ob]));
  }, [db?.ownerBalances]);

  const contractBalances = useMemo(() => {
    if (!db?.contractBalances) return {};
    return Object.fromEntries(db.contractBalances.map(cb => [cb.contractId, cb]));
  }, [db?.contractBalances]);

  const tenantBalances = useMemo(() => {
    if (!db?.tenantBalances) return {};
    return Object.fromEntries(db.tenantBalances.map(tb => [tb.tenantId, tb]));
  }, [db?.tenantBalances]);

  const logOperationTime = useCallback((operation: OperationType | 'gateChecks', duration: number) => {
    setPerformanceMetrics(prev => {
        const newHistory = [...(prev[operation as keyof PerformanceMetrics] || []), duration];
        if (newHistory.length > 10) newHistory.shift();
        return { ...prev, [operation]: newHistory };
    });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [allData, settingsData, govData] = await Promise.all([
        supabaseData.getAllData(),
        supabaseData.getSettings(),
        supabaseData.getGovernance(),
      ]);
      setDb(allData);
      setSettings(settingsData || DEFAULT_SETTINGS);
      setGovernance(govData || { readOnly: false, lockedPeriods: [] });
      setIsDataStale(false);
    } catch (err) {
      console.error('[AppContext] refreshData error:', err);
    }
  }, []);

  refreshRef.current = refreshData;

  const audit = useCallback(async (action: string, entity: string, entityId: string, note: string = '') => {
    const user = currentUser; if (!user) return;
    await supabaseData.insert('auditLog', { id: crypto.randomUUID(), ts: Date.now(), userId: user.id, username: user.username, action, entity, entityId, note });
  }, [currentUser]);

  const canAccess = useCallback((action: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    return action === 'VIEW_FINANCIALS';
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          setCurrentUser({
            id: session.user.id, username: profile.username || session.user.email!.split('@')[0],
            email: session.user.email || '', hash: '', salt: '',
            role: (profile.role as 'ADMIN' | 'USER') || 'USER',
            mustChange: profile.must_change_password || false, createdAt: profile.created_at || Date.now(),
          });
        } else { setCurrentUser(null); }
      } else { setCurrentUser(null); }
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser === undefined || currentUser === null) return;
    const init = async () => {
      await supabaseData.seedDefaults(
        DEFAULT_SETTINGS,
        DEFAULT_ACCOUNTS.map(acc => ({ ...acc, id: acc.no, createdAt: Date.now() })),
        DEFAULT_TEMPLATES,
        DEFAULT_SERIALS,
      );
      await refreshData();
    };
    init();
  }, [currentUser, refreshData]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return { ok: false, msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (!profile) {
        const newProfile = { id: data.user.id, username: data.user.email!.split('@')[0], role: 'USER', must_change_password: false, created_at: Date.now() };
        await supabase.from('profiles').insert(newProfile);
        profile = newProfile;
      }
      const user: User = { id: data.user.id, username: profile.username || data.user.email!.split('@')[0], email: data.user.email || '', hash: '', salt: '', role: (profile.role as 'ADMIN' | 'USER') || 'USER', mustChange: profile.must_change_password || false, createdAt: profile.created_at || Date.now() };
      setCurrentUser(user);
      await audit('LOGIN', 'SESSION', user.id);
      return { ok: true, msg: 'Ok', mustChange: user.mustChange };
    } catch (e: unknown) {
      return { ok: false, msg: e instanceof Error ? e.message : 'حدث خطأ' };
    }
  }, [audit]);

  const logout = useCallback(async () => {
    if (currentUser) await audit('LOGOUT', 'SESSION', currentUser.id);
    await supabase.auth.signOut();
    setCurrentUser(null);
    setDb(null);
    setSettings(null);
  }, [currentUser, audit]);

  const changePassword: AppContextType['auth']['changePassword'] = useCallback(async (userId, newPass) => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) return { ok: false, msg: error.message };
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', userId);
    setCurrentUser(prev => prev ? { ...prev, mustChange: false } : null);
    await audit('UPDATE', 'users', userId, 'Password changed');
    return { ok: true };
  }, [audit]);

  const addUser: AppContextType['auth']['addUser'] = useCallback(async (user, pass) => {
    const email = (user as User).email || `${user.username}@rentrix.local`;
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (error || !data.user) return { ok: false, msg: error?.message || 'فشل إنشاء المستخدم' };
    const profile = { id: data.user.id, username: user.username, role: user.role, must_change_password: true, created_at: Date.now() };
    await supabase.from('profiles').insert(profile);
    await audit('CREATE', 'users', data.user.id, `Created user ${user.username}`);
    return { ok: true, msg: 'تم إنشاء المستخدم. سيتلقى المستخدم رسالة تأكيد بالبريد الإلكتروني.' };
  }, [audit]);

  const updateUser: AppContextType['auth']['updateUser'] = useCallback(async (id, updates) => {
    if (updates.username) await supabase.from('profiles').update({ username: updates.username }).eq('id', id);
    if (updates.role) await supabase.from('profiles').update({ role: updates.role }).eq('id', id);
    await audit('UPDATE', 'users', id, `Updated user details`);
  }, [audit]);

  const forcePasswordReset = useCallback(async (userId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في فرض إعادة تعيين كلمة المرور لهذا المستخدم؟')) {
      await supabase.from('profiles').update({ must_change_password: true }).eq('id', userId);
      await audit('FORCE_RESET_PASSWORD', 'users', userId);
      toast.success('تم فرض إعادة تعيين كلمة المرور بنجاح.');
    }
  }, [audit]);

  const postJournalEntrySupabase = useCallback(async (params: { dr: string; cr: string; amount: number; ref: string; date?: string }) => {
    const now = Date.now();
    const date = params.date || new Date().toISOString().slice(0, 10);
    const voucherNo = String(await supabaseData.incrementSerial('journalEntry'));
    const entries = [
      { id: crypto.randomUUID(), no: voucherNo, date, accountId: params.dr, amount: params.amount, type: 'DEBIT' as const, sourceId: params.ref, createdAt: now },
      { id: crypto.randomUUID(), no: voucherNo, date, accountId: params.cr, amount: params.amount, type: 'CREDIT' as const, sourceId: params.ref, createdAt: now },
    ];
    await supabaseData.bulkInsert('journalEntries', entries);
  }, []);

  const add: AppContextType['dataService']['add'] = useCallback(async (table, entry) => {
    if (isReadOnly || !settings) return null;
    if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
    const id = crypto.randomUUID();
    const now = Date.now();
    const serialKeyMap: Partial<Record<keyof Database, string>> = {
      receipts: 'receipt', expenses: 'expense', invoices: 'invoice',
      ownerSettlements: 'ownerSettlement', maintenanceRecords: 'maintenance',
      leads: 'lead', missions: 'mission'
    };
    const serialKey = serialKeyMap[table as keyof Database];
    const mutableEntry: Record<string, unknown> = { ...entry, id, createdAt: now };

    if (serialKey) {
      const newNo = await supabaseData.incrementSerial(serialKey);
      mutableEntry['no'] = String(newNo);
    }

    const result = await supabaseData.insert(table as string, mutableEntry);
    if (!result) { toast.error('فشل في إضافة السجل'); return null; }
    await audit('CREATE', String(table), id);

    const mappings = settings.accounting?.accountMappings;
    if (table === 'receipts') {
      const r = mutableEntry as unknown as Receipt;
      await postJournalEntrySupabase({ dr: mappings.paymentMethods[r.channel], cr: mappings.accountsReceivable, amount: r.amount, ref: r.id });
    } else if (table === 'expenses') {
      const e = mutableEntry as unknown as Expense;
      const cashAccount = mappings.paymentMethods.CASH;
      if (e.chargedTo === 'OWNER') {
        await postJournalEntrySupabase({ dr: '2121', cr: cashAccount, amount: e.amount, ref: e.id });
      } else {
        const expenseAccount = mappings.expenseCategories[e.category] || mappings.expenseCategories.default;
        await postJournalEntrySupabase({ dr: expenseAccount, cr: cashAccount, amount: e.amount, ref: e.id });
      }
    } else if (table === 'ownerSettlements') {
      const s = mutableEntry as unknown as OwnerSettlement;
      const cashAccount = mappings.paymentMethods[s.method === 'CASH' ? 'CASH' : 'BANK'];
      await postJournalEntrySupabase({ dr: '2121', cr: cashAccount, amount: s.amount, ref: s.id });
    }

    await refreshData();
    toast.success('تمت الإضافة بنجاح!');
    return mutableEntry as unknown as Database[typeof table][number];
  }, [isReadOnly, settings, audit, postJournalEntrySupabase, refreshData]);

  const addReceiptWithAllocations: AppContextType['financeService']['addReceiptWithAllocations'] = useCallback(async (receiptData, allocations) => {
    if (isReadOnly || !settings) return;
    const startTime = performance.now();
    try {
      const newNo = await supabaseData.incrementSerial('receipt');
      const newReceipt: Receipt = { ...receiptData, id: crypto.randomUUID(), createdAt: Date.now(), no: String(newNo), status: 'POSTED' as const };

      await supabaseData.insert('receipts', newReceipt);

      const newAllocations = allocations.map(a => ({ id: crypto.randomUUID(), receiptId: newReceipt.id, ...a, createdAt: Date.now() }));
      await supabaseData.bulkInsert('receiptAllocations', newAllocations);

      for (const alloc of allocations) {
        const invoices = await supabaseData.fetchWhere<Invoice>('invoices', 'id', alloc.invoiceId);
        const invoice = invoices[0];
        if (!invoice) continue;
        const newPaid = invoice.paidAmount + alloc.amount;
        const newStatus = newPaid >= (invoice.amount + (invoice.taxAmount || 0)) - 0.001 ? 'PAID' : 'PARTIALLY_PAID';
        await supabaseData.update('invoices', invoice.id, { paidAmount: newPaid, status: newStatus });
      }

      const mappings = settings.accounting?.accountMappings;
      await postJournalEntrySupabase({ dr: mappings.paymentMethods[newReceipt.channel], cr: mappings.accountsReceivable, amount: newReceipt.amount, ref: newReceipt.id });
      await audit('CREATE', 'receipts', newReceipt.id, `Created receipt ${newReceipt.no} with ${allocations.length} allocations.`);

      const endTime = performance.now();
      logOperationTime('addReceipt', endTime - startTime);
      setIsDataStale(true);
      await refreshData();
      toast.success('تم تسجيل السند وتخصيص الدفعات بنجاح!');
    } catch (err: any) {
      console.error('addReceiptWithAllocations failed:', err);
      toast.error('حدث خطأ أثناء تسجيل السند: ' + (err?.message || 'خطأ غير معروف'));
      await refreshData();
    }
  }, [isReadOnly, settings, audit, logOperationTime, postJournalEntrySupabase, refreshData]);

  const addManualJournalVoucher: AppContextType['financeService']['addManualJournalVoucher'] = useCallback(async (voucher) => {
    if (isReadOnly) { toast.error("النظام في وضع القراءة فقط."); return; }
    const totalDebits = voucher.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredits = voucher.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.001 || totalDebits === 0) { toast.error("القيد غير متوازن أو فارغ."); return; }

    const voucherNo = String(await supabaseData.incrementSerial('journalEntry'));
    const sourceId = `MANUAL-${crypto.randomUUID().slice(0, 8)}`;
    const ts = Date.now();
    const entries = voucher.lines.flatMap(l => [
      l.debit > 0 && { id: crypto.randomUUID(), no: voucherNo, date: voucher.date, accountId: l.accountId, amount: l.debit, type: 'DEBIT' as 'DEBIT', sourceId, createdAt: ts },
      l.credit > 0 && { id: crypto.randomUUID(), no: voucherNo, date: voucher.date, accountId: l.accountId, amount: l.credit, type: 'CREDIT' as 'CREDIT', sourceId, createdAt: ts }
    ]).filter(Boolean) as JournalEntry[];

    await supabaseData.bulkInsert('journalEntries', entries);
    await audit('CREATE', 'journalEntries', sourceId, `Manual Voucher #${voucherNo}: ${voucher.notes}`);
    setIsDataStale(true);
    await refreshData();
    toast.success(`تم إنشاء القيد اليدوي رقم ${voucherNo} بنجاح.`);
  }, [isReadOnly, audit, refreshData]);

  const update: AppContextType['dataService']['update'] = useCallback(async (table, id, updates) => {
    await supabaseData.update(table as string, id, { ...updates, updatedAt: Date.now() });
    await audit('UPDATE', String(table), id);
    if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
    await refreshData();
    toast.success('تم التحديث بنجاح!');
  }, [audit, refreshData]);

  const remove: AppContextType['dataService']['remove'] = useCallback(async (table, id) => {
    if (window.confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        const ok = await supabaseData.remove(table as string, id);
        if (!ok) throw new Error('Delete failed');
        await audit('DELETE', String(table), id);
        if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
        await refreshData();
        toast.success('تم الحذف بنجاح');
      } catch (error: unknown) {
        console.error("Delete error:", error);
        toast.error('حدث خطأ أثناء محاولة الحذف.');
      }
    }
  }, [audit, refreshData]);

  const voidReceipt: AppContextType['financeService']['voidReceipt'] = useCallback(async (id) => {
    const startTime = performance.now();
    try {
      await supabaseData.update('receipts', id, { status: 'VOID', voidedAt: Date.now() });
      await audit('VOID', 'receipts', id);

      const existingEntries = await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', id);
      const debitEntry = existingEntries.find(e => e.type === 'DEBIT');
      const creditEntry = existingEntries.find(e => e.type === 'CREDIT');
      if (debitEntry && creditEntry) {
        await postJournalEntrySupabase({ dr: creditEntry.accountId, cr: debitEntry.accountId, amount: debitEntry.amount, ref: id });
      }

      const allocations = await supabaseData.fetchWhere<ReceiptAllocation>('receiptAllocations', 'receiptId', id);
      for (const alloc of allocations) {
        const invoices = await supabaseData.fetchWhere<Invoice>('invoices', 'id', alloc.invoiceId);
        const invoice = invoices[0];
        if (!invoice) continue;
        const newPaid = Math.max(0, invoice.paidAmount - alloc.amount);
        const newStatus = newPaid <= 0.001 ? (new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'UNPAID') : 'PARTIALLY_PAID';
        await supabaseData.update('invoices', invoice.id, { paidAmount: newPaid, status: newStatus });
      }
      await supabaseData.removeWhere('receiptAllocations', 'receiptId', id);

      const endTime = performance.now();
      logOperationTime('voidReceipt', endTime - startTime);
      setIsDataStale(true);
      await refreshData();
      toast.success('تم إلغاء السند وتحديث الفواتير بنجاح.');
    } catch (err: any) {
      console.error('voidReceipt failed:', err);
      toast.error('حدث خطأ أثناء إلغاء السند: ' + (err?.message || 'خطأ غير معروف'));
      await refreshData();
    }
  }, [audit, postJournalEntrySupabase, logOperationTime, refreshData]);

  const voidExpense: AppContextType['financeService']['voidExpense'] = useCallback(async (id) => {
    const startTime = performance.now();
    try {
      await supabaseData.update('expenses', id, { status: 'VOID', voidedAt: Date.now() });
      await audit('VOID', 'expenses', id);

      const existingEntries = await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', id);
      const debitEntry = existingEntries.find(e => e.type === 'DEBIT');
      const creditEntry = existingEntries.find(e => e.type === 'CREDIT');
      if (debitEntry && creditEntry) {
        await postJournalEntrySupabase({ dr: creditEntry.accountId, cr: debitEntry.accountId, amount: debitEntry.amount, ref: id });
      }

      const endTime = performance.now();
      logOperationTime('voidExpense', endTime - startTime);
      setIsDataStale(true);
      await refreshData();
      toast.success('تم إلغاء المصروف بنجاح.');
    } catch (err: any) {
      console.error('voidExpense failed:', err);
      toast.error('حدث خطأ أثناء إلغاء المصروف: ' + (err?.message || 'خطأ غير معروف'));
      await refreshData();
    }
  }, [audit, postJournalEntrySupabase, logOperationTime, refreshData]);

  const generateMonthlyInvoices: AppContextType['financeService']['generateMonthlyInvoices'] = useCallback(async () => {
    if (!settings) return 0;
    const startTime = performance.now();
    const today = new Date();
    const currentMonthYm = today.toISOString().slice(0, 7);
    const monthName = today.toLocaleString('ar-EG', { month: 'long' });

    const activeContracts = await supabaseData.fetchWhere<Contract>('contracts', 'status', 'ACTIVE');
    const allInvoices = await supabaseData.fetchAll<Invoice>('invoices');
    const currentMonthInvoices = allInvoices.filter(i => i.dueDate.startsWith(currentMonthYm));
    const allTenants = await supabaseData.fetchAll<Tenant>('tenants');
    const allUnits = await supabaseData.fetchAll<Unit>('units');

    let count = 0;
    const taxRate = settings.operational?.taxRate ?? 0;
    const invoiceNotifications: Array<{ tenantName: string; tenantPhone: string; unitName: string; amount: number; dueDate: string }> = [];

    for (const c of activeContracts) {
      const hasInvoice = currentMonthInvoices.some(i => i.contractId === c.id && i.type === 'RENT');
      if (!hasInvoice) {
        const taxAmount = (c.rent * taxRate) / 100;
        const dueDate = `${currentMonthYm}-${String(c.dueDay).padStart(2, '0')}`;
        await add('invoices', {
          contractId: c.id,
          dueDate,
          amount: c.rent, taxAmount: taxAmount > 0 ? taxAmount : undefined,
          paidAmount: 0, status: 'UNPAID', type: 'RENT',
          notes: `فاتورة إيجار شهر ${monthName}`,
        });
        count++;

        const tenant = allTenants.find(t => t.id === c.tenantId);
        const unit = allUnits.find(u => u.id === c.unitId);
        if (tenant?.phone) {
          invoiceNotifications.push({
            tenantName: tenant.name, tenantPhone: tenant.phone,
            unitName: unit?.name || '', amount: c.rent + (taxAmount > 0 ? taxAmount : 0), dueDate,
          });
        }
      }
    }

    if (invoiceNotifications.length > 0) {
      const companyName = settings.general?.company?.name || 'إدارة العقارات';
      for (const n of invoiceNotifications) {
        const message = `السلام عليكم ${n.tenantName}،\nنود إبلاغكم بصدور فاتورة إيجار الوحدة (${n.unitName}) لشهر ${monthName} بمبلغ ${n.amount} ر.ع.\nتاريخ الاستحقاق: ${n.dueDate}\nشاكرين تعاونكم.\n${companyName}`;
        const phone = n.tenantPhone.replace(/\D/g, '');
        await supabaseData.insert('outgoingNotifications', {
          id: crypto.randomUUID(),
          recipientName: n.tenantName,
          recipientContact: phone,
          message,
          status: 'PENDING',
          createdAt: Date.now(),
        });
      }
    }

    const endTime = performance.now();
    if (count > 0) logOperationTime('generateInvoices', endTime - startTime);
    return count;
  }, [add, logOperationTime, settings]);

  const payoutCommission = useCallback(async (commissionId: string) => {
    if (isReadOnly) { toast.error("النظام في وضع القراءة فقط."); return; }
    const commission = await supabaseData.fetchOne<any>('commissions', commissionId);
    if (!commission) throw new Error("Commission not found.");
    if (commission.status === 'PAID') throw new Error("Already paid.");

    const newExpense = await add('expenses', {
      dateTime: new Date().toISOString(), category: 'عمولات موظفين',
      amount: commission.amount, status: 'POSTED', chargedTo: 'OFFICE',
      payee: commission.staffName || 'Unknown', notes: `صرف عمولة`,
      contractId: null, ref: `COMM-${commissionId.slice(0, 6)}`,
    });

    if (newExpense) {
      await supabaseData.update('commissions', commissionId, { status: 'PAID', expenseId: newExpense.id, paidAt: Date.now() });
      await refreshData();
    }
  }, [isReadOnly, add, refreshData]);

  const updateNotificationTemplate: AppContextType['updateNotificationTemplate'] = useCallback(async (id, updates) => {
    await supabaseData.update('notificationTemplates', id, updates);
    await audit('UPDATE', 'notificationTemplates', id, `Updated template ${id}`);
    await refreshData();
    toast.success('تم تحديث القالب بنجاح.');
  }, [audit, refreshData]);

  const lockPeriod: AppContextType['lockPeriod'] = useCallback(async (ym) => {
    if (!governance) return;
    const updated = { ...governance, lockedPeriods: [...new Set([...governance.lockedPeriods, ym])] };
    await supabaseData.saveGovernance(updated);
    setGovernance(updated);
    await audit('LOCK_PERIOD', 'governance', ym);
    toast.success(`تم إغلاق الفترة ${ym} مالياً.`);
  }, [governance, audit]);

  const unlockPeriod: AppContextType['unlockPeriod'] = useCallback(async (ym) => {
    if (!governance) return;
    const updated = { ...governance, lockedPeriods: governance.lockedPeriods.filter(p => p !== ym) };
    await supabaseData.saveGovernance(updated);
    setGovernance(updated);
    await audit('UNLOCK_PERIOD', 'governance', ym);
    toast.success(`تم إعادة فتح الفترة ${ym} مالياً.`);
  }, [governance, audit]);

  const generateOwnerPortalLink = useCallback(async (ownerId: string): Promise<string> => {
    const owner = await supabaseData.fetchOne<Owner>('owners', ownerId);
    if (!owner) return '';
    let token = owner.portalToken;
    if (!token) {
      token = crypto.randomUUID();
      await supabaseData.update('owners', ownerId, { portalToken: token });
    }
    return `${window.location.href.split('#')[0]}#/portal/${ownerId}?auth=${token}`;
  }, []);

  const rebuildSnapshotsFromJournal = useCallback(async () => {
    toast('بدء إعادة الحساب الكاملة...');
    const startTime = performance.now();
    await refreshData();
    const endTime = performance.now();
    toast.success(`اكتملت إعادة الحساب في ${(endTime - startTime).toFixed(2)} مللي ثانية.`);
    return { duration: endTime - startTime };
  }, [refreshData]);

  const emptyDb: Database = {
    settings: DEFAULT_SETTINGS, auth: { users: [] }, owners: [], properties: [], units: [],
    tenants: [], contracts: [], invoices: [], receipts: [], receiptAllocations: [],
    expenses: [], maintenanceRecords: [], depositTxs: [], auditLog: [],
    governance: { readOnly: false, lockedPeriods: [] }, ownerSettlements: [],
    serials: DEFAULT_SERIALS, snapshots: [], accounts: [], journalEntries: [],
    autoBackups: [], ownerBalances: [], accountBalances: [], kpiSnapshots: [],
    contractBalances: [], tenantBalances: [], notificationTemplates: [],
    outgoingNotifications: [], appNotifications: [], leads: [], lands: [],
    commissions: [], missions: [], budgets: [], attachments: [],
  };

  const activeDb = db || emptyDb;
  const activeSettings = settings || DEFAULT_SETTINGS;

  const dataService: AppContextType['dataService'] = { add, update, remove };
  const financeService: AppContextType['financeService'] = {
    addReceiptWithAllocations, addManualJournalVoucher, voidReceipt, voidExpense,
    generateMonthlyInvoices, payoutCommission,
    generateLateFees: async () => {
      if (!settings) return 0;
      const lateFeeSettings = settings.operational?.lateFee;
      if (!lateFeeSettings?.isEnabled) return 0;
      const today = new Date();
      const overdueInvoices = await supabaseData.fetchWhere<Invoice>('invoices', 'status', 'OVERDUE');
      const existingLateFees = (await supabaseData.fetchAll<Invoice>('invoices')).filter(i => i.type === 'LATE_FEE');
      const lateFeeSrcIds = new Set<string>(existingLateFees.flatMap(i => i.relatedInvoiceId ? [i.relatedInvoiceId] : []));
      let count = 0;
      for (const inv of overdueInvoices) {
        if (lateFeeSrcIds.has(inv.id)) continue;
        const daysLate = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysLate <= (lateFeeSettings.graceDays || 0)) continue;
        const feeAmount = lateFeeSettings.type === 'PERCENTAGE_OF_RENT' ? (inv.amount * lateFeeSettings.value) / 100 : lateFeeSettings.value;
        await add('invoices', { contractId: inv.contractId, dueDate: today.toISOString().slice(0, 10), amount: feeAmount, paidAmount: 0, status: 'UNPAID', type: 'LATE_FEE', notes: `رسوم تأخير على الفاتورة رقم ${inv.no}`, relatedInvoiceId: inv.id });
        count++;
      }
      return count;
    },
  };

  return (
    <AppContext.Provider value={{
      db: activeDb,
      auth: { currentUser: currentUser ?? null, login, logout, changePassword, addUser, updateUser, forcePasswordReset },
      settings: activeSettings,
      updateSettings: async (s) => {
        const ok = await supabaseData.updateSettingsPartial(s);
        if (ok) {
          const newSettings = await supabaseData.getSettings();
          if (newSettings) setSettings(newSettings);
          await audit('UPDATE', 'settings', 'main', `Updated settings: ${Object.keys(s).join(', ')}`);
        }
      },
      rebuildSnapshotsFromJournal, isReadOnly, dataService, financeService,
      runManualAutomation: async () => {
        toast('جاري تشغيل المهام التلقائية...');
        const invoices = await generateMonthlyInvoices();
        const lateFees = await financeService.generateLateFees();
        const result = { invoicesCreated: invoices, lateFeesApplied: lateFees, notificationsCreated: 0, errors: [] };
        if (invoices + lateFees > 0) toast.success(`تم: ${invoices} فاتورة، ${lateFees} غرامة`);
        else toast.success('لا توجد مهام جديدة.');
        return result;
      },
      generateNotifications: async () => {
        if (!settings) return 0;
        const alertDays = settings.operational?.contractAlertDays ?? 30;
        const now = Date.now();
        const activeContracts = await supabaseData.fetchWhere<Contract>('contracts', 'status', 'ACTIVE');
        const existingNotifs = await supabaseData.fetchAll<AppNotification>('appNotifications');
        let count = 0;
        for (const c of activeContracts) {
          const endDate = new Date(c.end).getTime();
          const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 0 || daysLeft > alertDays) continue;
          const contractLink = `/contracts?contractId=${c.id}`;
          const alreadyExists = existingNotifs.some(n => n.link === contractLink);
          if (!alreadyExists) {
            await supabaseData.insert('appNotifications', { id: crypto.randomUUID(), createdAt: now, isRead: false, role: 'ADMIN', type: 'CONTRACT_EXPIRING', title: `عقد ينتهي خلال ${daysLeft} يوم`, message: `عقد المستأجر سينتهي خلال ${daysLeft} يوم.`, link: contractLink });
            count++;
          }
        }
        await refreshData();
        return count;
      },
      updateNotificationTemplate, lockPeriod, unlockPeriod,
      setReadOnly: async (ro) => {
        const updated = { ...(governance || { readOnly: false, lockedPeriods: [] }), readOnly: ro };
        await supabaseData.saveGovernance(updated);
        setGovernance(updated);
        await audit(ro ? 'SET_READ_ONLY' : 'UNSET_READ_ONLY', 'governance', 'main');
      },
      createBackup: async () => {
        const allData = await supabaseData.getAllData();
        return JSON.stringify(allData);
      },
      restoreBackup: async (s) => {
        toast.error('استعادة النسخة الاحتياطية غير متاحة في وضع Supabase. يرجى استخدام لوحة تحكم Supabase.');
      },
      generateOwnerPortalLink, canAccess, isDataStale, performanceMetrics, logOperationTime,
      ownerBalances, contractBalances, tenantBalances,
      createSnapshot: async (note) => {
        await supabaseData.insert('snapshots', { id: crypto.randomUUID(), ts: Date.now(), note, data: await supabaseData.getAllData() });
        toast.success("تم إنشاء نقطة الاستعادة بنجاح.");
      },
      sendWhatsApp: (phone: string, message: string) => IntegrationService.sendWhatsApp(phone, message),
    }}>
      {children}
    </AppContext.Provider>
  );
};
