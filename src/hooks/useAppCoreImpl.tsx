import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Database, Settings, AppContextType, PerformanceMetrics, Serials } from '../types';
import { useAuthCore } from './useAuthCore';
import { useFinanceCore } from './useFinanceCore';
import { useOperationsCore } from './useOperationsCore';
import { supabaseData } from '../services/supabaseDataService';
import { toast } from 'react-hot-toast';
import { logger } from '../services/logger';

const DEFAULT_GEMINI_API_KEY = '';
const DEFAULT_SERIALS: Serials = { receipt: 1000, expense: 1000, maintenance: 1000, invoice: 1000, lead: 1000, ownerSettlement: 1000, journalEntry: 1000, mission: 1000, contract: 1000 };

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
    integrations: { geminiApiKey: DEFAULT_GEMINI_API_KEY, googleDriveSync: { isEnabled: false } },
    documentTemplates: {
        contractClauses: [],
        contractFooterNote: '',
    },
};

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
  serials: DEFAULT_SERIALS,
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
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isDataStale, setIsDataStale] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    addReceipt: [], addExpense: [], voidReceipt: [], voidExpense: [], generateInvoices: [], addManualJournalVoucher: [], gateChecks: []
  });

  const logOperationTime = useCallback((op: string, time: number) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      [op]: [...(prev[op as keyof PerformanceMetrics] || []), time].slice(-10)
    }));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const allData = await supabaseData.getAllData();
      setDb(allData);
      if (allData.settings) setSettings(allData.settings);
      setIsDataStale(false);
    } catch (err) {
      logger.error('[AppContext] refreshData error', err);
    }
  }, []);

  const audit = useCallback(async (action: string, entity: string, entityId: string, note: string = '') => {
    const user = auth.currentUser; 
    if (!user) return;
    await supabaseData.insert('auditLog', { 
      id: crypto.randomUUID(), 
      ts: Date.now(), 
      userId: user.id, 
      username: user.username, 
      action, 
      entity, 
      entityId, 
      note 
    } as any);
  }, [db]); 

  const auth = useAuthCore(audit);
  const finance = useFinanceCore(db, settings, refreshData, audit, logOperationTime, setIsDataStale);
  const operations = useOperationsCore(db, settings, refreshData, audit, logOperationTime, setIsDataStale);

  const value: any = {
    db,
    settings,
    auth: {
      currentUser: auth.currentUser,
      login: auth.login,
      logout: auth.logout,
      changePassword: auth.changePassword,
      addUser: auth.addUser,
      updateUser: auth.updateUser,
      forcePasswordReset: auth.forcePasswordReset,
      disableUser: auth.disableUser,
      enableUser: auth.enableUser,
    },
    updateSettings: async (s: any) => {
      const next = { ...settings, ...s };
      await (supabaseData as any).updateSettings(next);
      setSettings(next);
      toast.success('تم تحديث الإعدادات');
    },
    isReadOnly: db.governance?.readOnly || false,
    canAccess: auth.canAccess,
    isDataStale,
    performanceMetrics,
    logOperationTime,
    dataService: {
      add: async (table: any, entry: any) => {
        const res = await supabaseData.insert(table, entry);
        setIsDataStale(true);
        await refreshData();
        return res;
      },
      update: async (table: any, id: any, updates: any) => {
        await supabaseData.update(table, id, updates);
        setIsDataStale(true);
        await refreshData();
      },
      remove: async (table: any, id: any) => {
        await supabaseData.remove(table, id);
        setIsDataStale(true);
        await refreshData();
      }
    },
    financeService: {
      addReceiptWithAllocations: async () => ({ success: false, error: 'Not implemented' }),
      addManualJournalVoucher: async () => {},
      voidReceipt: finance.voidReceipt,
      voidExpense: finance.voidExpense,
      generateMonthlyInvoices: finance.generateMonthlyInvoices,
      payoutCommission: async () => {},
      generateLateFees: async () => 0,
    },
    rebuildSnapshotsFromJournal: async () => ({ duration: 0 }),
    createBackup: async () => '',
    restoreBackup: async () => {},
    lockPeriod: async () => {},
    unlockPeriod: async () => {},
    setReadOnly: async () => {},
    ownerBalances: {},
    contractBalances: {},
    tenantBalances: {},
    fetchPaginatedData: async () => ({ data: [], total: 0 }),
    updateNotificationTemplate: async () => {},
    generateNotifications: operations.generateNotifications,
    generateOwnerPortalLink: async () => '',
    createSnapshot: async () => {},
    sendWhatsApp: () => {},
    runManualAutomation: async () => ({} as any),
    getFinancialSummary: finance.getFinancialSummary,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
