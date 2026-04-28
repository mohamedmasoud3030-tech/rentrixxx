import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Database, User, Settings, Contract, Expense, Invoice, Receipt, AppContextType, PerformanceMetrics, Tenant, OwnerSettlement, DepositTx, Account, NotificationTemplate, AccountBalance, ContractBalance, TenantBalance, OwnerBalance, KpiSnapshot, AppNotification } from '../types';
import { supabaseData } from '../services/supabaseDataService';
import { supabase } from '@/services/api/supabaseClient';
import { toast } from 'react-hot-toast';
import { confirmDialog } from '../components/shared/confirmDialog';
import { toNumber, round3 } from '../services/financeService';
import { operationsFacade } from '@/domain/operations/operations.facade';
import { deriveInvoiceStatus } from '../services/financeService';

// Import specialized hooks
import { useFinanceHook } from './specialized/useFinanceHook';
import { useOperationsHook } from './specialized/useOperationsHook';
import { useAuthHook } from './specialized/useAuthHook';

const DEFAULT_SETTINGS: Settings = {
    general: { company: { name: 'مشاريع جودة الانطلاقة', address: 'مسقط، سلطنة عمان', phone: '91928186', crNumber: '', taxNumber: '' } },
    operational: {
        currency: 'OMR', taxRate: 5, contractAlertDays: 30,
        lateFee: { isEnabled: false, type: 'FIXED_AMOUNT', value: 10, graceDays: 5 },
        documentNumbering: { invoicePrefix: 'INV', receiptPrefix: 'REC', expensePrefix: 'EXP', contractPrefix: 'CTR' },
        maintenance: { defaultChargedTo: 'OWNER' },
        calendarType: 'gregorian',
    },
    accounting: { accountMappings: { paymentMethods: { CASH: '1111', BANK: '1112', POS: '1112', CHECK: '1112', OTHER: '1111' }, expenseCategories: { 'صيانة': '5110', 'عمولات موظفين': '5102', default: '5120' }, revenue: { RENT: '4110', OFFICE_COMMISSION: '4120', LATE_FEE: '4130' }, accountsReceivable: '1201', vatPayable: '2130', vatReceivable: '1130', ownersPayable: '2121', depositsHeld: '2122' } },
    appearance: { theme: 'light', primaryColor: '#1e3a8a' },
    backup: { autoBackup: { isEnabled: true, passphraseIsSet: false, lastBackupTime: null, lastBackupStatus: null, operationCounter: 0, operationsThreshold: 25 } },
    security: { sessionTimeout: 0 },
    integrations: { geminiApiKey: '', googleDriveSync: { isEnabled: false } },
    documentTemplates: {
        contractClauses: [],
        contractFooterNote: '',
    },
};

const FINANCIAL_TABLES: (keyof Database)[] = ['receipts', 'expenses', 'invoices', 'ownerSettlements', 'maintenanceRecords', 'depositTxs', 'journalEntries', 'receiptAllocations'];
const TABLES_WITHOUT_UPDATED_AT = new Set<keyof Database>(['outgoingNotifications', 'appNotifications', 'notificationTemplates', 'snapshots', 'auditLog']);

const DEFAULT_EMPTY_DB: Database = {
  settings: DEFAULT_SETTINGS,
  auth: { users: [] },
  owners: [],
  properties: [],
  units: [],
  tenants: [],
  contracts: [],
  invoices: [],
  receipts: [],
  receiptAllocations: [],
  expenses: [],
  maintenanceRecords: [],
  depositTxs: [],
  auditLog: [],
  governance: { readOnly: false, lockedPeriods: [] },
  ownerSettlements: [],
  serials: { receipt: 1000, expense: 1000, maintenance: 1000, invoice: 1000, lead: 1000, ownerSettlement: 1000, journalEntry: 1000, mission: 1000, contract: 1000 },
  snapshots: [],
  accounts: [],
  journalEntries: [],
  autoBackups: [],
  ownerBalances: [],
  accountBalances: [],
  kpiSnapshots: [],
  contractBalances: [],
  tenantBalances: [],
  notificationTemplates: [],
  outgoingNotifications: [],
  appNotifications: [],
  leads: [],
  lands: [],
  commissions: [],
  missions: [],
  budgets: [],
  attachments: [],
  utilityRecords: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<Database>(DEFAULT_EMPTY_DB);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataStale, setIsDataStale] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    addReceipt: [], addExpense: [], voidReceipt: [], voidExpense: [], generateInvoices: [], addManualJournalVoucher: [], gateChecks: []
  });
  const reconcileRef = useRef(false);

  const settings = db?.settings || DEFAULT_SETTINGS;
  const isReadOnly = db?.governance?.readOnly || false;

  const logOperationTime = useCallback((op: any, time: number) => {
    setPerformanceMetrics(prev => ({ ...prev, [op]: [...(prev[op] || []), time].slice(-10) }));
  }, []);

  const audit = useCallback(async (action: string, table: string, id: string, details?: string) => {
    try {
      await supabaseData.insert('auditLog', {
        action,
        table,
        entityId: id,
        details: details || '',
        userId: currentUser?.id || 'system',
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  }, [currentUser]);

  const refreshData = useCallback(async () => {
    try {
      const data = await supabaseData.getAllData();
      setDb(data);
      setIsDataStale(false);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      toast.error('فشل تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Specialized Hooks Initialization
  const finance = useFinanceHook(db, settings, isReadOnly, refreshData, audit, setIsDataStale, logOperationTime);
  const operations = useOperationsHook(db, settings, isReadOnly, refreshData, audit, setIsDataStale, logOperationTime);
  const auth = useAuthHook(refreshData, audit);

  const add: AppContextType['dataService']['add'] = useCallback(async (table, entry) => {
    if (isReadOnly) { toast.error('لا يمكن إضافة سجلات في وضع القراءة فقط'); return null; }
    try {
      // Basic validation for tenants and contracts (simplified for brevity)
      if (table === 'tenants') {
        const incomingIdNo = String((entry as any).idNo || '').trim();
        if (db?.tenants?.some(t => t.idNo === incomingIdNo)) {
          toast.error('رقم الهوية مستخدم مسبقاً.');
          return null;
        }
      }

      const id = crypto.randomUUID();
      const now = Date.now();
      const mutableEntry: any = { ...entry, id, createdAt: now };

      // Handle serials
      const serialKeyMap: any = { receipts: 'receipt', expenses: 'expense', invoices: 'invoice', ownerSettlements: 'ownerSettlement', maintenanceRecords: 'maintenance', contracts: 'contract' };
      if (serialKeyMap[table]) {
        mutableEntry.no = String(await supabaseData.incrementSerial(serialKeyMap[table]));
      }

      const result = await supabaseData.insert(table as string, mutableEntry);
      if (result.error) throw new Error(result.error);
      
      await audit('CREATE', String(table), id);

      // Financial posting logic
      if (table === 'invoices') {
        await finance.postInvoiceJournalEntries(mutableEntry as Invoice);
      } else if (table === 'expenses') {
        const e = mutableEntry as Expense;
        const mappings = settings.accounting.accountMappings;
        const cashAccount = mappings.paymentMethods.CASH;
        if (e.chargedTo === 'OWNER') {
          await finance.postJournalEntrySupabase({ dr: mappings.ownersPayable, cr: cashAccount, amount: e.amount, ref: e.id, entityType: 'CONTRACT', entityId: e.contractId || undefined });
        } else {
          const expenseAccount = mappings.expenseCategories[e.category] || mappings.expenseCategories.default;
          await finance.postJournalEntrySupabase({ dr: expenseAccount, cr: cashAccount, amount: e.amount, ref: e.id, entityType: 'CONTRACT', entityId: e.contractId || undefined });
        }
      }

      await refreshData();
      return result.data as any;
    } catch (err: any) {
      toast.error('فشل في إضافة السجل: ' + err.message);
      return null;
    }
  }, [db, isReadOnly, settings, audit, refreshData, finance]);

  const update: AppContextType['dataService']['update'] = useCallback(async (table, id, updates) => {
    if (isReadOnly) { toast.error('لا يمكن التعديل في وضع القراءة فقط'); return; }
    try {
      const normalizedUpdates = TABLES_WITHOUT_UPDATED_AT.has(table as any) ? updates : { ...updates, updatedAt: Date.now() };
      const result = await supabaseData.update(table as string, id, normalizedUpdates);
      if (!result.ok) throw new Error(result.error || 'Update failed');
      
      await audit('UPDATE', String(table), id);
      if (FINANCIAL_TABLES.includes(table as any)) setIsDataStale(true);
      await refreshData();
      toast.success('تم التحديث بنجاح!');
    } catch (err: any) {
      toast.error('خطأ أثناء التحديث: ' + err.message);
    }
  }, [audit, refreshData, isReadOnly]);

  const remove: AppContextType['dataService']['remove'] = useCallback(async (table, id) => {
    if (table === 'contracts') return operations.removeContract(id);
    
    const confirmed = await confirmDialog({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من الحذف؟', confirmLabel: 'حذف نهائي', tone: 'danger' });
    if (!confirmed) return;

    try {
      if (await supabaseData.remove(table as string, id)) {
        await audit('DELETE', String(table), id);
        if (FINANCIAL_TABLES.includes(table as any)) setIsDataStale(true);
        await refreshData();
        toast.success('تم الحذف بنجاح');
      }
    } catch (err: any) {
      toast.error('خطأ أثناء الحذف: ' + err.message);
    }
  }, [audit, refreshData, operations]);

  const value: AppContextType = {
    db,
    isLoading,
    isDataStale,
    performanceMetrics,
    isReadOnly,
    settings,
    auth: {
      currentUser,
      login: async () => ({ ok: false, msg: '' }),
      logout: () => {},
      changePassword: async () => ({ ok: false }),
      addUser: async () => ({ ok: false, msg: '' }),
      updateUser: async () => {},
      forcePasswordReset: async () => {},
      disableUser: auth.disableUser,
      enableUser: auth.enableUser,
    },
    dataService: { add, update, remove, refreshData },
    financeService: {
      addReceiptWithAllocations: async () => ({ success: false }),
      addManualJournalVoucher: async () => {},
      voidReceipt: finance.voidReceipt,
      voidExpense: finance.voidExpense,
      generateMonthlyInvoices: operations.generateMonthlyInvoices,
      payoutCommission: finance.payoutCommission,
      generateLateFees: async () => 0,
    },
    operationsService: {
      renewContract: operations.renewContract,
    },
    updateSettings: async () => {},
    rebuildSnapshotsFromJournal: async () => ({ duration: 0 }),
    canAccess: () => true,
    createBackup: async () => '',
    restoreBackup: async () => {},
    lockPeriod: async () => {},
    unlockPeriod: async () => {},
    setReadOnly: async () => {},
    logOperationTime,
    ownerBalances: {},
    contractBalances: {},
    tenantBalances: {},
    fetchPaginatedData: async () => ({ data: [] as any, total: 0 }),
    updateNotificationTemplate: async () => {},
    generateNotifications: async () => 0,
    generateOwnerPortalLink: async () => '',
    createSnapshot: async () => {},
    sendWhatsApp: () => {},
    runManualAutomation: async () => ({ success: true, errors: [], warnings: [], runId: '' }),
    getFinancialSummary: async () => null,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
