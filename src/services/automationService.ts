import { supabaseData } from './supabaseDataService';
import { Database, Settings, Invoice } from '../types';
import type { AutomationResult } from '../types/automation';
import type { AutomationRunsRow } from '../types/database';
import {
  AutomationTaskConfig,
  defaultAutomationConfig,
  executeAutomationTasks,
} from './automationCore';

const STORAGE_KEY_CONFIG = 'rentrix_automation_config';

let inFlightDailyRun: Promise<AutomationResult | null> | null = null;

export { type AutomationTaskConfig };

export const getAutomationConfig = (settings?: Settings): AutomationTaskConfig => {
  const settingsAutomation = (settings as Settings & { automation?: AutomationTaskConfig } | undefined)?.automation;
  if (settingsAutomation) return settingsAutomation;

  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }

  return defaultAutomationConfig;
};

export const saveAutomationConfig = (config: AutomationTaskConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch {
    // best-effort persistence only
  }
};

const normalizeRunRow = (row: Partial<AutomationRunsRow> | null): AutomationResult | null => {
  if (!row) return null;
  const errorText = typeof row.error === 'string' ? row.error : '';
  const errors = errorText.trim().length > 0 ? errorText.split('|').map(x => x.trim()).filter(Boolean) : [];
  const ts = typeof row.ts === 'number' ? new Date(row.ts).toISOString() : new Date().toISOString();

  return {
    success: errors.length === 0,
    errors,
    snapshotsRebuilt: row.snapshots_rebuilt ? 1 : 0,
    lateFeesApplied: Number(row.late_fees_applied) || 0,
    notificationsSent: Number(row.notifications_created) || 0,
    ts,
  };
};

const resultToRunRow = (result: AutomationResult): AutomationRunsRow => ({
  id: crypto.randomUUID(),
  ts: new Date(result.ts).getTime(),
  invoices_created: 0,
  late_fees_applied: result.lateFeesApplied,
  notifications_created: result.notificationsSent,
  snapshots_rebuilt: result.snapshotsRebuilt > 0,
  error: result.errors.length > 0 ? result.errors.join(' | ') : null,
});

const appendRunLog = async (result: AutomationResult): Promise<void> => {
  await supabaseData.insert('automationRuns', resultToRunRow(result));
};

export const getAutomationRunLog = async (): Promise<AutomationResult[]> => {
  const rows = await supabaseData.fetchRecent<AutomationRunsRow>('automationRuns', 10);
  return rows.map(normalizeRunRow).filter((item): item is AutomationResult => item !== null);
};

export const getLastRunDate = async (): Promise<string | null> => {
  const rows = await supabaseData.fetchRecent<AutomationRunsRow>('automationRuns', 1);
  const row = rows[0];
  if (!row || typeof row.ts !== 'number') return null;
  return new Date(row.ts).toISOString().slice(0, 10);
};

const getTodayStr = (): string => new Date().toISOString().slice(0, 10);
const asArray = <T,>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);

export const autoGenerateMonthlyInvoices = async (db: Database): Promise<number> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const today = getTodayStr();

  const contracts = asArray(db?.contracts);
  const invoices = asArray(db?.invoices);
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE' && c.end >= today);
  if (activeContracts.length === 0) return 0;

  const existingInvoicesThisMonth = invoices.filter(inv => inv.dueDate?.startsWith(monthKey) && inv.type === 'RENT');
  const existingContractIds = new Set(existingInvoicesThisMonth.map(i => i.contractId));

  let count = 0;
  let nextSerial = await supabaseData.incrementSerial('invoice');

  for (const contract of activeContracts) {
    if (existingContractIds.has(contract.id)) continue;

    const dueDay = contract.dueDay || 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay, daysInMonth);
    const dueDate = `${monthKey}-${String(safeDay).padStart(2, '0')}`;

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      no: String(nextSerial++),
      contractId: contract.id,
      dueDate,
      amount: contract.rent,
      paidAmount: 0,
      status: 'UNPAID',
      type: 'RENT',
      notes: `فاتورة إيجار شهر ${monthKey}`,
      createdAt: Date.now(),
    };

    await supabaseData.insert('invoices', newInvoice);
    count++;
  }

  return count;
};

export const autoApplyLateFees = async (db: Database, settings: Settings): Promise<number> => {
  const lateFeeSettings = settings.operational?.lateFee;
  if (!lateFeeSettings?.isEnabled) return 0;

  const today = new Date();
  const invoices = asArray(db?.invoices);
  const overdueInvoices = invoices.filter(inv =>
    (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < today)) && inv.type === 'RENT'
  );

  const existingLateFeeSourceIds = new Set(
    invoices
      .filter(inv => inv.type === 'LATE_FEE' && inv.relatedInvoiceId)
      .map(inv => inv.relatedInvoiceId as string),
  );

  let count = 0;

  for (const inv of overdueInvoices) {
    if (existingLateFeeSourceIds.has(inv.id)) continue;

    const dueDate = new Date(inv.dueDate);
    const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const graceDays = lateFeeSettings.graceDays || 0;
    if (daysLate <= graceDays) continue;

    const feeAmount =
      lateFeeSettings.type === 'PERCENTAGE_OF_RENT'
        ? (inv.amount * lateFeeSettings.value) / 100
        : lateFeeSettings.value;

    const newNo = await supabaseData.incrementSerial('invoice');

    const feeInvoice: Invoice = {
      id: crypto.randomUUID(),
      no: String(newNo),
      contractId: inv.contractId,
      dueDate: today.toISOString().slice(0, 10),
      amount: feeAmount,
      paidAmount: 0,
      status: 'UNPAID',
      type: 'LATE_FEE',
      notes: `رسوم تأخير على الفاتورة رقم ${inv.no}`,
      relatedInvoiceId: inv.id,
      createdAt: Date.now(),
    };

    await supabaseData.insert('invoices', feeInvoice);
    count++;
  }

  return count;
};

export const autoGenerateNotifications = async (db: Database, settings: Settings): Promise<number> => {
  const alertDays = settings.operational?.contractAlertDays ?? 30;
  const thresholds = [alertDays, 7, 1];
  const now = Date.now();
  const contracts = asArray(db?.contracts);
  const invoices = asArray(db?.invoices);
  const existingNotifs = asArray(db?.appNotifications);
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
  let count = 0;

  for (const c of activeContracts) {
    const endDate = new Date(c.end).getTime();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    for (const threshold of thresholds) {
      if (daysLeft <= threshold && daysLeft > 0) {
        const alreadyExists = existingNotifs.some(
          n => n.link === `/contracts?contractId=${c.id}` && n.title.includes(String(threshold)),
        );
        if (!alreadyExists) {
          await supabaseData.insert('appNotifications', {
            id: crypto.randomUUID(),
            createdAt: now,
            isRead: false,
            role: 'ADMIN',
            type: 'CONTRACT_EXPIRING',
            title: `عقد ينتهي خلال ${threshold} يوم`,
            message: `عقد المستأجر سينتهي خلال ${daysLeft} يوم`,
            link: `/contracts?contractId=${c.id}`,
          });
          count++;
        }
        break;
      }
    }
  }

  const overdueInvoices = invoices.filter(inv =>
    (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date())) && inv.type === 'RENT',
  );

  for (const inv of overdueInvoices) {
    const alreadyExists = existingNotifs.some(
      n => n.link === `/finance/invoices?invoiceId=${inv.id}` && n.type === 'OVERDUE_BALANCE',
    );
    if (!alreadyExists) {
      await supabaseData.insert('appNotifications', {
        id: crypto.randomUUID(),
        createdAt: now,
        isRead: false,
        role: 'ADMIN',
        type: 'OVERDUE_BALANCE',
        title: 'فاتورة إيجار متأخرة',
        message: `الفاتورة رقم ${inv.no} متأخرة بمبلغ ${inv.amount - inv.paidAmount}`,
        link: `/finance/invoices?invoiceId=${inv.id}`,
      });
      count++;
    }
  }

  return count;
};

export const autoRebuildSnapshots = async (): Promise<boolean> => true;

const runConfiguredAutomation = async (
  db: Database,
  settings: Settings,
  config?: AutomationTaskConfig,
): Promise<AutomationResult> => {
  const taskConfig = config ?? getAutomationConfig(settings);
  const result = await executeAutomationTasks(taskConfig, {
    runInvoices: () => autoGenerateMonthlyInvoices(db),
    runLateFees: () => autoApplyLateFees(db, settings),
    runNotifications: () => autoGenerateNotifications(db, settings),
    runSnapshots: () => autoRebuildSnapshots(),
  });
  await appendRunLog(result);
  return result;
};

export const runDailyAutomation = async (
  db: Database,
  settings: Settings,
  config?: AutomationTaskConfig,
): Promise<AutomationResult | null> => {
  if (inFlightDailyRun) return inFlightDailyRun;

  const today = getTodayStr();
  const lastRun = await getLastRunDate();
  if (lastRun === today) {
    return null;
  }

  inFlightDailyRun = runConfiguredAutomation(db, settings, config);

  try {
    return await inFlightDailyRun;
  } finally {
    inFlightDailyRun = null;
  }
};

export const runManualAutomation = async (
  db: Database,
  settings: Settings,
  config?: AutomationTaskConfig,
): Promise<AutomationResult> => {
  return runConfiguredAutomation(db, settings, config);
};
