import { dbEngine } from './db';
import { Database, Settings, Invoice } from '../types';

export interface AutomationTaskConfig {
    invoices: boolean;
    lateFees: boolean;
    notifications: boolean;
    snapshots: boolean;
}

export interface AutomationRunResult {
    ts: number;
    invoicesCreated: number;
    lateFeesApplied: number;
    notificationsCreated: number;
    snapshotsRebuilt: boolean;
    error?: string;
}

const STORAGE_KEY_LAST_RUN = 'rentrix_automation_last_run_date';
const STORAGE_KEY_RUN_LOG = 'rentrix_automation_run_log';
const STORAGE_KEY_CONFIG = 'rentrix_automation_config';

export const getAutomationConfig = (): AutomationTaskConfig => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (stored) return JSON.parse(stored);
    } catch {}
    return { invoices: true, lateFees: true, notifications: true, snapshots: false };
};

export const saveAutomationConfig = (config: AutomationTaskConfig): void => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

export const getAutomationRunLog = (): AutomationRunResult[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_RUN_LOG);
        if (stored) return JSON.parse(stored);
    } catch {}
    return [];
};

const appendRunLog = (result: AutomationRunResult): void => {
    const log = getAutomationRunLog();
    log.unshift(result);
    if (log.length > 10) log.length = 10;
    localStorage.setItem(STORAGE_KEY_RUN_LOG, JSON.stringify(log));
};

export const getLastRunDate = (): string | null => {
    return localStorage.getItem(STORAGE_KEY_LAST_RUN);
};

const getTodayStr = (): string => new Date().toISOString().slice(0, 10);

export const autoGenerateMonthlyInvoices = async (db: Database): Promise<number> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const activeContracts = db.contracts.filter(c => c.status === 'ACTIVE');
    if (activeContracts.length === 0) return 0;

    const existingInvoicesThisMonth = db.invoices.filter(inv => {
        return inv.dueDate && inv.dueDate.startsWith(monthKey) && inv.type === 'RENT';
    });
    const existingContractIds = new Set(existingInvoicesThisMonth.map(i => i.contractId));

    const STATIC_ID = 1;
    let count = 0;

    for (const contract of activeContracts) {
        if (existingContractIds.has(contract.id)) continue;

        const dueDay = contract.dueDay || 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        const safeDay = Math.min(dueDay, daysInMonth);
        const dueDate = `${monthKey}-${String(safeDay).padStart(2, '0')}`;

        const id = crypto.randomUUID();
        const serial = await dbEngine.serials.get(STATIC_ID);
        if (!serial) continue;
        const newNo = String(serial.invoice + 1);
        await dbEngine.serials.update(STATIC_ID, { invoice: serial.invoice + 1 });

        const newInvoice: Invoice = {
            id,
            no: newNo,
            contractId: contract.id,
            dueDate,
            amount: contract.rent,
            paidAmount: 0,
            status: 'UNPAID',
            type: 'RENT',
            notes: `فاتورة إيجار شهر ${monthKey}`,
            createdAt: Date.now(),
        };
        await dbEngine.invoices.add(newInvoice);
        count++;
    }

    return count;
};

export const autoApplyLateFees = async (db: Database, settings: Settings): Promise<number> => {
    const lateFeeSettings = settings.operational?.lateFee;
    if (!lateFeeSettings?.isEnabled) return 0;

    const today = new Date();
    const overdueInvoices = db.invoices.filter(inv =>
        (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < today)) &&
        inv.type === 'RENT'
    );

    const existingLateFeeSourceIds = new Set(
        db.invoices
            .filter(inv => inv.type === 'LATE_FEE' && inv.relatedInvoiceId)
            .map(inv => inv.relatedInvoiceId as string)
    );

    const STATIC_ID = 1;
    let count = 0;

    for (const inv of overdueInvoices) {
        if (existingLateFeeSourceIds.has(inv.id)) continue;

        const dueDate = new Date(inv.dueDate);
        const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const graceDays = lateFeeSettings.graceDays || 0;
        if (daysLate <= graceDays) continue;

        const feeAmount = lateFeeSettings.type === 'PERCENTAGE_OF_RENT'
            ? (inv.amount * lateFeeSettings.value) / 100
            : lateFeeSettings.value;

        const serial = await dbEngine.serials.get(STATIC_ID);
        if (!serial) continue;
        const newNo = String(serial.invoice + 1);
        await dbEngine.serials.update(STATIC_ID, { invoice: serial.invoice + 1 });

        const feeInvoice: Invoice = {
            id: crypto.randomUUID(),
            no: newNo,
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
        await dbEngine.invoices.add(feeInvoice);
        count++;
    }

    return count;
};

export const autoGenerateNotifications = async (db: Database, settings: Settings): Promise<number> => {
    const alertDays = settings.operational?.contractAlertDays ?? 30;
    const thresholds = [alertDays, 7, 1];
    const now = Date.now();
    const activeContracts = db.contracts.filter(c => c.status === 'ACTIVE');
    const existingNotifs = db.appNotifications || [];
    let count = 0;

    for (const c of activeContracts) {
        const endDate = new Date(c.end).getTime();
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        for (const threshold of thresholds) {
            if (daysLeft <= threshold && daysLeft > 0) {
                const alreadyExists = existingNotifs.some(
                    n => n.link === `/contracts?contractId=${c.id}` && n.title.includes(String(threshold))
                );
                if (!alreadyExists) {
                    await dbEngine.appNotifications.add({
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

    const overdueInvoices = db.invoices.filter(inv =>
        (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date())) &&
        inv.type === 'RENT'
    );

    for (const inv of overdueInvoices) {
        const alreadyExists = existingNotifs.some(
            n => n.link === `/finance/invoices?invoiceId=${inv.id}` && n.type === 'OVERDUE_BALANCE'
        );
        if (!alreadyExists) {
            await dbEngine.appNotifications.add({
                id: crypto.randomUUID(),
                createdAt: now,
                isRead: false,
                role: 'ADMIN',
                type: 'OVERDUE_BALANCE',
                title: `فاتورة إيجار متأخرة`,
                message: `الفاتورة رقم ${inv.no} متأخرة بمبلغ ${inv.amount - inv.paidAmount}`,
                link: `/finance/invoices?invoiceId=${inv.id}`,
            });
            count++;
        }
    }

    return count;
};

export const autoRebuildSnapshots = async (): Promise<boolean> => {
    try {
        const { rebuildSnapshotsFromJournal } = await import('./financialEngine');
        await rebuildSnapshotsFromJournal();
        return true;
    } catch {
        return false;
    }
};

export const runDailyAutomation = async (
    db: Database,
    settings: Settings,
    config?: AutomationTaskConfig
): Promise<AutomationRunResult | null> => {
    const today = getTodayStr();
    const lastRun = getLastRunDate();
    if (lastRun === today) return null;

    const taskConfig = config ?? getAutomationConfig();
    const result: AutomationRunResult = {
        ts: Date.now(),
        invoicesCreated: 0,
        lateFeesApplied: 0,
        notificationsCreated: 0,
        snapshotsRebuilt: false,
    };

    try {
        if (taskConfig.invoices) {
            result.invoicesCreated = await autoGenerateMonthlyInvoices(db);
        }
        if (taskConfig.lateFees) {
            result.lateFeesApplied = await autoApplyLateFees(db, settings);
        }
        if (taskConfig.notifications) {
            result.notificationsCreated = await autoGenerateNotifications(db, settings);
        }
        if (taskConfig.snapshots) {
            result.snapshotsRebuilt = await autoRebuildSnapshots();
        }
    } catch (e: any) {
        result.error = e?.message || 'خطأ غير معروف';
    }

    localStorage.setItem(STORAGE_KEY_LAST_RUN, today);
    appendRunLog(result);

    return result;
};

export const runManualAutomation = async (
    db: Database,
    settings: Settings,
    config?: AutomationTaskConfig
): Promise<AutomationRunResult> => {
    const taskConfig = config ?? getAutomationConfig();
    const result: AutomationRunResult = {
        ts: Date.now(),
        invoicesCreated: 0,
        lateFeesApplied: 0,
        notificationsCreated: 0,
        snapshotsRebuilt: false,
    };

    try {
        if (taskConfig.invoices) {
            result.invoicesCreated = await autoGenerateMonthlyInvoices(db);
        }
        if (taskConfig.lateFees) {
            result.lateFeesApplied = await autoApplyLateFees(db, settings);
        }
        if (taskConfig.notifications) {
            result.notificationsCreated = await autoGenerateNotifications(db, settings);
        }
        if (taskConfig.snapshots) {
            result.snapshotsRebuilt = await autoRebuildSnapshots();
        }
    } catch (e: any) {
        result.error = e?.message || 'خطأ غير معروف';
    }

    localStorage.setItem(STORAGE_KEY_LAST_RUN, getTodayStr());
    appendRunLog(result);

    return result;
};
