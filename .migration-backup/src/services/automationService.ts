import { supabaseData } from './supabaseDataService';
import { runAutomationScheduler } from './edgeFunctions';
import { Database, Settings } from '../types';
import type { AutomationResult } from '../types/automation';
import type { AutomationRunsRow } from '../types/database';

const STORAGE_KEY_CONFIG = 'rentrix_automation_config';
let inFlightDailyRun: Promise<AutomationResult | null> | null = null;

export interface AutomationTaskConfig {
  invoices: boolean;
  lateFees: boolean;
  notifications: boolean;
  snapshots: boolean;
}

export interface AutomationTaskHandlers {
  runInvoices: () => Promise<number>;
  runLateFees: () => Promise<number>;
  runNotifications: () => Promise<number>;
  runSnapshots: () => Promise<boolean>;
}

export const defaultAutomationConfig: AutomationTaskConfig = {
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

const runConfiguredAutomation = async (
  _db: Database,
  settings: Settings,
  config?: AutomationTaskConfig,
): Promise<AutomationResult> => {
  const taskConfig = config ?? getAutomationConfig(settings);
  return runAutomationScheduler({
    invoices: taskConfig.invoices,
    lateFees: taskConfig.lateFees,
    notifications: taskConfig.notifications,
    snapshots: taskConfig.snapshots,
  });
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
