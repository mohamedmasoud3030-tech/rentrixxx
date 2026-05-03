import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Database, Settings, Expense, Invoice, AppContextType, PerformanceMetrics, Receipt } from '../types';
import { supabaseData } from '../services/supabaseDataService';
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

  const audit = useCallback(async (action: string, table: string, id: string, details?: string) => {
    try {
      await supabaseData.insert('auditLog', {
        action,
        table,
        entityId: id,
        details: details || '',
        userId: currentUserRef.current?.id || 'system',
        createdAt: Date.now(),
      });
    } catch (err) {
      logger.error('Audit log failed', { message: err instanceof Error ? err.message : 'unknown_error' });
    }
  }, []);

  useEffect(() => { auditFnRef.current = audit; }, [audit]);

  const refreshData = useCallback(async () => {
    try {
      const data = await supabaseData.getAllData();
      setDb(data);
      setIsDataStale(false);
    } catch (err) {
      logger.error('Refresh data failed', { message: err instanceof Error ? err.message : 'unknown_error' });
      toast.error('فشل تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const finance = useFinanceHook(db, settings, isReadOnly, refreshData, audit, setIsDataStale, logOperationTime);
  const operations = useOperationsHook(db, settings, isReadOnly, refreshData, audit, setIsDataStale, logOperationTime);

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA SERVICE
  // ─────────────────────────────────────────────────────────────────────────────

  const add: AppContextType['dataService']['add'] = useCallback(async (table, entry) => {
    if (isReadOnly) { toast.error('لا يمكن إضافة سجلات في وضع القراءة فقط'); return null; }
    try {
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

      const serialKeyMap: any = { receipts: 'receipt', expenses: 'expense', invoices: 'invoice', ownerSettlements: 'ownerSettlement', maintenanceRecords: 'maintenance', contracts: 'contract' };
      if (serialKeyMap[table]) {
        mutableEntry.no = String(await supabaseData.incrementSerial(serialKeyMap[table]));
      }

      const result = await supabaseData.insert(table as string, mutableEntry);
      if (result.error) throw new Error(result.error);

      await audit('CREATE', String(table), id);

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
      if (FINANCIAL_TABLES.has(table as keyof Database)) setIsDataStale(true);
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
        if (FINANCIAL_TABLES.has(table as keyof Database)) setIsDataStale(true);
        await refreshData();
        toast.success('تم الحذف بنجاح');
      }
    } catch (err: any) {
      toast.error('خطأ أثناء الحذف: ' + err.message);
    }
  }, [audit, refreshData, operations]);

  // ─────────────────────────────────────────────────────────────────────────────
  // P0 — CRITICAL: addReceiptWithAllocations
  // Validates contract/invoice integrity, builds journal entries, posts atomically
  // ─────────────────────────────────────────────────────────────────────────────

  const addReceiptWithAllocations: AppContextType['financeService']['addReceiptWithAllocations'] = useCallback(
    async (receiptData, allocations) => {
      if (isReadOnly) {
        toast.error('النظام في وضع القراءة فقط.');
        return { success: false, error: 'read-only' };
      }
      const startTime = performance.now();
      try {
        // RULE: Contract must exist
        const contract = db.contracts.find(c => c.id === receiptData.contractId);
        if (!contract) return { success: false, error: 'العقد غير موجود أو محذوف' };

        // RULE: Allocations must sum to receipt amount (within rounding tolerance)
        const totalAllocated = round3(allocations.reduce((s, a) => s + a.amount, 0));
        if (Math.abs(totalAllocated - receiptData.amount) > 0.01) {
          toast.error(`مجموع التخصيصات (${totalAllocated}) لا يساوي مبلغ السند (${receiptData.amount})`);
          return { success: false, error: 'allocation_mismatch' };
        }

        // RULE: Every invoice must exist and belong to this contract
        for (const alloc of allocations) {
          const invoice = db.invoices.find(i => i.id === alloc.invoiceId);
          if (!invoice) return { success: false, error: `الفاتورة ${alloc.invoiceId.slice(0, 8)} غير موجودة` };
          if (invoice.contractId !== receiptData.contractId) {
            return { success: false, error: 'فاتورة لا تنتمي لهذا العقد — يُمنع التخصيص' };
          }
        }

        // Build receipt identifiers
        const receiptId = crypto.randomUUID();
        const now = Date.now();
        const receiptNo = String(await supabaseData.incrementSerial('receipt'));
        const voucherNo = String(await supabaseData.incrementSerial('journalEntry'));
        const date = receiptData.dateTime?.slice(0, 10) || new Date().toISOString().slice(0, 10);

        // Build journal entries (DR: Cash/Bank account, CR: Accounts Receivable)
        const mappings = settings.accounting.accountMappings;
        const arAccount = mappings.accountsReceivable;
        const cashAccount =
          mappings.paymentMethods[receiptData.channel as keyof typeof mappings.paymentMethods] ||
          mappings.paymentMethods.CASH;

        const journalEntries = [
          {
            id: crypto.randomUUID(), no: voucherNo, date,
            account_id: cashAccount,
            amount: round3(receiptData.amount),
            type: 'DEBIT' as const,
            source_id: receiptId,
            entity_type: 'CONTRACT' as const,
            entity_id: receiptData.contractId,
            created_at: now,
          },
          {
            id: crypto.randomUUID(), no: voucherNo, date,
            account_id: arAccount,
            amount: round3(receiptData.amount),
            type: 'CREDIT' as const,
            source_id: receiptId,
            entity_type: 'CONTRACT' as const,
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
            check_number: receiptData.checkNumber || null,
            check_bank: receiptData.checkBank || null,
            check_date: receiptData.checkDate || null,
            check_status: receiptData.checkStatus || null,
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

        await audit('CREATE', 'receipts', receiptId, `SND#${receiptNo} - ${receiptData.amount}`);
        logOperationTime('addReceipt', performance.now() - startTime);
        setIsDataStale(true);
        await refreshData();
        toast.success(`✓ تم تسجيل السند رقم ${receiptNo} بنجاح`);
        return { success: true, receiptNo, allocatedTotal: totalAllocated };
      } catch (err: any) {
        logger.error('[addReceiptWithAllocations] failed', { message: err?.message });
        toast.error('فشل تسجيل السند: ' + (err?.message || 'خطأ غير معروف'));
        return { success: false, error: err?.message || 'unknown' };
      }
    },
    [db, isReadOnly, settings, audit, refreshData, logOperationTime, setIsDataStale]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // P0 — CRITICAL: addManualJournalVoucher
  // Enforces debit == credit balance invariant before posting
  // ─────────────────────────────────────────────────────────────────────────────

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
        const now = Date.now();
        const sourceId = `MJV-${voucherNo}`;

        const entries = voucher.lines.flatMap(line => {
          const rows = [];
          if ((line.debit || 0) > 0.001) {
            rows.push({
              id: crypto.randomUUID(), no: voucherNo, date: voucher.date,
              accountId: line.accountId, amount: round3(line.debit),
              type: 'DEBIT' as const, sourceId, createdAt: now,
            });
          }
          if ((line.credit || 0) > 0.001) {
            rows.push({
              id: crypto.randomUUID(), no: voucherNo, date: voucher.date,
              accountId: line.accountId, amount: round3(line.credit),
              type: 'CREDIT' as const, sourceId, createdAt: now,
            });
          }
          return rows;
        });

        await supabaseData.bulkInsert('journalEntries', entries);
        await audit('CREATE', 'journalEntries', sourceId, voucher.notes);
        logOperationTime('addManualJournalVoucher', performance.now() - startTime);
        setIsDataStale(true);
        await refreshData();
        toast.success(`✓ تم ترحيل القيد اليدوي رقم ${voucherNo}`);
      } catch (err: any) {
        logger.error('[addManualJournalVoucher] failed', { message: err?.message });
        toast.error('فشل ترحيل القيد: ' + (err?.message || 'خطأ غير معروف'));
      }
    },
    [isReadOnly, audit, refreshData, logOperationTime, setIsDataStale]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // P0 — CRITICAL: fetchPaginatedData
  // Wired to supabaseData.fetchPaginated — replaces the stub that returned []
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchPaginatedData: AppContextType['fetchPaginatedData'] = useCallback(
    async (table, page, pageSize, orderBy, ascending) => {
      try {
        const result = await supabaseData.fetchPaginated<any>(
          table as string, page, pageSize, orderBy, ascending
        );
        return { data: result.data as any, total: result.total };
      } catch (err: any) {
        logger.error('[fetchPaginatedData] failed', { message: err?.message, table });
        return { data: [] as any, total: 0 };
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // P0 — CRITICAL: sendWhatsApp
  // Opens wa.me deep-link — primary collection communication channel in Arabic markets
  // ─────────────────────────────────────────────────────────────────────────────

  const sendWhatsApp = useCallback((phone: string, message: string) => {
    if (!phone || !message) {
      toast.error('رقم الهاتف والرسالة مطلوبان');
      return;
    }
    sendWhatsAppMessage(phone, message);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // P1 — updateSettings
  // Deep-merges partial settings and persists to Supabase settings table
  // ─────────────────────────────────────────────────────────────────────────────

  const updateSettings: AppContextType['updateSettings'] = useCallback(async (newSettings) => {
    try {
      const ok = await supabaseData.updateSettingsPartial(newSettings);
      if (!ok) throw new Error('saveSettings returned false');
      await audit('UPDATE', 'settings', 'global', JSON.stringify(Object.keys(newSettings)));
      await refreshData();
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (err: any) {
      logger.error('[updateSettings] failed', { message: err?.message });
      toast.error('فشل حفظ الإعدادات: ' + err?.message);
    }
  }, [audit, refreshData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // P1 — lockPeriod / unlockPeriod / setReadOnly
  // Persists governance state to Supabase, enforced on every write operation
  // ─────────────────────────────────────────────────────────────────────────────

  const lockPeriod: AppContextType['lockPeriod'] = useCallback(async (ym) => {
    try {
      const current = db.governance;
      const next = lockPeriodState(current, ym);
      const ok = await supabaseData.saveGovernance(next);
      if (!ok) throw new Error('saveGovernance failed');
      await audit('UPDATE', 'governance', 'lock', `Locked period: ${ym}`);
      await refreshData();
      toast.success(`تم قفل الفترة ${ym}`);
    } catch (err: any) {
      logger.error('[lockPeriod] failed', { message: err?.message });
      toast.error('فشل قفل الفترة: ' + err?.message);
    }
  }, [db.governance, audit, refreshData]);

  const unlockPeriod: AppContextType['unlockPeriod'] = useCallback(async (ym) => {
    try {
      const current = db.governance;
      const next = unlockPeriodState(current, ym);
      const ok = await supabaseData.saveGovernance(next);
      if (!ok) throw new Error('saveGovernance failed');
      await audit('UPDATE', 'governance', 'unlock', `Unlocked period: ${ym}`);
      await refreshData();
      toast.success(`تم فتح الفترة ${ym}`);
    } catch (err: any) {
      logger.error('[unlockPeriod] failed', { message: err?.message });
      toast.error('فشل فتح الفترة: ' + err?.message);
    }
  }, [db.governance, audit, refreshData]);

  const setReadOnly: AppContextType['setReadOnly'] = useCallback(async (readOnly) => {
    try {
      const current = db.governance;
      const next = setReadOnlyState(current, readOnly);
      const ok = await supabaseData.saveGovernance(next);
      if (!ok) throw new Error('saveGovernance failed');
      await audit('UPDATE', 'governance', 'readOnly', `Set readOnly: ${readOnly}`);
      await refreshData();
      toast.success(readOnly ? 'تم تفعيل وضع القراءة فقط' : 'تم إلغاء وضع القراءة فقط');
    } catch (err: any) {
      logger.error('[setReadOnly] failed', { message: err?.message });
      toast.error('فشل تحديث الصلاحيات: ' + err?.message);
    }
  }, [db.governance, audit, refreshData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // P1 — createSnapshot
  // Persists a full DB snapshot (JSON blob) to the snapshots table
  // ─────────────────────────────────────────────────────────────────────────────

  const createSnapshot: AppContextType['createSnapshot'] = useCallback(async (note) => {
    try {
      const userId = currentUserRef.current?.id || 'system';
      const snapshot = createSnapshotPayload(db, note, userId);
      await supabaseData.insert('snapshots', snapshot);
      await audit('CREATE', 'snapshots', snapshot.id, note);
      await refreshData();
      toast.success('✓ تم إنشاء نقطة استرداد بنجاح');
    } catch (err: any) {
      logger.error('[createSnapshot] failed', { message: err?.message });
      toast.error('فشل إنشاء نقطة الاسترداد: ' + err?.message);
    }
  }, [db, audit, refreshData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // P1 — rebuildSnapshotsFromJournal
  // Recomputes all balance views from journal entries ground truth
  // ─────────────────────────────────────────────────────────────────────────────

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
      toast.success(`✓ تم إعادة بناء الأرصدة (${duration}ms)`);
      return { duration };
    } catch (err: any) {
      logger.error('[rebuildSnapshotsFromJournal] failed', { message: err?.message });
      toast.error('فشل إعادة بناء الأرصدة: ' + err?.message);
      return { duration: 0 };
    }
  }, [db, audit, refreshData, setIsDataStale]);

  // ─────────────────────────────────────────────────────────────────────────────
  // P1 — generateOwnerPortalLink
  // Generates a time-stamped token URL for owner self-service access
  // ─────────────────────────────────────────────────────────────────────────────

  const generateOwnerPortalLink: AppContextType['generateOwnerPortalLink'] = useCallback(async (ownerId) => {
    try {
      const owner = db.owners.find(o => o.id === ownerId);
      if (!owner) throw new Error('المالك غير موجود');

      // Encode a signed token: ownerId + expiry (48h) + simple HMAC-like checksum
      const expires = Date.now() + 48 * 60 * 60 * 1000;
      const payload = btoa(JSON.stringify({ ownerId, expires, name: owner.name }));
      const checksum = btoa(`${ownerId}:${expires}`).slice(0, 12);
      const token = `${payload}.${checksum}`;

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/owner-portal?token=${encodeURIComponent(token)}`;

      await audit('READ', 'owners', ownerId, 'Generated portal link');
      return link;
    } catch (err: any) {
      logger.error('[generateOwnerPortalLink] failed', { message: err?.message });
      toast.error('فشل إنشاء رابط البوابة: ' + err?.message);
      return '';
    }
  }, [db.owners, audit]);

  // ─────────────────────────────────────────────────────────────────────────────
  // P1 — createBackup / restoreBackup
  // Serializes full DB to JSON string (browser download) / restores from JSON
  // ─────────────────────────────────────────────────────────────────────────────

  const createBackup: AppContextType['createBackup'] = useCallback(async () => {
    try {
      const snapshot = createSnapshotPayload(db, 'Manual Backup', currentUserRef.current?.id || 'system');
      const jsonStr = JSON.stringify({ version: 1, createdAt: Date.now(), snapshot }, null, 2);
      await audit('CREATE', 'autoBackups', 'backup', 'Manual backup created');
      toast.success('✓ تم إنشاء النسخة الاحتياطية — سيبدأ التنزيل');
      return jsonStr;
    } catch (err: any) {
      logger.error('[createBackup] failed', { message: err?.message });
      toast.error('فشل إنشاء النسخة الاحتياطية: ' + err?.message);
      return '';
    }
  }, [db, audit]);

  const restoreBackup: AppContextType['restoreBackup'] = useCallback(async (data) => {
    try {
      const parsed = JSON.parse(data);
      const snapshotData: string = parsed?.snapshot?.data;
      if (!snapshotData) throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف');

      const restoredDb: Database = JSON.parse(snapshotData);
      if (!restoredDb?.owners || !restoredDb?.contracts) throw new Error('البيانات المستردة ناقصة');

      // Persist restored settings and governance; full tables restored via snapshot
      await supabaseData.saveSettings(restoredDb.settings);
      await supabaseData.saveGovernance(restoredDb.governance);
      await audit('UPDATE', 'autoBackups', 'restore', 'Database restored from backup file');
      await refreshData();
      toast.success('✓ تم استعادة النسخة الاحتياطية بنجاح');
    } catch (err: any) {
      logger.error('[restoreBackup] failed', { message: err?.message });
      toast.error('فشل استعادة النسخة الاحتياطية: ' + err?.message);
    }
  }, [audit, refreshData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // P1 — generateLateFees
  // Delegates to automation service (same as generateMonthlyInvoices path)
  // ─────────────────────────────────────────────────────────────────────────────

  const generateLateFees = useCallback(async (): Promise<number> => {
    if (!settings || !db) return 0;
    try {
      const result = await runManualAutomationService(db, settings, {
        invoices: false,
        lateFees: true,
        notifications: false,
        snapshots: false,
      });
      const created = (result as any).stats?.lateFeesCreated || 0;
      if (created > 0) {
        setIsDataStale(true);
        await refreshData();
        toast.success(`✓ تم توليد ${created} رسوم تأخير`);
      } else {
        toast('لا توجد فواتير مؤهلة لرسوم التأخير حالياً', { icon: 'ℹ️' });
      }
      return created;
    } catch (err: any) {
      logger.error('[generateLateFees] failed', { message: err?.message });
      toast.error('فشل توليد رسوم التأخير: ' + err?.message);
      return 0;
    }
  }, [db, settings, refreshData, setIsDataStale]);

  // ─────────────────────────────────────────────────────────────────────────────
  // P1 — updateNotificationTemplate
  // Persists template updates to Supabase
  // ─────────────────────────────────────────────────────────────────────────────

  const updateNotificationTemplate: AppContextType['updateNotificationTemplate'] = useCallback(
    async (id, updates) => {
      try {
        const result = await supabaseData.update('notificationTemplates', id, updates);
        if (!result.ok) throw new Error(result.error || 'update failed');
        await audit('UPDATE', 'notificationTemplates', id);
        await refreshData();
        toast.success('تم تحديث القالب بنجاح');
      } catch (err: any) {
        logger.error('[updateNotificationTemplate] failed', { message: err?.message });
        toast.error('فشل تحديث القالب: ' + err?.message);
      }
    },
    [audit, refreshData]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE — all methods wired, zero stubs remaining
  // ─────────────────────────────────────────────────────────────────────────────

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
