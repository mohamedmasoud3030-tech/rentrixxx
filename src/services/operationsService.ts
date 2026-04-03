export interface AutomationSummary {
  invoicesCreated: number;
  lateFeesApplied: number;
  notificationsCreated: number;
  errors: string[];
}

export const buildAutomationSummary = (
  invoicesCreated: number,
  lateFeesApplied: number,
  notificationsCreated: number,
): AutomationSummary => ({
  invoicesCreated,
  lateFeesApplied,
  notificationsCreated,
  errors: [],
});
