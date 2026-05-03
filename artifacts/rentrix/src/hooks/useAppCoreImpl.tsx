import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Database, Settings, Expense, Invoice, AppContextType, PerformanceMetrics } from '../types';
import { supabaseData } from '../services/supabaseDataService';
import { apiGet } from '../services/api/apiClient';
import { toast } from 'react-hot-toast';
import { logger } from '../infrastructure/observability';
import { confirmDialog } from '../components/shared/confirmDialog';

import { useFinanceHook } from './specialized/useFinanceHook';
import { useOperationsHook } from './specialized/useOperationsHook';
import { useAuthCore } from './useAuthCore';

import { sendWhatsAppMessage } from '../services/whatsappService';
import { buildSnapshotState, createSnapshotPayload } from '../services/snapshotService';
import { lockPeriodState, unlockPeriodState, setReadOnlyState } from '../services/governanceService';
import { round3 } from '../services/financeService';
import { postReceiptAtomic } from '../services/receiptService';
import type { ReceiptPostingPayload } from '../services/receiptService';
import { runManualAutomation as runManualAutomationService } from '../services/automationService';

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
  documentTemplates: { contractClauses: [], contractFooterNote: '' },
};

const FINANCIAL_TABLES = new Set<keyof Database>(['receipts', 'expenses', 'invoices', 'ownerSettlements', 'maintenanceRecords', 'depositTxs', 'journalEntries', 'receiptAllocations']);
const TABLES_WITHOUT_UPDATED_AT = new Set<keyof Database>(['outgoingNotifications', 'appNotifications', 'notificationTemplates', 'snapshots', 'auditLog']);

const DEFAULT_EMPTY_DB: Database = {
  settings: DEFAULT_SETTINGS,
  auth: { users: [] },
  owners: [], properties: [], units: [], tenants: [], contracts: [],
  invoices: [], receipts: [], receiptAllocations: [], expenses: [],
  maintenanceRecords: [], depositTxs: [], auditLog: [],
  governance: { readOnly: false, lockedPeriods: [] },
  ownerSettlements: [],
  serials: { receipt: 1000, expense: 1000, maintenance: 1000, invoice: 1000, lead: 1000, ownerSettlement: 1000, journalEntry: 1000, mission: 1000, contract: 1000 },
  snapshots: [], accounts: [], journalEntries: [], autoBackups: [],
  ownerBalances: [], accountBalances: [], kpiSnapshots: [], contractBalances: [], tenantBalances: [],
  notificationTemplates: [], outgoingNotifications: [], appNotifications: [],
  leads: [], lands: [], commissions: [], missions: [], budgets: [], attachments: [], utilityRecords: [],
};

/** Extracts a human-readable message from an unknown error value. */
function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'خطأ غير معروف';
}

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
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    addReceipt: [], addExpense: [], voidReceipt: [], voidExpense: [], generateInvoices: [], addManualJournalVoucher: [], gateChecks: []
  });
  const settings = db?.settings || DEFAULT_SETTINGS;
  const isReadOnly = db?.governance?.readOnly || false;

  const logOperationTime = useCallback((op: any, time: number) => {
    setPerformanceMetrics(prev => ({ ...prev, [op]: [...(prev[op] || []), time].slice(-10) }));
  }, []);

  const auditFnRef = useRef<(action: string, table: string, id: string, details?: string) => Promise<void>>(
    async () => {}
  );

  const authCore = useAuthCore(useCallback(
    (action: string, table: string, id: string, details?: string) => auditFnRef.current(action, table, id, details),
    []
  ));

  const currentUserRef = useRef(authCore.currentUser);
  useEffect(() => { currentUserRef.current = authCore.currentUser; }, [authCore.currentUser]);

  // true only once auth has fully initialised and a user is confirmed logged-in.
  // undefined = still loading; null = no session; User object = authenticated.
  const isAuthenticated = authCore.currentUser != null && authCore.currentUser !== undefined;

  const audit = useCallback(async (action: string, table: string, id: string, details?: string) => {
    try {
      await supabaseData.insert('auditLog', {
        action,
        table,
        entityId: id,
        details: details || '',
        userId: currentUserRef.current?.id || 'system',
        // created_at is set by the DB DEFAULT (NOW()); omitting it here avoids
        // a "column not found in schema cache" error from PostgREST when the
        // schema cache hasn't picked up the column yet after migrations.
      });
    } catch (err) {
      logger.error('Audit log failed', { message: errMsg(err) });
    }
  }, []);

  useEffect(() => { auditFnRef.current = audit; }, [audit]);

  const CORE_TABLES = new Set(['properties', 'units', 'contracts', 'invoices']);

  const refreshData = useCallback(async () => {
    try {
      // Core tables (properties, units, contracts, invoices) are fetched exclusively
      // through the authenticated Express API layer so server-side business rules and
      // access control are enforced. Supabase is used for all other tables only.
      const [baseData, propertiesRes, unitsRes, contractsRes, invoicesRes] = await Promise.all([
        supabaseData.getAllData(CORE_TABLES),
        apiGet<{ data: Database['properties'] }>('/api/properties'),
        apiGet<{ data: Database['units'] }>('/api/units'),
        apiGet<{ data: Database['contracts'] }>('/api/contracts'),
        apiGet<{ data: Database['invoices'] }>('/api/invoices'),
      ]);

      const data: Database = {
        ...baseData,
        properties: propertiesRes.data,
        units: unitsRes.data,
        contracts: contractsRes.data,
        invoices: invoicesRes.data,
      };

      setDb(data);
      setIsDataStale(false);
    } catch (err) {
      logger.error('Refresh data failed', { message: errMsg(err) });
      toast.error('فشل تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only fetch data once auth has settled and a session exists.
  // Without this guard, refreshData fires on mount while currentUser is still
  // `undefined` (Supabase is restoring the session from localStorage), which
  // causes all four concurrent apiGet() calls to race for the auth lock and
  // return 401 because the token is not yet available.
  useEffect(() => {
    if (isAuthenticated) refreshData();
  }, [isAuthenticated, refreshData]);

  const finance = useFinanceHook(db, settings, isReadOnly, refreshData, audit, setIsDataStale, logOperationTime);
  const operations = useOperationsHook(db, settings, isReadOnly, refreshData, audit, setIsDataStale, logOperationTime);

  // ── Data Service ─────────────────────────────────────────────────────────────

  const add: AppContextType['dataService']['add'] = useCallback(async (table, entry) => {
    if (isReadOnly) { toast.error('لا يمكن إضافة سجلات في وضع القراءة فقط'); return null; }
    try {
      if (table === 'tenants') {
        const incomingIdNo = String((entry as { idNo?: unknown }).idNo || '').trim();
        if (db?.tenants?.some(t => t.idNo === incomingIdNo)) {
          toast.error('رقم الهوية مستخدم مسبقاً.');
          return null;
        }
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const mutableEntry: Record<string, unknown> = { ...entry, id, createdAt: now };

      // Receipts are excluded here — their serial is assigned atomically inside
      // post_receipt_atomic so incrementing it outside that transaction would
      // risk consuming a number on rollback.  Receipts must go through
      // addReceiptWithAllocations instead of this generic add() path.
      const serialKeyMap: Record<string, string> = { expenses: 'expense', invoices: 'invoice', ownerSettlements: 'ownerSettlement', maintenanceRecords: 'maintenance', contracts: 'contract' };
      if (serialKeyMap[table as string]) {
        mutableEntry['no'] = String(await supabaseData.incrementSerial(serialKeyMap[table as string]));
      }

      const result = await supabaseData.insert(table as string, mutableEntry);
      if (result.error) throw new Error(result.error);

      await audit('CREATE', String(table), id);

      if (table === 'invoices') {
        await finance.postInvoiceJournalEntries(mutableEntry as unknown as Invoice);
      } else if (table === 'expenses') {
        const e = mutableEntry as unknown as Expense;
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
      return result.data as ReturnType<AppContextType['dataService']['add']> extends Promise<infer R> ? R : never;
    } catch (err) {
      toast.error('فشل في إضافة السجل: ' + errMsg(err));
      return null;
    }
  }, [db, isReadOnly, settings, audit, refreshData, finance]);

  const update: AppContextType['dataService']['update'] = useCallback(async (table, id, updates) => {
    if (isReadOnly) { toast.error('لا يمكن التعديل في وضع القراءة فقط'); return; }
    try {
      const normalizedUpdates = TABLES_WITHOUT_UPDATED_AT.has(table as keyof Database) ? updates : { ...updates, updatedAt: new Date().toISOString() };
      const result = await supabaseData.update(table as string, id, normalizedUpdates);
      if (!result.ok) throw new Error(result.error || 'Update failed');

      await audit('UPDATE', String(table), id);
      if (FINANCIAL_TABLES.has(table as keyof Database)) setIsDataStale(true);
      await refreshData();
      toast.success('تم التحديث بنجاح!');
    } catch (err) {
      toast.error('خطأ أثناء التحديث: ' + errMsg(err));
    }
  }, [audit, refreshData, isReadOnly]);

  const remove: AppContextType['dataService']['remove'] = useCallback(async (table, id) => {
    if (table === 'contracts') return operations.removeContract(id);

    const confirmed = await confirmDialog({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من الحذف؟', confirmLabel: 'حذف نهائي', tone: 'danger' });
    if (!confirmed) return;

    try {
      if (await supabaseData.remove(table as string, id)) {
        await audit('DELETE', String(table), id);
        if (FINANCIAL_TABLES.has(table as keyof Database)) setIsDataStale(true);
        await refreshData();
        toast.success('تم الحذف بنجاح');
      }
    } catch (err) {
      toast.error('خطأ أثناء الحذف: ' + errMsg(err));
    }
  }, [audit, refreshData, operations]);

  // ── addReceiptWithAllocations ─────────────────────────────────────────────────
  // Validates referential integrity, builds journal entries, then posts atomically
  // via the post_receipt_atomic Supabase RPC (idempotent, single transaction).

  const addReceiptWithAllocations: AppContextType['financeService']['addReceiptWithAllocations'] = useCallback(
    async (receiptData, allocations) => {
      if (isReadOnly) {
        toast.error('النظام في وضع القراءة فقط.');
        return { success: false, error: 'read-only' };
      }
      const startTime = performance.now();
      try {
        // Contract must exist
        const contract = db.contracts.find(c => c.id === receiptData.contractId);
        if (!contract) return { success: false, error: 'العقد غير موجود أو محذوف' };

        // Allocations must sum to receipt amount (within rounding tolerance)
        const totalAllocated = round3(allocations.reduce((s, a) => s + a.amount, 0));
        if (Math.abs(totalAllocated - receiptData.amount) > 0.01) {
          toast.error(`مجموع التخصيصات (${totalAllocated}) لا يساوي مبلغ السند (${receiptData.amount})`);
          return { success: false, error: 'allocation_mismatch' };
        }

        // Every invoice must exist and belong to this contract (no cross-contract allocations)
        for (const alloc of allocations) {
          const invoice = db.invoices.find(i => i.id === alloc.invoiceId);
          if (!invoice) return { success: false, error: `الفاتورة ${alloc.invoiceId.slice(0, 8)} غير موجودة` };
          if (invoice.contractId !== receiptData.contractId) {
            return { success: false, error: 'فاتورة لا تنتمي لهذا العقد — يُمنع التخصيص' };
          }
        }

        const receiptId = crypto.randomUUID();
        const now = new Date().toISOString();
        // Use UUID-derived short references instead of pre-incrementing the serial
        // counter before the atomic RPC call. Pre-incrementing consumed a serial
        // number even when the RPC failed, creating gaps. The RPC itself is
        // responsible for atomically assigning the final human-readable number;
        // the UUID-based reference here is only used to build journal entry IDs.
        const receiptNo = receiptId.slice(0, 8).toUpperCase();
        const voucherNo = crypto.randomUUID().slice(0, 8).toUpperCase();
        const date = receiptData.dateTime?.slice(0, 10) || new Date().toISOString().slice(0, 10);

        // DR: Cash/Bank account per payment channel; CR: Accounts Receivable
        const mappings = settings.accounting.accountMappings;
        const arAccount = mappings.accountsReceivable;
        const cashAccount =
          mappings.paymentMethods[receiptData.channel as keyof typeof mappings.paymentMethods] ||
          mappings.paymentMethods.CASH;

        const journalEntries: ReceiptPostingPayload['journalEntries'] = [
          {
            id: crypto.randomUUID(), no: voucherNo, date,
            account_id: cashAccount,
            amount: round3(receiptData.amount),
            type: 'DEBIT',
            source_id: receiptId,
            entity_type: 'CONTRACT',
            entity_id: receiptData.contractId,
            created_at: now,
          },
          {
            id: crypto.randomUUID(), no: voucherNo, date,
            account_id: arAccount,
            amount: round3(receiptData.amount),
            type: 'CREDIT',
            source_id: receiptId,
            entity_type: 'CONTRACT',
            entity_id: receiptData.contractId,
            created_at: now,
          },
        ];

        const payload: ReceiptPostingPayload = {
          receipt: {
            id: receiptId,
            no: receiptNo,
            contract_id: receiptData.contractId,
            date_time: receiptData.dateTime || new Date().toISOString(),
            amount: round3(receiptData.amount),
            channel: receiptData.channel,
            ref: receiptData.ref || '',
            notes: receiptData.notes || '',
            status: 'POSTED',
            check_number: receiptData.checkNumber ?? null,
            check_bank: receiptData.checkBank ?? null,
            check_date: receiptData.checkDate ?? null,
            check_status: receiptData.checkStatus ?? null,
            voided_at: null,
            created_at: now,
            updated_at: now,
          },
          allocations: allocations.map(a => ({
            id: crypto.randomUUID(),
            receipt_id: receiptId,
            invoice_id: a.invoiceId,
            amount: round3(a.amount),
            created_at: now,
          })),
          journalEntries,
        };

        const result = await postReceiptAtomic(payload);
        if (!result.success) {
          toast.error('فشل ترحيل السند: ' + (result.error || 'خطأ غير معروف'));
          return { success: false, error: result.error };
        }

        // Use the RPC-confirmed values: the DB assigns the sequential receipt
        // number atomically, so we always trust what was actually persisted.
        const confirmedReceiptId = result.receiptId || receiptId;
        const confirmedReceiptNo = result.receiptNo || receiptNo;
        await audit('CREATE', 'receipts', confirmedReceiptId, `SND#${confirmedReceiptNo} - ${receiptData.amount}`);
        logOperationTime('addReceipt', performance.now() - startTime);
        setIsDataStale(true);
        await refreshData();
        toast.success(`تم تسجيل السند رقم ${confirmedReceiptNo} بنجاح`);
        return { success: true, receiptNo: confirmedReceiptNo, allocatedTotal: totalAllocated };
      } catch (err) {
        logger.error('[addReceiptWithAllocations] failed', { message: errMsg(err) });
        toast.error('فشل تسجيل السند: ' + errMsg(err));
        return { success: false, error: errMsg(err) };
      }
    },
    [db, isReadOnly, settings, audit, refreshData, logOperationTime, setIsDataStale]
  );

  // ── addManualJournalVoucher ────────────────────────────────────────────────────
  // Enforces debit == credit balance invariant before posting any lines.

  const addManualJournalVoucher: AppContextType['financeService']['addManualJournalVoucher'] = useCallback(
    async (voucher) => {
      if (isReadOnly) { toast.error('النظام في وضع القراءة فقط.'); return; }
      const startTime = performance.now();
      try {
        const totalDebit  = round3(voucher.lines.reduce((s, l) => s + (l.debit  || 0), 0));
        const totalCredit = round3(voucher.lines.reduce((s, l) => s + (l.credit || 0), 0));

        if (Math.abs(totalDebit - totalCredit) > 0.001) {
          toast.error(`القيد غير متوازن: مدين ${totalDebit} ≠ دائن ${totalCredit}`);
          return;
        }
        if (voucher.lines.length < 2) {
          toast.error('القيد اليدوي يحتاج لسطرين على الأقل');
          return;
        }

        const voucherNo = String(await supabaseData.incrementSerial('journalEntry'));
        const now = new Date().toISOString();
        const sourceId = `MJV-${voucherNo}`;

        const entries = voucher.lines.flatMap(line => {
          const rows: object[] = [];
          if ((line.debit || 0) > 0.001) {
            rows.push({ id: crypto.randomUUID(), no: voucherNo, date: voucher.date, accountId: line.accountId, amount: round3(line.debit), type: 'DEBIT', sourceId, createdAt: now });
          }
          if ((line.credit || 0) > 0.001) {
            rows.push({ id: crypto.randomUUID(), no: voucherNo, date: voucher.date, accountId: line.accountId, amount: round3(line.credit), type: 'CREDIT', sourceId, createdAt: now });
          }
          return rows;
        });

        await supabaseData.bulkInsert('journalEntries', entries);
        await audit('CREATE', 'journalEntries', sourceId, voucher.notes);
        logOperationTime('addManualJournalVoucher', performance.now() - startTime);
        setIsDataStale(true);
        await refreshData();
        toast.success(`تم ترحيل القيد اليدوي رقم ${voucherNo}`);
      } catch (err) {
        logger.error('[addManualJournalVoucher] failed', { message: errMsg(err) });
        toast.error('فشل ترحيل القيد: ' + errMsg(err));
      }
    },
    [isReadOnly, audit, refreshData, logOperationTime, setIsDataStale]
  );

  // ── fetchPaginatedData ────────────────────────────────────────────────────────

  const fetchPaginatedData: AppContextType['fetchPaginatedData'] = useCallback(
    async (table, page, pageSize, orderBy, ascending) => {
      try {
        const result = await supabaseData.fetchPaginated<unknown>(
          table as string, page, pageSize, orderBy, ascending
        );
        return { data: result.data as unknown as Database[typeof table], total: result.total };
      } catch (err) {
        logger.error('[fetchPaginatedData] failed', { message: errMsg(err), table });
        return { data: [] as unknown as Database[typeof table], total: 0 };
      }
    },
    []
  );

  // ── sendWhatsApp ──────────────────────────────────────────────────────────────
  // Opens a wa.me deep-link — primary tenant communication channel in Arabic markets.

  const sendWhatsApp = useCallback((phone: string, message: string) => {
    if (!phone || !message) { toast.error('رقم الهاتف والرسالة مطلوبان'); return; }
    sendWhatsAppMessage(phone, message);
  }, []);

  // ── updateSettings ────────────────────────────────────────────────────────────

  const updateSettings: AppContextType['updateSettings'] = useCallback(async (newSettings) => {
    try {
      const ok = await supabaseData.updateSettingsPartial(newSettings);
      if (!ok) throw new Error('saveSettings returned false');
      await audit('UPDATE', 'settings', 'global', JSON.stringify(Object.keys(newSettings)));
      await refreshData();
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      logger.error('[updateSettings] failed', { message: errMsg(err) });
      toast.error('فشل حفظ الإعدادات: ' + errMsg(err));
    }
  }, [audit, refreshData]);

  // ── lockPeriod / unlockPeriod / setReadOnly ───────────────────────────────────

  const lockPeriod: AppContextType['lockPeriod'] = useCallback(async (ym) => {
    try {
      const ok = await supabaseData.saveGovernance(lockPeriodState(db.governance, ym));
      if (!ok) throw new Error('saveGovernance failed');
      await audit('UPDATE', 'governance', 'lock', `Locked period: ${ym}`);
      await refreshData();
      toast.success(`تم قفل الفترة ${ym}`);
    } catch (err) {
      logger.error('[lockPeriod] failed', { message: errMsg(err) });
      toast.error('فشل قفل الفترة: ' + errMsg(err));
    }
  }, [db.governance, audit, refreshData]);

  const unlockPeriod: AppContextType['unlockPeriod'] = useCallback(async (ym) => {
    try {
      const ok = await supabaseData.saveGovernance(unlockPeriodState(db.governance, ym));
      if (!ok) throw new Error('saveGovernance failed');
      await audit('UPDATE', 'governance', 'unlock', `Unlocked period: ${ym}`);
      await refreshData();
      toast.success(`تم فتح الفترة ${ym}`);
    } catch (err) {
      logger.error('[unlockPeriod] failed', { message: errMsg(err) });
      toast.error('فشل فتح الفترة: ' + errMsg(err));
    }
  }, [db.governance, audit, refreshData]);

  const setReadOnly: AppContextType['setReadOnly'] = useCallback(async (readOnly) => {
    try {
      const ok = await supabaseData.saveGovernance(setReadOnlyState(db.governance, readOnly));
      if (!ok) throw new Error('saveGovernance failed');
      await audit('UPDATE', 'governance', 'readOnly', `Set readOnly: ${readOnly}`);
      await refreshData();
      toast.success(readOnly ? 'تم تفعيل وضع القراءة فقط' : 'تم إلغاء وضع القراءة فقط');
    } catch (err) {
      logger.error('[setReadOnly] failed', { message: errMsg(err) });
      toast.error('فشل تحديث الصلاحيات: ' + errMsg(err));
    }
  }, [db.governance, audit, refreshData]);

  // ── createSnapshot ────────────────────────────────────────────────────────────

  const createSnapshot: AppContextType['createSnapshot'] = useCallback(async (note) => {
    try {
      const userId = currentUserRef.current?.id || 'system';
      const snapshot = createSnapshotPayload(db, note, userId);
      await supabaseData.insert('snapshots', snapshot);
      await audit('CREATE', 'snapshots', snapshot.id, note);
      await refreshData();
      toast.success('تم إنشاء نقطة استرداد بنجاح');
    } catch (err) {
      logger.error('[createSnapshot] failed', { message: errMsg(err) });
      toast.error('فشل إنشاء نقطة الاسترداد: ' + errMsg(err));
    }
  }, [db, audit, refreshData]);

  // ── rebuildSnapshotsFromJournal ───────────────────────────────────────────────
  // Recomputes all five balance-view tables from the journal entries ground truth.

  const rebuildSnapshotsFromJournal: AppContextType['rebuildSnapshotsFromJournal'] = useCallback(async () => {
    const startTime = performance.now();
    try {
      const { accountBalances, contractBalances, tenantBalances, ownerBalances, kpiSnapshots } =
        buildSnapshotState(db);

      await Promise.all([
        supabaseData.upsertMany('accountBalances', accountBalances),
        supabaseData.upsertMany('contractBalances', contractBalances),
        supabaseData.upsertMany('tenantBalances', tenantBalances),
        supabaseData.upsertMany('ownerBalances', ownerBalances),
        supabaseData.upsertMany('kpiSnapshots', kpiSnapshots),
      ]);

      await audit('UPDATE', 'snapshots', 'rebuild', 'Rebuilt all balance snapshots from journal');
      setIsDataStale(true);
      await refreshData();
      const duration = Math.round(performance.now() - startTime);
      toast.success(`تم إعادة بناء الأرصدة (${duration}ms)`);
      return { duration };
    } catch (err) {
      logger.error('[rebuildSnapshotsFromJournal] failed', { message: errMsg(err) });
      toast.error('فشل إعادة بناء الأرصدة: ' + errMsg(err));
      return { duration: 0 };
    }
  }, [db, audit, refreshData, setIsDataStale]);

  // ── generateOwnerPortalLink ───────────────────────────────────────────────────
  // Generates a cryptographically random UUID token, persists it in the owner
  // record (owners.portalToken), and returns the portal URL. The portal page must
  // query Supabase to verify the token matches the owner before showing data —
  // the token alone is the credential for this read-only view.

  const generateOwnerPortalLink: AppContextType['generateOwnerPortalLink'] = useCallback(async (ownerId) => {
    try {
      const owner = db.owners.find(o => o.id === ownerId);
      if (!owner) throw new Error('المالك غير موجود');

      // Use a cryptographically random token (UUID v4 = 128 bits of randomness).
      // Stored server-side so the portal page can validate it via Supabase lookup.
      const token = crypto.randomUUID();
      await supabaseData.update('owners', ownerId, { portalToken: token });
      await audit('CREATE', 'owners', ownerId, 'Generated portal access token');

      const link = `${window.location.origin}/owner-portal?token=${encodeURIComponent(token)}`;
      return link;
    } catch (err) {
      logger.error('[generateOwnerPortalLink] failed', { message: errMsg(err) });
      toast.error('فشل إنشاء رابط البوابة: ' + errMsg(err));
      return '';
    }
  }, [db.owners, audit]);

  // ── createBackup / restoreBackup ──────────────────────────────────────────────

  const createBackup: AppContextType['createBackup'] = useCallback(async () => {
    try {
      const userId = currentUserRef.current?.id || 'system';
      const snapshot = createSnapshotPayload(db, 'Manual Backup', userId);
      const jsonStr = JSON.stringify({ version: 1, createdAt: Date.now(), snapshot }, null, 2);
      await audit('CREATE', 'autoBackups', 'backup', 'Manual backup created');
      toast.success('تم إنشاء النسخة الاحتياطية — سيبدأ التنزيل');
      return jsonStr;
    } catch (err) {
      logger.error('[createBackup] failed', { message: errMsg(err) });
      toast.error('فشل إنشاء النسخة الاحتياطية: ' + errMsg(err));
      return '';
    }
  }, [db, audit]);

  const restoreBackup: AppContextType['restoreBackup'] = useCallback(async (data) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('ملف غير صالح');
      const snapshotData = (parsed as Record<string, unknown>)?.snapshot;
      if (typeof snapshotData !== 'object' || snapshotData === null) throw new Error('ملف النسخة الاحتياطية غير صالح');
      const rawData = (snapshotData as Record<string, unknown>)?.data;
      if (typeof rawData !== 'string') throw new Error('محتوى النسخة الاحتياطية مفقود');

      const restoredDb = JSON.parse(rawData) as Database;
      if (!Array.isArray(restoredDb?.owners) || !Array.isArray(restoredDb?.contracts)) {
        throw new Error('البيانات المستردة ناقصة أو تالفة');
      }

      await supabaseData.saveSettings(restoredDb.settings);
      await supabaseData.saveGovernance(restoredDb.governance);
      await audit('UPDATE', 'autoBackups', 'restore', 'Database restored from backup file');
      await refreshData();
      toast.success('تم استعادة النسخة الاحتياطية بنجاح');
    } catch (err) {
      logger.error('[restoreBackup] failed', { message: errMsg(err) });
      toast.error('فشل استعادة النسخة الاحتياطية: ' + errMsg(err));
    }
  }, [audit, refreshData]);

  // ── generateLateFees ──────────────────────────────────────────────────────────

  const generateLateFees = useCallback(async (): Promise<number> => {
    if (!settings || !db) return 0;
    try {
      const result = await runManualAutomationService(db, settings, {
        invoices: false, lateFees: true, notifications: false, snapshots: false,
      });
      const created = ((result as unknown) as Record<string, Record<string, number>>)?.stats?.lateFeesCreated || 0;
      if (created > 0) {
        setIsDataStale(true);
        await refreshData();
        toast.success(`تم توليد ${created} رسوم تأخير`);
      } else {
        toast('لا توجد فواتير مؤهلة لرسوم التأخير حالياً', { icon: 'ℹ️' });
      }
      return created;
    } catch (err) {
      logger.error('[generateLateFees] failed', { message: errMsg(err) });
      toast.error('فشل توليد رسوم التأخير: ' + errMsg(err));
      return 0;
    }
  }, [db, settings, refreshData, setIsDataStale]);

  // ── updateNotificationTemplate ────────────────────────────────────────────────

  const updateNotificationTemplate: AppContextType['updateNotificationTemplate'] = useCallback(
    async (id, updates) => {
      try {
        const result = await supabaseData.update('notificationTemplates', id, updates);
        if (!result.ok) throw new Error(result.error || 'update failed');
        await audit('UPDATE', 'notificationTemplates', id);
        await refreshData();
        toast.success('تم تحديث القالب بنجاح');
      } catch (err) {
        logger.error('[updateNotificationTemplate] failed', { message: errMsg(err) });
        toast.error('فشل تحديث القالب: ' + errMsg(err));
      }
    },
    [audit, refreshData]
  );

  // ── Context value ─────────────────────────────────────────────────────────────

  const value: AppContextType = {
    db,
    isLoading,
    isDataStale,
    performanceMetrics,
    isReadOnly,
    settings,
    auth: {
      currentUser: authCore.currentUser,
      login: authCore.login,
      logout: authCore.logout,
      changePassword: authCore.changePassword,
      addUser: authCore.addUser,
      updateUser: authCore.updateUser,
      forcePasswordReset: authCore.forcePasswordReset,
      disableUser: authCore.disableUser,
      enableUser: authCore.enableUser,
    },
    dataService: { add, update, remove },
    financeService: {
      addReceiptWithAllocations,
      addManualJournalVoucher,
      voidReceipt: finance.voidReceipt,
      voidExpense: finance.voidExpense,
      generateMonthlyInvoices: operations.generateMonthlyInvoices,
      payoutCommission: finance.payoutCommission,
      generateLateFees,
    },
    operationsService: {
      renewContract: operations.renewContract,
    },
    updateSettings,
    rebuildSnapshotsFromJournal,
    canAccess: authCore.canAccess,
    createBackup,
    restoreBackup,
    lockPeriod,
    unlockPeriod,
    setReadOnly,
    logOperationTime,
    ownerBalances: {},
    contractBalances: {},
    tenantBalances: {},
    fetchPaginatedData,
    updateNotificationTemplate,
    generateOwnerPortalLink,
    createSnapshot,
    sendWhatsApp,
    generateNotifications: operations.generateNotifications,
    runManualAutomation: operations.runManualAutomation,
    getFinancialSummary: async () => null,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
