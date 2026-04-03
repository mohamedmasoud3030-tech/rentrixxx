import type { AutomationResult } from '../types/automation';

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

const runTask = async (
  shouldRun: boolean,
  task: () => Promise<number | boolean>,
  onSuccess: (value: number | boolean) => void,
  onError: (message: string) => void,
): Promise<void> => {
  if (!shouldRun) return;
  try {
    const value = await task();
    onSuccess(value);
  } catch (error: unknown) {
    onError(error instanceof Error ? error.message : 'خطأ غير معروف');
  }
};

export const executeAutomationTasks = async (
  taskConfig: AutomationTaskConfig,
  handlers: AutomationTaskHandlers,
): Promise<AutomationResult> => {
  const result: AutomationResult = {
    ts: new Date().toISOString(),
    success: true,
    errors: [],
    lateFeesApplied: 0,
    notificationsSent: 0,
    snapshotsRebuilt: 0,
  };

  const collectError = (label: string, message: string) => {
    result.errors.push(`${label}: ${message}`);
  };

  await runTask(taskConfig.invoices, handlers.runInvoices, () => undefined, message => collectError('invoices', message));
  await runTask(taskConfig.lateFees, handlers.runLateFees, value => {
    result.lateFeesApplied = Number(value) || 0;
  }, message => collectError('lateFees', message));
  await runTask(taskConfig.notifications, handlers.runNotifications, value => {
    result.notificationsSent = Number(value) || 0;
  }, message => collectError('notifications', message));
  await runTask(taskConfig.snapshots, handlers.runSnapshots, value => {
    result.snapshotsRebuilt = value ? 1 : 0;
  }, message => collectError('snapshots', message));

  result.success = result.errors.length === 0;
  return result;
};
