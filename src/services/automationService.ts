import { supabaseData } from './supabaseDataService';
import { Database, Settings, Invoice } from '../types';
import { AutomationResult } from '../types/automation';

export interface AutomationTaskConfig {
    invoices: boolean;
    lateFees: boolean;
    notifications: boolean;
    snapshots: boolean;
}

const STORAGE_KEY_LAST_RUN = 'rentrix_automation_last_run_date';
const STORAGE_KEY_RUN_LOG = 'rentrix_automation_run_log';
const STORAGE_KEY_CONFIG = 'rentrix_automation_config';
const DAILY_RUN_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

let inFlightDailyRun: Promise<AutomationResult | null> | null = null;

const defaultConfig: AutomationTaskConfig = {
    invoices: true,
    lateFees: true,
    notifications: true,
    snapshots: false,
};

export const getAutomationConfig = (settings?: Settings): AutomationTaskConfig => {
    const settingsAutomation = (settings as Settings & { automation?: AutomationTaskConfig } | undefined)?.automation;
    if (settingsAutomation) return settingsAutomation;

    try {
        const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (stored) return JSON.parse(stored);
    } catch {
        // ignore parse errors
    }

    return defaultConfig;
};

export const saveAutomationConfig = (config: AutomationTaskConfig): void => {
    try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch {
        // best-effort persistence only
    }
};

const normalizeRunLogResult = (value: unknown): AutomationResult | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;

    const errorsFromLegacy = typeof raw.error === 'string' && raw.error.trim().length > 0
        ? raw.error.split('|').map(segment => segment.trim()).filter(Boolean)
        : [];
    const errors = Array.isArray(raw.errors)
        ? raw.errors.map(error => String(error)).filter(Boolean)
        : errorsFromLegacy;

    const ts = typeof raw.ts === 'string' ? raw.ts : new Date(Number(raw.ts) || Date.now()).toISOString();

    return {
        success: typeof raw.success === 'boolean' ? raw.success : errors.length === 0,
        errors,
        snapshotsRebuilt: Number(raw.snapshotsRebuilt) || (raw.snapshotsRebuilt ? 1 : 0),
        lateFeesApplied: Number(raw.lateFeesApplied) || 0,
        notificationsSent: Number(raw.notificationsSent ?? raw.notificationsCreated) || 0,
        ts,
    };
};

export const getAutomationRunLog = (): AutomationResult[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_RUN_LOG);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(normalizeRunLogResult).filter((item): item is AutomationResult => item !== null);
        }
    } catch {
        // ignore parse errors
    }
    return [];
};

const appendRunLog = (result: AutomationResult): void => {
    const log = getAutomationRunLog();
    log.unshift(result);
    if (log.length > 10) log.length = 10;
    try {
        localStorage.setItem(STORAGE_KEY_RUN_LOG, JSON.stringify(log));
    } catch {
        // ignore storage errors in restricted/private contexts
    }
};

export const getLastRunDate = (): string | null => {
    try {
        return localStorage.getItem(STORAGE_KEY_LAST_RUN);
    } catch {
        return null;
    }
};

const getTodayStr = (): string => new Date().toISOString().slice(0, 10);
const getLockKey = (day: string): string => `${day}|running`;

const setLastRunDate = (date: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_LAST_RUN, date);
    } catch {
        // best-effort write
    }
};

const setInProgressRunLock = (day: string): void => {
    setLastRunDate(getLockKey(day));
};

const clearInProgressRunLock = (day: string): void => {
    if (getLastRunDate() === getLockKey(day)) {
        setLastRunDate('');
        try {
            localStorage.removeItem(STORAGE_KEY_LAST_RUN);
        } catch {
            // ignore
        }
    }
};

const isFreshInProgressLock = (value: string | null): boolean => {
    if (!value?.endsWith('|running')) return false;
    const day = value.slice(0, 10);
    if (!day) return false;
    const lockDayTs = new Date(`${day}T00:00:00Z`).getTime();
    if (Number.isNaN(lockDayTs)) return false;
    return Date.now() - lockDayTs < DAILY_RUN_LOCK_TIMEOUT_MS;
};

const runTask = async (
    shouldRun: boolean,
    task: () => Promise<number | boolean>,
    onSuccess: (value: number | boolean) => void,
    onError: (message: string) => void
): Promise<void> => {
    if (!shouldRun) return;
    try {
        const value = await task();
        onSuccess(value);
    } catch (e: unknown) {
        onError(e instanceof Error ? e.message : 'خطأ غير معروف');
    }
};

export const autoGenerateMonthlyInvoices = async (db: Database): Promise<number> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const today = getTodayStr();

    const activeContracts = db.contracts.filter(c => c.status === 'ACTIVE' && c.end >= today);
    if (activeContracts.length === 0) return 0;

    const existingInvoicesThisMonth = db.invoices.filter(inv => inv.dueDate?.startsWith(monthKey) && inv.type === 'RENT');
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
    const overdueInvoices = db.invoices.filter(inv =>
        (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < today)) && inv.type === 'RENT'
    );

    const existingLateFeeSourceIds = new Set(
        db.invoices
            .filter(inv => inv.type === 'LATE_FEE' && inv.relatedInvoiceId)
            .map(inv => inv.relatedInvoiceId as string)
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

    const overdueInvoices = db.invoices.filter(inv =>
        (inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date())) && inv.type === 'RENT'
    );

    for (const inv of overdueInvoices) {
        const alreadyExists = existingNotifs.some(
            n => n.link === `/finance/invoices?invoiceId=${inv.id}` && n.type === 'OVERDUE_BALANCE'
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

export const autoRebuildSnapshots = async (): Promise<boolean> => {
    return true;
};

export const runDailyAutomation = async (
    db: Database,
    settings: Settings,
    config?: AutomationTaskConfig
): Promise<AutomationResult | null> => {
    if (inFlightDailyRun) return inFlightDailyRun;

    const today = getTodayStr();
    const lastRun = getLastRunDate();
    if (lastRun === today || isFreshInProgressLock(lastRun)) {
        return null;
    }

    inFlightDailyRun = (async () => {
        setInProgressRunLock(today);
        const taskConfig = config ?? getAutomationConfig(settings);
        const result: AutomationResult = {
            ts: new Date().toISOString(),
            success: true,
            errors: [],
            lateFeesApplied: 0,
            notificationsSent: 0,
            snapshotsRebuilt: 0,
        };

        const collectError = (label: string, message: string) => result.errors.push(`${label}: ${message}`);

        await runTask(taskConfig.invoices, () => autoGenerateMonthlyInvoices(db), value => {
            void value;
        }, message => collectError('invoices', message));

        await runTask(taskConfig.lateFees, () => autoApplyLateFees(db, settings), value => {
            result.lateFeesApplied = Number(value) || 0;
        }, message => collectError('lateFees', message));

        await runTask(taskConfig.notifications, () => autoGenerateNotifications(db, settings), value => {
            result.notificationsSent = Number(value) || 0;
        }, message => collectError('notifications', message));

        await runTask(taskConfig.snapshots, () => autoRebuildSnapshots(), value => {
            result.snapshotsRebuilt = value ? 1 : 0;
        }, message => collectError('snapshots', message));

        result.success = result.errors.length === 0;

        setLastRunDate(today);
        appendRunLog(result);
        return result;
    })();

    try {
        return await inFlightDailyRun;
    } finally {
        inFlightDailyRun = null;
        clearInProgressRunLock(today);
    }
};

export const runManualAutomation = async (
    db: Database,
    settings: Settings,
    config?: AutomationTaskConfig
): Promise<AutomationResult> => {
    const taskConfig = config ?? getAutomationConfig(settings);
    const result: AutomationResult = {
        ts: new Date().toISOString(),
        success: true,
        errors: [],
        lateFeesApplied: 0,
        notificationsSent: 0,
        snapshotsRebuilt: 0,
    };

    const collectError = (label: string, message: string) => result.errors.push(`${label}: ${message}`);

    await runTask(taskConfig.invoices, () => autoGenerateMonthlyInvoices(db), value => {
        void value;
    }, message => collectError('invoices', message));

    await runTask(taskConfig.lateFees, () => autoApplyLateFees(db, settings), value => {
        result.lateFeesApplied = Number(value) || 0;
    }, message => collectError('lateFees', message));

    await runTask(taskConfig.notifications, () => autoGenerateNotifications(db, settings), value => {
        result.notificationsSent = Number(value) || 0;
    }, message => collectError('notifications', message));

    await runTask(taskConfig.snapshots, () => autoRebuildSnapshots(), value => {
        result.snapshotsRebuilt = value ? 1 : 0;
    }, message => collectError('snapshots', message));

    result.success = result.errors.length === 0;

    appendRunLog(result);
    return result;
};
