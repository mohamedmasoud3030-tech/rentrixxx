export interface AutomationResult {
  success: boolean;
  errors: string[];
  snapshotsRebuilt: number;
  lateFeesApplied: number;
  notificationsSent: number;
  ts: string; // ISO timestamp of when run completed
}

export interface AutomationRunState {
  isRunning: boolean;
  lastResult: AutomationResult | null;
  lastRunAt: string | null;
}
