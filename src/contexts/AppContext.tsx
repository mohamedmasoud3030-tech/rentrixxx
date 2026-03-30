import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef } from 'react';
import { Database, User, Settings, Owner, Property, Unit, Tenant, Contract, Receipt, Expense, MaintenanceRecord, DepositTx, AuditLogEntry, Governance, Serials, Snapshot, Invoice, ReceiptAllocation, Account, JournalEntry, NotificationTemplate, OutgoingNotification, AppContextType, PerformanceMetrics, OperationType, ContractBalance, TenantBalance, OwnerSettlement, DerivedData, AppNotification, Lead, Attachment, OwnerBalance, UtilityRecord, AccountBalance, KpiSnapshot } from '../types';
import { supabaseData } from '../services/supabaseDataService';
import { IntegrationService } from '../services/integrationService';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { confirmDialog } from '../components/shared/confirmDialog';
import { adminCreateUser } from '../services/edgeFunctions';
import { logger } from '../services/logger';
 codex/conduct-full-technical-audit-y73z10
import { postReceiptAtomic, renewContractAtomic, syncUnitStatus, voidReceiptAtomic } from '../services/antiMistakeService';

 main

const DEFAULT_GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';

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
        calendarType: 'gregorian',
    },
    accounting: { accountMappings: { paymentMethods: { CASH: '1111', BANK: '1112', POS: '1112', CHECK: '1112', OTHER: '1111' }, expenseCategories: { 'صيانة': '5110', 'عمولات موظفين': '5102', default: '5120' }, revenue: { RENT: '4110', OFFICE_COMMISSION: '4120' }, accountsReceivable: '1201', vatPayable: '2130', vatReceivable: '1130', ownersPayable: '2121' } },
    appearance: { theme: 'light', primaryColor: '#1e3a8a' },
    backup: { autoBackup: { isEnabled: true, passphraseIsSet: false, lastBackupTime: null, lastBackupStatus: null, operationCounter: 0, operationsThreshold: 25 } },
    security: { sessionTimeout: 0 },
    integrations: { geminiApiKey: DEFAULT_GEMINI_API_KEY, googleDriveSync: { isEnabled: false } },
    documentTemplates: {
        contractClauses: [
            'يعتبر التمهيد السابق جزءًا لا يتجزأ من هذا العقد.',
            'يتجدد العقد تلقائيا طبقا لاحكام المرسوم السلطاني رقم ( 89/6 ) في شان تنظيم العلاقه بين المؤجر والمستاجر سوي المساكن او المحلات التجاريه او الصناعيه وغيرها وتسجيل عقود الايجار الخاصه بها وتعديلاته ما لم يخطر المستاجر المؤجر كتابة برغبته في الاخلاء اقل شي ثلاث اشهر على الاقل اذا مقيد بمده معينه، اما اذا كان العقد مفتوح يلتزم الطرف الثاني (المستاجر) باخطار الطرف الاول قبل شهر من تاريخ الاخلاء اذا لم يرغب في المواصله او دفع ايجار شهر بدل اخطار الاخلاء. كذلك على الطرف الاول (المؤجر) اذا اراد الاخلاء بسبب خارج عن الاراده عليه ابلاغ المستاجر قبل شهر او شهر ونصف على الاقل.',
            'يلتزم الطرف الثاني بان يؤدي الي الطرف الاول اجره شهريا في المواعيد المحددة، ويجب دفعها مقدمًا كل شهر، او خلال مده لا تتجاوز 15 يوما من تاريخ استحقاقه.',
            'في حال تأخر الطرف الثاني (المستأجر) عن سداد قيمة الإيجار في المواعيد المحددة، يحق للطرف الأول (المؤجر) مطالبته فورًا بكامل المبالغ المستحقة، ويكون للطرف الأول الحق في إنهاء العقد من تلقاء نفسه ودون الحاجة إلى حكم قضائي مسبق أو إنذار، واحتفاظه بحقه في المطالبة بجميع التكاليف والمصاريف الناتجة عن ذلك.',
            'على الطرف الاول (المؤجر) مسؤولية الصيانة الأساسية للهيكل والمواد الثابته في العقار.',
            'يلتزم الطرف الثاني (المستأجر) بكامل المسؤولية عن الصيانة الروتينية للعقار، وسداد جميع فواتير الخدمات بما في ذلك الكهرباء والمياه والإنترنت، اعتبارًا من تاريخ بداية العقد وحتى نهاية المدة.',
            'في حال استئجار غرفة فقط، فيتحمل الطرف الأول (المؤجر) كامل فواتير الخدمات طوال مدة العقد، اما الطرف الثاني يتحمل تكاليف الصيانه الناتجه عن استعماله.',
            'في حالة حدوث مشكلة تؤثر على العقار او المماطله في دفع الايجار، يحق للطرف الأول إخراج الطرف الثاني من العقار، ويلزم بدفع اي غرمات ماليه متعلقه بتاخير ايجار او عدم دفع فواتير الخدمات المذكوره.',
            'لا يجوز للمستاجر اجراء اي تغيرات جوهريه داخل العين المؤجره سواء بالهدم او البناء ولا يجوز ان يؤجر للغير من باطنه او يسلبه لخلافه بدون اذن صريح من الطرف الاول واذا خالف ذلك يحق للطرف الاول فسخ العقد بدون سابق انذار.',
            'يلتزم الطرف الثاني برد العين المؤجره في نهايته التعاقد بنفس الحاله التي كانت عليها وقت التعاقد.',
        ],
        contractFooterNote: '',
    },
};

const DEFAULT_SERIALS: Serials = { receipt: 1000, expense: 1000, maintenance: 1000, invoice: 1000, lead: 1000, ownerSettlement: 1000, journalEntry: 1000, mission: 1000, contract: 1000 };

const FINANCIAL_TABLES: (keyof Database)[] = ['receipts', 'expenses', 'invoices', 'ownerSettlements', 'maintenanceRecords', 'depositTxs', 'journalEntries', 'receiptAllocations'];
const STRICT_FINANCIAL_WRITE_TABLES: (keyof Database)[] = ['receipts', 'expenses', 'invoices', 'ownerSettlements', 'depositTxs', 'journalEntries', 'receiptAllocations'];
const TABLES_WITHOUT_UPDATED_AT = new Set<keyof Database>([
  'outgoingNotifications',
  'appNotifications',
  'notificationTemplates',
  'snapshots',
  'auditLog',
]);
const ROUND_SCALE = 3;

const initialPerformanceMetrics: PerformanceMetrics = {
    addReceipt: [], addExpense: [], voidReceipt: [], voidExpense: [], generateInvoices: [], addManualJournalVoucher: [], gateChecks: []
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round3 = (value: number): number => Number(value.toFixed(ROUND_SCALE));

const withRetry = async <T,>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
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
  const reconcileRef = useRef(false);

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

  const deriveInvoiceStatus = useCallback((invoice: Invoice) => {
    const total = round3(toNumber(invoice.amount) + toNumber(invoice.taxAmount));
    const paid = round3(toNumber(invoice.paidAmount));
    if (paid >= total - 0.001) return 'PAID' as Invoice['status'];
    if (new Date(invoice.dueDate).getTime() < Date.now()) return 'OVERDUE' as Invoice['status'];
    if (paid > 0.001) return 'PARTIALLY_PAID' as Invoice['status'];
    return 'UNPAID' as Invoice['status'];
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [allData, settingsData, govData] = await withRetry(() => Promise.all([
        supabaseData.getAllData(),
        supabaseData.getSettings(),
        supabaseData.getGovernance(),
      ]), 1);
      setDb(allData);
      setSettings(settingsData || DEFAULT_SETTINGS);
      setGovernance(govData || { readOnly: false, lockedPeriods: [] });
      setIsDataStale(false);
    } catch (err) {
      logger.error('[AppContext] refreshData error', err);
      toast.error('تعذر تحديث البيانات. تم تفعيل إعادة المحاولة التلقائية.');
    }
  }, []);

  refreshRef.current = refreshData;

  const audit = useCallback(async (action: string, entity: string, entityId: string, note: string = '') => {
    const user = currentUser; if (!user) return;
    await supabaseData.insert('auditLog', { id: crypto.randomUUID(), ts: Date.now(), userId: user.id, username: user.username, action, entity, entityId, note });
  }, [currentUser]);

  const canAccess = useCallback((action: string) => {
    if (!currentUser) return false;
    const capabilityMap: Record<'ADMIN' | 'USER', Set<string>> = {
      ADMIN: new Set(['VIEW_DASHBOARD', 'VIEW_FINANCIALS', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'VIEW_AUDIT_LOG', 'USE_SMART_ASSISTANT']),
 codex/conduct-full-technical-audit-y73z10
      USER: new Set(['VIEW_DASHBOARD', 'VIEW_FINANCIALS', 'USE_SMART_ASSISTANT']),

      USER: new Set(['VIEW_DASHBOARD', 'VIEW_FINANCIALS']),
 main
    };
    return capabilityMap[currentUser.role]?.has(action) || false;
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          if (profile.is_disabled) {
            await supabase.auth.signOut();
            setCurrentUser(null);
            return;
          }
          setCurrentUser({
            id: session.user.id, username: profile.username || session.user.email!.split('@')[0],
            email: session.user.email || '', hash: '', salt: '',
            role: (profile.role as 'ADMIN' | 'USER') || 'USER',
            mustChange: profile.must_change_password || false, createdAt: profile.created_at || Date.now(),
            isDisabled: false,
          });
        } else { setCurrentUser(null); }
      } else { setCurrentUser(null); }
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) { setCurrentUser(null); return; }
      if (event === 'TOKEN_REFRESHED' && session.user) {
        const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', session.user.id).single();
        if (profile?.is_disabled) {
          await supabase.auth.signOut();
          setCurrentUser(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser === undefined || currentUser === null) return;
    const init = async () => {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      if ((count ?? 0) === 1 && currentUser.role !== 'ADMIN') {
        await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', currentUser.id);
        setCurrentUser({ ...currentUser, role: 'ADMIN' });
      }
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
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const isFirstUser = (count ?? 0) === 0;
        const newProfile = { id: data.user.id, username: data.user.email!.split('@')[0], role: isFirstUser ? 'ADMIN' : 'USER', must_change_password: false, created_at: Date.now() };
        await supabase.from('profiles').insert(newProfile);
        profile = newProfile;
      }
      if (profile.is_disabled) {
        await supabase.auth.signOut();
        return { ok: false, msg: 'هذا الحساب معطّل. تواصل مع مدير النظام.' };
      }
      const user: User = { id: data.user.id, username: profile.username || data.user.email!.split('@')[0], email: data.user.email || '', hash: '', salt: '', role: (profile.role as 'ADMIN' | 'USER') || 'USER', mustChange: profile.must_change_password || false, createdAt: profile.created_at || Date.now(), isDisabled: false };
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
    const result = await adminCreateUser({ email, password: pass, username: user.username, role: user.role });
    await audit('CREATE', 'users', result.id, `Created user ${user.username}`);
    await refreshData();
    return { ok: true, msg: 'تم إنشاء المستخدم. سيتلقى المستخدم رسالة تأكيد بالبريد الإلكتروني.' };
 codex/conduct-full-technical-audit-y73z10
  }, [audit, refreshData, db?.contracts, db?.maintenanceRecords]);

  }, [audit, refreshData]);
 main

  const updateUser: AppContextType['auth']['updateUser'] = useCallback(async (id, updates) => {
    if (updates.username) await supabase.from('profiles').update({ username: updates.username }).eq('id', id);
    if (updates.role) await supabase.from('profiles').update({ role: updates.role }).eq('id', id);
    await audit('UPDATE', 'users', id, `Updated user details`);
  }, [audit]);

  const forcePasswordReset = useCallback(async (userId: string) => {
    const confirmed = await confirmDialog({
      title: 'تأكيد تصفير كلمة المرور',
      message: 'هل أنت متأكد من رغبتك في فرض إعادة تعيين كلمة المرور لهذا المستخدم؟',
      confirmLabel: 'تأكيد التصفير',
      tone: 'danger',
    });
    if (!confirmed) return;

    await supabase.from('profiles').update({ must_change_password: true }).eq('id', userId);
    await audit('FORCE_RESET_PASSWORD', 'users', userId);
    if (currentUser?.id === userId) {
      await supabase.auth.signOut();
    }
    toast.success('تم فرض إعادة تعيين كلمة المرور. سيتطلب تغيير كلمة المرور عند الدخول التالي.');
  }, [audit, currentUser]);

  const disableUser = useCallback(async (userId: string) => {
    if (currentUser?.id === userId) { toast.error('لا يمكنك تعطيل حسابك الخاص.'); return; }

    const confirmed = await confirmDialog({
      title: 'تأكيد تعطيل المستخدم',
      message: 'هل أنت متأكد من تعطيل هذا المستخدم؟ سيتم حظر وصوله عند انتهاء الجلسة الحالية أو تحديثها.',
      confirmLabel: 'تعطيل المستخدم',
      tone: 'danger',
    });
    if (!confirmed) return;

    await supabase.from('profiles').update({ is_disabled: true }).eq('id', userId);
    await audit('DISABLE_USER', 'users', userId);
    await refreshData();
    toast.success('تم تعطيل المستخدم. سيُحظر عند انتهاء جلسته أو تحديث التوكن.');
  }, [currentUser, audit, refreshData]);

  const enableUser = useCallback(async (userId: string) => {
    await supabase.from('profiles').update({ is_disabled: false }).eq('id', userId);
    await audit('ENABLE_USER', 'users', userId);
    await refreshData();
    toast.success('تم تفعيل المستخدم بنجاح.');
  }, [audit, refreshData]);

  const postJournalEntrySupabase = useCallback(async (params: { dr: string; cr: string; amount: number; ref: string; date?: string; entityType?: 'CONTRACT' | 'TENANT'; entityId?: string }) => {
    // Validate entityType if provided
    if (params.entityType && !['CONTRACT', 'TENANT'].includes(params.entityType)) {
      throw new Error(`Invalid entityType: ${params.entityType}. Must be 'CONTRACT' or 'TENANT'`);
    }
    
    const now = Date.now();
    const date = params.date || new Date().toISOString().slice(0, 10);
    const voucherNo = String(await supabaseData.incrementSerial('journalEntry'));
    const entries = [
      { id: crypto.randomUUID(), no: voucherNo, date, accountId: params.dr, amount: params.amount, type: 'DEBIT' as const, sourceId: params.ref, entityType: params.entityType, entityId: params.entityId, createdAt: now },
      { id: crypto.randomUUID(), no: voucherNo, date, accountId: params.cr, amount: params.amount, type: 'CREDIT' as const, sourceId: params.ref, entityType: params.entityType, entityId: params.entityId, createdAt: now },
    ];
    await supabaseData.bulkInsert('journalEntries', entries);
  }, []);

  const postInvoiceJournalEntries = useCallback(async (invoice: Invoice) => {
    if (!settings) return;
    const mappings = settings.accounting.accountMappings;
    const arAccount = mappings.accountsReceivable;
    const typeCreditMap: Record<Invoice['type'], string> = {
      RENT: mappings.revenue.RENT,
      LATE_FEE: mappings.revenue.RENT,
      MAINTENANCE: mappings.revenue.RENT,
      UTILITY: mappings.revenue.RENT,
    };
    const revenueAccount = typeCreditMap[invoice.type] || mappings.revenue.RENT;
    const netAmount = Math.max(0, toNumber(invoice.amount));
    const taxAmount = Math.max(0, toNumber(invoice.taxAmount));
    if (netAmount > 0.001) {
      await postJournalEntrySupabase({
        dr: arAccount,
        cr: revenueAccount,
        amount: netAmount,
        ref: invoice.id,
        date: invoice.dueDate,
        entityType: 'CONTRACT',
        entityId: invoice.contractId,
      });
    }
    if (taxAmount > 0.001 && mappings.vatPayable) {
      await postJournalEntrySupabase({
        dr: arAccount,
        cr: mappings.vatPayable,
        amount: taxAmount,
        ref: `${invoice.id}-tax`,
        date: invoice.dueDate,
        entityType: 'CONTRACT',
        entityId: invoice.contractId,
      });
    }
  }, [settings, postJournalEntrySupabase]);

  const createRentInvoicesForContract = useCallback(async (contract: Contract) => {
    if (!settings) return 0;
    const taxRate = settings.operational?.taxRate ?? 0;
    const now = Date.now();
    const startDate = new Date(`${contract.start}T00:00:00`);
    const endDate = new Date(`${contract.end}T23:59:59`);
    const lastRelevant = contract.status === 'ACTIVE'
      ? new Date(Math.min(now, endDate.getTime()))
      : endDate;
    if (lastRelevant.getTime() < startDate.getTime()) return 0;

    const existing = await supabaseData.fetchWhere<Invoice>('invoices', 'contractId', contract.id);
    const existingRentYm = new Set(
      existing
        .filter(inv => inv.type === 'RENT')
        .map(inv => inv.dueDate.slice(0, 7))
    );

    let createdCount = 0;
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endCursor = new Date(lastRelevant.getFullYear(), lastRelevant.getMonth(), 1);

    while (cursor.getTime() <= endCursor.getTime()) {
      const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      if (!existingRentYm.has(ym)) {
        const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const safeDay = Math.min(Math.max(contract.dueDay || 1, 1), daysInMonth);
        let dueDate = `${ym}-${String(safeDay).padStart(2, '0')}`;
        if (ym === contract.start.slice(0, 7) && dueDate < contract.start) dueDate = contract.start;
        if (dueDate <= contract.end) {
          const taxAmount = round3((toNumber(contract.rent) * taxRate) / 100);
          const invoiceStatus = new Date(`${dueDate}T23:59:59`).getTime() < now ? 'OVERDUE' : 'UNPAID';
          const no = String(await supabaseData.incrementSerial('invoice'));
          const invoice: Invoice = {
            id: crypto.randomUUID(),
            no,
            contractId: contract.id,
            dueDate,
            amount: toNumber(contract.rent),
            taxAmount: taxAmount > 0.001 ? taxAmount : undefined,
            paidAmount: 0,
            status: invoiceStatus,
            type: 'RENT',
            notes: `فاتورة إيجار شهر ${ym}`,
            createdAt: Date.now(),
          };
          const inserted = await supabaseData.insert<Invoice>('invoices', invoice);
          if (!inserted.error && inserted.data) {
            await postInvoiceJournalEntries(invoice);
            createdCount++;
          }
        }
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return createdCount;
  }, [settings, postInvoiceJournalEntries]);

  const add: AppContextType['dataService']['add'] = useCallback(async (table, entry) => {
    if (isReadOnly || !settings) { toast.error('لا يمكن إضافة سجلات في وضع القراءة فقط'); return null; }
    try {
      if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
      if (table === 'receipts') {
        toast.error('إضافة سند القبض يجب أن تتم عبر خدمة التخصيصات.');
        return null;
      }
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
      if (table === 'contracts') {
        const newNo = await supabaseData.incrementSerial('contract');
        mutableEntry['no'] = String(newNo);
      }

      const result = await supabaseData.insert(table as string, mutableEntry);
      if (result.error) { toast.error(`فشل في إضافة السجل: ${result.error}`); return null; }
      if (!result.data) { toast.error('فشل في إضافة السجل: لم يتم استرجاع البيانات'); return null; }
      
      await audit('CREATE', String(table), id);

      const mappings = settings.accounting?.accountMappings;
      if (table === 'invoices') {
        const invoice = mutableEntry as unknown as Invoice;
        await postInvoiceJournalEntries(invoice);
      } else if (table === 'contracts') {
        await createRentInvoicesForContract(mutableEntry as unknown as Contract);
        await syncUnitStatus((mutableEntry as unknown as Contract).unitId);
      } else if (table === 'expenses') {
        const e = mutableEntry as unknown as Expense;
        const cashAccount = mappings.paymentMethods.CASH;
        if (e.chargedTo === 'OWNER') {
          const ownersPayableAccount = mappings.ownersPayable || '2121';
          await postJournalEntrySupabase({ dr: ownersPayableAccount, cr: cashAccount, amount: e.amount, ref: e.id, entityType: 'CONTRACT', entityId: e.contractId || undefined });
        } else {
          const expenseAccount = mappings.expenseCategories[e.category] || mappings.expenseCategories.default;
          const taxAmount = e.taxAmount ?? 0;
          const netAmount = e.amount - taxAmount;
          if (taxAmount > 0.001 && mappings.vatReceivable) {
            if (netAmount > 0.001) {
              await postJournalEntrySupabase({ dr: expenseAccount, cr: cashAccount, amount: netAmount, ref: e.id, entityType: 'CONTRACT', entityId: e.contractId || undefined });
            }
            await postJournalEntrySupabase({ dr: mappings.vatReceivable, cr: cashAccount, amount: taxAmount, ref: `${e.id}-tax`, entityType: 'CONTRACT', entityId: e.contractId || undefined });
          } else {
            await postJournalEntrySupabase({ dr: expenseAccount, cr: cashAccount, amount: e.amount, ref: e.id, entityType: 'CONTRACT', entityId: e.contractId || undefined });
          }
        }
      } else if (table === 'ownerSettlements') {
        const s = mutableEntry as unknown as OwnerSettlement;
        const cashAccount = mappings.paymentMethods[s.method === 'CASH' ? 'CASH' : 'BANK'];
        const ownersPayableAccount = mappings.ownersPayable || '2121';
        await postJournalEntrySupabase({ dr: ownersPayableAccount, cr: cashAccount, amount: s.amount, ref: s.id });
      } else if (table === 'depositTxs') {
        const d = mutableEntry as unknown as DepositTx;
        const cashAccount = mappings.paymentMethods.CASH;
        const liabilityAccount = mappings.ownersPayable || '2121';
        const revenueAccount = mappings.revenue.RENT;
        if (d.type === 'DEPOSIT_IN') {
          await postJournalEntrySupabase({ dr: cashAccount, cr: liabilityAccount, amount: d.amount, ref: d.id, entityType: 'CONTRACT', entityId: d.contractId });
        } else if (d.type === 'DEPOSIT_RETURN') {
          await postJournalEntrySupabase({ dr: liabilityAccount, cr: cashAccount, amount: d.amount, ref: d.id, entityType: 'CONTRACT', entityId: d.contractId });
        } else if (d.type === 'DEPOSIT_DEDUCT') {
          await postJournalEntrySupabase({ dr: liabilityAccount, cr: revenueAccount, amount: d.amount, ref: d.id, entityType: 'CONTRACT', entityId: d.contractId });
        }
      }

      await syncSnapshots();
      await refreshData();
      toast.success('تمت الإضافة بنجاح!');
      return mutableEntry as unknown as Database[typeof table][number];
    } catch (err: any) {
      console.error('[AppContext] add error:', err);
      toast.error(`خطأ أثناء الإضافة: ${err?.message || 'خطأ غير معروف'}`);
      return null;
    }
  }, [isReadOnly, settings, audit, postJournalEntrySupabase, postInvoiceJournalEntries, createRentInvoicesForContract, refreshData]);

  const addReceiptWithAllocations: AppContextType['financeService']['addReceiptWithAllocations'] = useCallback(async (receiptData, allocations) => {
    if (isReadOnly || !settings) return;
    const startTime = performance.now();
    try {
      if (!allocations.length) {
        toast.error('يجب إضافة تخصيص واحد على الأقل.');
        return;
      }
      const allocationTotal = round3(allocations.reduce((sum, alloc) => sum + toNumber(alloc.amount), 0));
      const receiptTotal = round3(toNumber(receiptData.amount));
      if (Math.abs(allocationTotal - receiptTotal) > 0.001) {
        toast.error('مجموع التخصيصات يجب أن يساوي مبلغ السند.');
        return;
      }
      const newNo = await supabaseData.incrementSerial('receipt');
      const newReceipt: Receipt = { ...receiptData, id: crypto.randomUUID(), createdAt: Date.now(), no: String(newNo), status: 'POSTED' as const };
      const newAllocations = allocations.map(a => ({ id: crypto.randomUUID(), receiptId: newReceipt.id, ...a, createdAt: Date.now() }));

      let totalVatCollected = 0;
      const invoiceUpdates: Array<{ id: string; paid_amount: number; status: string }> = [];
      for (const alloc of allocations) {
        const invoices = await supabaseData.fetchWhere<Invoice>('invoices', 'id', alloc.invoiceId);
        const invoice = invoices[0];
        if (!invoice) continue;
        const invoiceTotal = round3(invoice.amount + (invoice.taxAmount || 0));
        const invoiceRemaining = round3(invoiceTotal - invoice.paidAmount);
        if (alloc.amount - invoiceRemaining > 0.001) {
          toast.error(`قيمة التخصيص تتجاوز المتبقي في الفاتورة ${invoice.no}.`);
          return;
        }
        const newPaid = round3(invoice.paidAmount + alloc.amount);
        const newStatus = newPaid >= invoiceTotal - 0.001 ? 'PAID' : 'PARTIALLY_PAID';
        invoiceUpdates.push({ id: invoice.id, paid_amount: newPaid, status: newStatus });
        if (invoice.taxAmount && invoiceTotal > 0) {
          totalVatCollected += (alloc.amount / invoiceTotal) * invoice.taxAmount;
        }
      }

      const mappings = settings.accounting?.accountMappings;
      const cashAccount = mappings.paymentMethods[newReceipt.channel];
      const arAccount = mappings.accountsReceivable;
      const revenueAccount = mappings.revenue.RENT;
      const ownersPayableAccount = mappings.ownersPayable;
      const officeCommissionAccount = mappings.revenue.OFFICE_COMMISSION;

      const journalEntries: JournalEntry[] = [];
      const appendVoucher = async (params: { dr: string; cr: string; amount: number; ref: string; entityType?: 'CONTRACT' | 'TENANT'; entityId?: string }) => {
        const voucherNo = String(await supabaseData.incrementSerial('journalEntry'));
        const now = Date.now();
        journalEntries.push(
          { id: crypto.randomUUID(), no: voucherNo, date: newReceipt.dateTime.slice(0, 10), accountId: params.dr, amount: round3(params.amount), type: 'DEBIT', sourceId: params.ref, entityType: params.entityType, entityId: params.entityId, createdAt: now },
          { id: crypto.randomUUID(), no: voucherNo, date: newReceipt.dateTime.slice(0, 10), accountId: params.cr, amount: round3(params.amount), type: 'CREDIT', sourceId: params.ref, entityType: params.entityType, entityId: params.entityId, createdAt: now },
        );
      };

      await appendVoucher({
        dr: cashAccount,
        cr: arAccount,
        amount: newReceipt.amount,
        ref: newReceipt.id,
        entityType: 'CONTRACT',
        entityId: newReceipt.contractId
      });

      // 2. Reclassification: Move Rent from Revenue to Owner Payable & Office Commission
      // This happens only for RENT type receipts (which we assume all contract receipts are for now)
      const contract = db?.contracts?.find(c => c.id === newReceipt.contractId);
      if (contract && revenueAccount && ownersPayableAccount && officeCommissionAccount) {
          const unit = db?.units?.find(u => u.id === contract.unitId);
          const property = unit ? db?.properties?.find(p => p.id === unit.propertyId) : null;
          const owner = property ? db?.owners?.find(o => o.id === property.ownerId) : null;
          
          if (owner) {
              const netRent = round3(newReceipt.amount - totalVatCollected);
              let commission = 0;
              if (owner.commissionType === 'RATE') {
                  commission = round3(netRent * (owner.commissionValue / 100));
              } else if (owner.commissionType === 'FIXED_MONTHLY') {
                  // If it's fixed monthly, we only take it once? 
                  // Or take it from the first receipt of the month?
                  // For simplicity and to ensure the owner is credited, we'll treat it as 0 here
                  // and assume fixed commissions are handled via manual expenses or monthly tasks.
                  commission = 0; 
              }
              
              const netToOwner = round3(netRent - commission);
              
              if (netToOwner > 0.001) {
                  await appendVoucher({
                    dr: revenueAccount, 
                    cr: ownersPayableAccount, 
                    amount: netToOwner, 
                    ref: `${newReceipt.id}-own`, 
                    entityType: 'CONTRACT', 
                    entityId: newReceipt.contractId 
                  });
              }
              
              if (commission > 0.001) {
                  await appendVoucher({
                    dr: revenueAccount, 
                    cr: officeCommissionAccount, 
                    amount: commission, 
                    ref: `${newReceipt.id}-com`, 
                    entityType: 'CONTRACT', 
                    entityId: newReceipt.contractId 
                  });
              }
          }
      }

      const breakdown = await postReceiptAtomic({
        receipt: {
          id: newReceipt.id, no: newReceipt.no, contract_id: newReceipt.contractId, date_time: newReceipt.dateTime,
          channel: newReceipt.channel, amount: round3(newReceipt.amount), ref: newReceipt.ref, notes: newReceipt.notes,
          status: newReceipt.status, created_at: newReceipt.createdAt, check_number: newReceipt.checkNumber || '',
          check_bank: newReceipt.checkBank || '', check_date: newReceipt.checkDate || '', check_status: newReceipt.checkStatus || '',
        },
        allocations: newAllocations.map(a => ({ id: a.id, receipt_id: a.receiptId, invoice_id: a.invoiceId, amount: round3(a.amount), created_at: a.createdAt })),
        invoiceUpdates,
        journalEntries: journalEntries.map(j => ({
          id: j.id, no: j.no, date: j.date, account_id: j.accountId, amount: round3(j.amount), type: j.type, source_id: j.sourceId,
          entity_type: j.entityType || '', entity_id: j.entityId || '', created_at: j.createdAt
        })),
      });
      if (!breakdown.ok) {
        toast.error(`فشل الترحيل الذري: ${String(breakdown.details?.message || 'خطأ غير معروف')}`);
        return;
      }

      await audit('CREATE', 'receipts', newReceipt.id, `Created receipt ${newReceipt.no} with ${allocations.length} allocations. VAT: ${totalVatCollected.toFixed(3)}, Net to Owner: ${(newReceipt.amount - totalVatCollected).toFixed(3)}`);

      const endTime = performance.now();
      logOperationTime('addReceipt', endTime - startTime);
      setIsDataStale(true);
      await refreshData();
      toast.success(`تم تسجيل السند بنجاح (سند + تخصيص + قيود)`);
    } catch (err: any) {
      console.error('addReceiptWithAllocations failed:', err);
      toast.error('حدث خطأ أثناء تسجيل السند: ' + (err?.message || 'خطأ غير معروف'));
      await refreshData();
    }
  }, [isReadOnly, settings, audit, logOperationTime, refreshData, db]);

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
    try {
      if (STRICT_FINANCIAL_WRITE_TABLES.includes(table as keyof Database)) {
        toast.error('تعديل مباشر غير مسموح. خطوات الاسترجاع: 1) إلغاء الحركة الحالية 2) مراجعة القيود العكسية 3) إعادة التسجيل بالقيم الصحيحة.');
        return;
      }
      const normalizedUpdates = TABLES_WITHOUT_UPDATED_AT.has(table as keyof Database)
        ? { ...updates }
        : { ...updates, updatedAt: Date.now() };
      const result = await supabaseData.update(table as string, id, normalizedUpdates);
      if (!result.ok) { toast.error(`فشل التحديث: ${result.error}`); return; }
      if (table === 'contracts') {
        const contractUnitId = db?.contracts?.find(c => c.id === id)?.unitId;
        if (contractUnitId) await syncUnitStatus(contractUnitId);
      }
      if (table === 'maintenanceRecords') {
        const maintenanceUnitId = db?.maintenanceRecords?.find(m => m.id === id)?.unitId;
        if (maintenanceUnitId) await syncUnitStatus(maintenanceUnitId);
      }
      await audit('UPDATE', String(table), id);
      if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
      await refreshData();
      toast.success('تم التحديث بنجاح!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطأ غير معروف';
      console.error('[AppContext] update error:', err);
      toast.error(`خطأ أثناء التحديث: ${message}`);
    }
  }, [audit, refreshData]);

  const remove: AppContextType['dataService']['remove'] = useCallback(async (table, id) => {
    const confirmed = await confirmDialog({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'حذف نهائي',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      const ok = await supabaseData.remove(table as string, id);
      if (!ok) throw new Error('Delete failed');
      if (table === 'contracts') {
        const relatedUnit = db?.contracts?.find(c => c.id === id)?.unitId;
        if (relatedUnit) await syncUnitStatus(relatedUnit);
      }
      await audit('DELETE', String(table), id);
      if (FINANCIAL_TABLES.includes(table as keyof Database)) setIsDataStale(true);
      await refreshData();
      toast.success('تم الحذف بنجاح');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء محاولة الحذف.';
      console.error('Delete error:', error);
      toast.error(message);
    }
  }, [audit, refreshData, db?.contracts]);

  const reverseAllJournalEntries = useCallback(async (sourceId: string) => {
    const entries = await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', sourceId);
    const debits = entries.filter(e => e.type === 'DEBIT');
    const credits = entries.filter(e => e.type === 'CREDIT');
    const pairs: { dr: string; cr: string; amount: number }[] = [];
    for (let i = 0; i < Math.min(debits.length, credits.length); i++) {
      pairs.push({ dr: credits[i].accountId, cr: debits[i].accountId, amount: debits[i].amount });
    }
    for (const pair of pairs) {
      await postJournalEntrySupabase({ ...pair, ref: `${sourceId}-void` });
    }
  }, [postJournalEntrySupabase]);

  const voidReceipt: AppContextType['financeService']['voidReceipt'] = useCallback(async (id) => {
    const startTime = performance.now();
    try {
      await audit('VOID', 'receipts', id);
      const allocations = await supabaseData.fetchWhere<ReceiptAllocation>('receiptAllocations', 'receiptId', id);
      const invoiceUpdates: Array<{ id: string; paid_amount: number; status: string }> = [];
      for (const alloc of allocations) {
        const invoices = await supabaseData.fetchWhere<Invoice>('invoices', 'id', alloc.invoiceId);
        const invoice = invoices[0];
        if (!invoice) continue;
        const newPaid = Math.max(0, invoice.paidAmount - alloc.amount);
        const newStatus = newPaid <= 0.001 ? (new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'UNPAID') : 'PARTIALLY_PAID';
        invoiceUpdates.push({ id: invoice.id, paid_amount: round3(newPaid), status: newStatus });
      }
      const sourceEntries = [
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', id)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-own`)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-com`)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-vat`)),
      ];
      const reverseEntries: JournalEntry[] = sourceEntries.map(e => ({
        ...e,
        id: crypto.randomUUID(),
        sourceId: `${e.sourceId}-void`,
        type: e.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
        createdAt: Date.now(),
      }));
      const atomic = await voidReceiptAtomic({
        receiptId: id,
        voidedAt: Date.now(),
        invoiceUpdates,
        reverseEntries: reverseEntries.map(j => ({
          id: j.id, no: j.no, date: j.date, account_id: j.accountId, amount: round3(j.amount), type: j.type, source_id: j.sourceId,
          entity_type: j.entityType || '', entity_id: j.entityId || '', created_at: j.createdAt
        })),
      });
      if (!atomic.ok) throw new Error(String(atomic.details?.message || 'atomic void failed'));

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
  }, [audit, logOperationTime, refreshData]);

  const voidExpense: AppContextType['financeService']['voidExpense'] = useCallback(async (id) => {
    const startTime = performance.now();
    try {
      await supabaseData.update('expenses', id, { status: 'VOID', voidedAt: Date.now() });
      await audit('VOID', 'expenses', id);

      await reverseAllJournalEntries(id);

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
  }, [audit, reverseAllJournalEntries, logOperationTime, refreshData]);

  const generateMonthlyInvoices: AppContextType['financeService']['generateMonthlyInvoices'] = useCallback(async () => {
    if (!settings) return 0;
    const startTime = performance.now();
    const activeContracts = await supabaseData.fetchWhere<Contract>('contracts', 'status', 'ACTIVE');
    let count = 0;
    for (const c of activeContracts) {
      count += await createRentInvoicesForContract(c);
    }

    const endTime = performance.now();
    if (count > 0) logOperationTime('generateInvoices', endTime - startTime);
    if (count > 0) await refreshData();
    return count;
  }, [createRentInvoicesForContract, logOperationTime, settings, refreshData]);

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

  const buildSnapshotState = useCallback((sourceDb: Database) => {
    const accountBalancesMap = new Map<string, number>();
    sourceDb.accounts.forEach(acc => accountBalancesMap.set(acc.id, 0));
    sourceDb.journalEntries.forEach(je => {
      const signed = je.type === 'DEBIT' ? toNumber(je.amount) : -toNumber(je.amount);
      accountBalancesMap.set(je.accountId, round3((accountBalancesMap.get(je.accountId) || 0) + signed));
    });
    const accountBalances: AccountBalance[] = Array.from(accountBalancesMap.entries()).map(([accountId, balance]) => ({ accountId, balance: round3(balance) }));

    const arAccount = sourceDb.settings.accounting.accountMappings.accountsReceivable;
    const contractsMap = new Map(sourceDb.contracts.map(c => [c.id, c]));
    const contractBalancesMap = new Map<string, number>();
    const tenantBalancesMap = new Map<string, number>();

    sourceDb.journalEntries.forEach(je => {
      if (je.accountId !== arAccount) return;
      const signed = je.type === 'DEBIT' ? toNumber(je.amount) : -toNumber(je.amount);
      if (je.entityType === 'CONTRACT' && je.entityId) {
        contractBalancesMap.set(je.entityId, round3((contractBalancesMap.get(je.entityId) || 0) + signed));
        const tenantId = contractsMap.get(je.entityId)?.tenantId;
        if (tenantId) tenantBalancesMap.set(tenantId, round3((tenantBalancesMap.get(tenantId) || 0) + signed));
      } else if (je.entityType === 'TENANT' && je.entityId) {
        tenantBalancesMap.set(je.entityId, round3((tenantBalancesMap.get(je.entityId) || 0) + signed));
      }
    });

    const contractBalances: ContractBalance[] = Array.from(contractBalancesMap.entries()).map(([contractId, balance]) => {
      const contract = contractsMap.get(contractId);
      return {
        contractId,
        tenantId: contract?.tenantId || '',
        unitId: contract?.unitId || '',
        balance: round3(balance),
        depositBalance: 0,
        lastUpdatedAt: Date.now(),
      };
    }).filter(row => row.tenantId && row.unitId);

    const tenantBalances: TenantBalance[] = Array.from(tenantBalancesMap.entries()).map(([tenantId, balance]) => ({
      tenantId,
      balance: round3(balance),
      lastUpdatedAt: Date.now(),
    }));

    const receiptsMap = new Map(sourceDb.receipts.map(r => [r.id, r]));
    const expensesMap = new Map(sourceDb.expenses.map(e => [e.id, e]));
    const settlementsMap = new Map(sourceDb.ownerSettlements.map(s => [s.id, s]));
    const unitsMap = new Map(sourceDb.units.map(u => [u.id, u]));
    const propertiesMap = new Map(sourceDb.properties.map(p => [p.id, p]));
    const ownerBalancesMap = new Map(sourceDb.owners.map(o => [o.id, { ownerId: o.id, collections: 0, expenses: 0, settlements: 0, officeShare: 0, net: 0 }]));
    const ownersPayableAccount = sourceDb.settings.accounting.accountMappings.ownersPayable;
    const officeCommissionAccount = sourceDb.settings.accounting.accountMappings.revenue.OFFICE_COMMISSION;

    const resolveOwnerId = (sourceId: string): string | null => {
      const cleanId = sourceId.split('-')[0];
      const settlement = settlementsMap.get(cleanId);
      if (settlement) return settlement.ownerId;
      const receipt = receiptsMap.get(cleanId);
      const expense = expensesMap.get(cleanId);
      const contractId = receipt?.contractId || expense?.contractId;
      if (contractId) {
        const contract = contractsMap.get(contractId);
        if (!contract) return null;
        const unit = unitsMap.get(contract.unitId);
        if (!unit) return null;
        const property = propertiesMap.get(unit.propertyId);
        return property?.ownerId || null;
      }
      if (expense?.ownerId) return expense.ownerId;
      return null;
    };

    sourceDb.journalEntries.forEach(je => {
      const ownerId = resolveOwnerId(je.sourceId);
      if (!ownerId) return;
      const ownerBalance = ownerBalancesMap.get(ownerId);
      if (!ownerBalance) return;
      
      const cleanId = je.sourceId.split('-')[0];

      if (je.accountId === ownersPayableAccount) {
        const signed = je.type === 'CREDIT' ? toNumber(je.amount) : -toNumber(je.amount);
        ownerBalance.net = round3(ownerBalance.net + signed);
        
        if (receiptsMap.has(cleanId)) ownerBalance.collections = round3(ownerBalance.collections + toNumber(je.amount));
        if (expensesMap.has(cleanId)) ownerBalance.expenses = round3(ownerBalance.expenses + toNumber(je.amount));
        if (settlementsMap.has(cleanId)) ownerBalance.settlements = round3(ownerBalance.settlements + toNumber(je.amount));
      }
      
      if (je.accountId === officeCommissionAccount) {
        const signed = je.type === 'CREDIT' ? toNumber(je.amount) : -toNumber(je.amount);
        ownerBalance.officeShare = round3(ownerBalance.officeShare + signed);
        // Office commission reduces what the owner gets, but the net above already includes it 
        // if we credited the owner with (Rent - Commission).
        // If we credit the owner with Rent and then debit them for Commission, it's different.
        // In my new logic, I credit the owner with NetRent. So ownerBalance.net already excludes commission.
      }
    });

    const ownerBalances: OwnerBalance[] = Array.from(ownerBalancesMap.values()).map(item => ({ ...item, net: round3(item.net) }));
    const kpiSnapshot: KpiSnapshot = {
      id: 'main',
      totalOwnerNetBalance: round3(ownerBalances.reduce((sum, row) => sum + row.net, 0)),
      totalContractARBalance: round3(contractBalances.reduce((sum, row) => sum + row.balance, 0)),
      totalTenantARBalance: round3(tenantBalances.reduce((sum, row) => sum + row.balance, 0)),
    };
    return { accountBalances, contractBalances, tenantBalances, ownerBalances, kpiSnapshots: [kpiSnapshot] };
  }, []);

  const runFinancialIntegrityChecks = useCallback((sourceDb: Database) => {
    const issues: string[] = [];
    const allocationsByReceipt = new Map<string, number>();
    sourceDb.receiptAllocations.forEach(alloc => {
      allocationsByReceipt.set(alloc.receiptId, round3((allocationsByReceipt.get(alloc.receiptId) || 0) + toNumber(alloc.amount)));
    });
    sourceDb.receipts.filter(r => r.status === 'POSTED').forEach(receipt => {
      const allocationTotal = allocationsByReceipt.get(receipt.id) || 0;
      if (Math.abs(allocationTotal - toNumber(receipt.amount)) > 0.01) {
        issues.push(`Mismatch receipt allocations ${receipt.id}`);
      }
    });

    const receiptMap = new Map(sourceDb.receipts.map(r => [r.id, r]));
    const paidByInvoice = new Map<string, number>();
    sourceDb.receiptAllocations.forEach(alloc => {
      const receipt = receiptMap.get(alloc.receiptId);
      if (!receipt || receipt.status !== 'POSTED') return;
      paidByInvoice.set(alloc.invoiceId, round3((paidByInvoice.get(alloc.invoiceId) || 0) + toNumber(alloc.amount)));
    });
    sourceDb.invoices.forEach(invoice => {
      if (Math.abs((paidByInvoice.get(invoice.id) || 0) - toNumber(invoice.paidAmount)) > 0.01) {
        issues.push(`Mismatch invoice paidAmount ${invoice.id}`);
      }
    });

    const journalByVoucher = new Map<string, { debit: number; credit: number }>();
    sourceDb.journalEntries.forEach(entry => {
      const voucher = entry.no || entry.sourceId || 'NO_NO';
      const state = journalByVoucher.get(voucher) || { debit: 0, credit: 0 };
      if (entry.type === 'DEBIT') state.debit += toNumber(entry.amount);
      if (entry.type === 'CREDIT') state.credit += toNumber(entry.amount);
      journalByVoucher.set(voucher, state);
      if (!entry.sourceId) issues.push(`Missing sourceId on journal entry ${entry.id}`);
    });
    journalByVoucher.forEach((state, voucherNo) => {
      if (Math.abs(state.debit - state.credit) > 0.01) issues.push(`Unbalanced voucher ${voucherNo}`);
    });
    return issues;
  }, []);

  const syncFinancialConsistency = useCallback(async (sourceDb: Database) => {
    if (reconcileRef.current) return sourceDb;
    reconcileRef.current = true;
    try {
      const now = Date.now();
      const nextDb: Database = { ...sourceDb, invoices: [...sourceDb.invoices], appNotifications: [...sourceDb.appNotifications] };
      let changed = false;
      for (let i = 0; i < nextDb.invoices.length; i++) {
        const invoice = nextDb.invoices[i];
        const nextStatus = deriveInvoiceStatus(invoice);
        if (invoice.status !== nextStatus) {
          await supabaseData.update('invoices', invoice.id, { status: nextStatus });
          nextDb.invoices[i] = { ...invoice, status: nextStatus };
          changed = true;
        }
      }

      const existingOverdueNotifications = nextDb.appNotifications.filter(n => n.type === 'OVERDUE_BALANCE');
      const overdueInvoices = nextDb.invoices.filter(inv => inv.status === 'OVERDUE');
      const overdueIds = new Set(overdueInvoices.map(inv => inv.id));
      const notificationByInvoiceId = new Map<string, AppNotification>();
      existingOverdueNotifications.forEach(n => {
        const invoiceId = n.link.split('invoiceId=')[1];
        if (invoiceId) notificationByInvoiceId.set(invoiceId, n);
      });

      for (const invoice of overdueInvoices) {
        if (!notificationByInvoiceId.has(invoice.id)) {
          const notification: AppNotification = {
            id: crypto.randomUUID(),
            createdAt: now,
            isRead: false,
            role: 'ADMIN',
            type: 'OVERDUE_BALANCE',
            title: 'فاتورة إيجار متأخرة',
            message: `الفاتورة رقم ${invoice.no} متأخرة بمبلغ ${round3(invoice.amount - invoice.paidAmount)}`,
            link: `/finance/invoices?invoiceId=${invoice.id}`,
          };
          await supabaseData.insert('appNotifications', notification);
          nextDb.appNotifications.push(notification);
          changed = true;
        }
      }

      for (const notif of existingOverdueNotifications) {
        const invoiceId = notif.link.split('invoiceId=')[1];
        if (!invoiceId || overdueIds.has(invoiceId)) continue;
        await supabaseData.remove('appNotifications', notif.id);
        nextDb.appNotifications = nextDb.appNotifications.filter(n => n.id !== notif.id);
        changed = true;
      }

      if (changed) {
        const refreshedInvoices = await supabaseData.fetchAll<Invoice>('invoices');
        nextDb.invoices = refreshedInvoices;
        return nextDb;
      }
      return sourceDb;
    } finally {
      reconcileRef.current = false;
    }
  }, [deriveInvoiceStatus]);

  const syncSnapshots = useCallback(async (sourceDb?: Database | null) => {
    const currentDb = sourceDb || db || await supabaseData.getAllData();
    const snapshots = buildSnapshotState(currentDb);
    await supabaseData.upsertMany('accountBalances', snapshots.accountBalances as unknown as Record<string, unknown>[]);
    await supabaseData.upsertMany('ownerBalances', snapshots.ownerBalances as unknown as Record<string, unknown>[]);
    await supabaseData.upsertMany('contractBalances', snapshots.contractBalances as unknown as Record<string, unknown>[]);
    await supabaseData.upsertMany('tenantBalances', snapshots.tenantBalances as unknown as Record<string, unknown>[]);
    await supabaseData.upsertMany('kpiSnapshots', snapshots.kpiSnapshots as unknown as Record<string, unknown>[]);
    return { ...currentDb, ...snapshots };
  }, [db, buildSnapshotState]);

  const rebuildSnapshotsFromJournal = useCallback(async () => {
    toast('بدء إعادة الحساب الكاملة...');
    const startTime = performance.now();
    const currentDb = db || await supabaseData.getAllData();
    const snapshots = await syncSnapshots(currentDb);
    const issues = runFinancialIntegrityChecks({ ...currentDb, ...snapshots });
    if (issues.length) toast.error(`تم اكتشاف ${issues.length} مشكلة تكامل مالي. راجع السجل.`);
    if (issues.length) console.error('[FinancialIntegrityIssues]', issues);
    await refreshData();
    const endTime = performance.now();
    toast.success(`اكتملت إعادة الحساب في ${(endTime - startTime).toFixed(2)} مللي ثانية.`);
    return { duration: endTime - startTime };
  }, [db, runFinancialIntegrityChecks, refreshData, syncSnapshots]);

  const emptyDb: Database = {
    settings: DEFAULT_SETTINGS, auth: { users: [] }, owners: [], properties: [], units: [],
    tenants: [], contracts: [], invoices: [], receipts: [], receiptAllocations: [],
    expenses: [], maintenanceRecords: [], depositTxs: [], auditLog: [],
    governance: { readOnly: false, lockedPeriods: [] }, ownerSettlements: [],
    serials: DEFAULT_SERIALS, snapshots: [], accounts: [], journalEntries: [],
    autoBackups: [], ownerBalances: [], accountBalances: [], kpiSnapshots: [],
    contractBalances: [], tenantBalances: [], notificationTemplates: [],
    outgoingNotifications: [], appNotifications: [], leads: [], lands: [],
    commissions: [], missions: [], budgets: [], attachments: [], utilityRecords: [],
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

  useEffect(() => {
    if (!db || reconcileRef.current) return;
    const runSync = async () => {
      const synced = await syncFinancialConsistency(db);
      if (synced !== db) {
        setDb(synced);
      }
      const issues = runFinancialIntegrityChecks(synced);
      if (issues.length) console.error('[FinancialIntegrityIssues][Periodic]', issues);
    };
    runSync();
    const intervalId = window.setInterval(runSync, 5 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [db, runFinancialIntegrityChecks, syncFinancialConsistency]);

  return (
    <AppContext.Provider value={{
      db: activeDb,
      auth: { currentUser: currentUser ?? null, login, logout, changePassword, addUser, updateUser, forcePasswordReset, disableUser, enableUser },
      settings: activeSettings,
      updateSettings: async (s) => {
        const ok = await supabaseData.updateSettingsPartial(s);
        if (!ok) {
          throw new Error('فشل تحديث الإعدادات في قاعدة البيانات');
        }
        const newSettings = await supabaseData.getSettings();
        if (newSettings) setSettings(newSettings);
        await audit('UPDATE', 'settings', 'main', `Updated settings: ${Object.keys(s).join(', ')}`);
      },
      rebuildSnapshotsFromJournal, isReadOnly, dataService, financeService,
      runManualAutomation: async () => {
        toast('جاري تشغيل المهام التلقائية...');
        const invoices = await generateMonthlyInvoices();
        const lateFees = await financeService.generateLateFees();
        const notifications = await (async () => {
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
          return count;
        })();
        const result = { invoicesCreated: invoices, lateFeesApplied: lateFees, notificationsCreated: notifications, errors: [] };
        if (invoices + lateFees + notifications > 0) toast.success(`تم: ${invoices} فاتورة، ${lateFees} غرامة، ${notifications} إشعار`);
        else toast.success('لا توجد مهام جديدة.');
        await refreshData();
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
        const allInvoices = await supabaseData.fetchAll<Invoice>('invoices');
        const overdueInvoices = allInvoices.filter(inv => deriveInvoiceStatus(inv) === 'OVERDUE');
        const overdueIds = new Set(overdueInvoices.map(inv => inv.id));
        for (const inv of overdueInvoices) {
          const link = `/finance/invoices?invoiceId=${inv.id}`;
          const exists = existingNotifs.some(n => n.link === link && n.type === 'OVERDUE_BALANCE');
          if (!exists) {
            await supabaseData.insert('appNotifications', { id: crypto.randomUUID(), createdAt: now, isRead: false, role: 'ADMIN', type: 'OVERDUE_BALANCE', title: 'فاتورة متأخرة', message: `الفاتورة رقم ${inv.no} متأخرة بقيمة ${round3(inv.amount - inv.paidAmount)}`, link });
            count++;
          }
        }
        for (const notif of existingNotifs.filter(n => n.type === 'OVERDUE_BALANCE')) {
          const invoiceId = notif.link.split('invoiceId=')[1];
          if (!invoiceId || overdueIds.has(invoiceId)) continue;
          await supabaseData.remove('appNotifications', notif.id);
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
