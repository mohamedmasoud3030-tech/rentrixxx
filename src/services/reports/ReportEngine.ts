import { runReportRpcRaw } from '@/services/reportsService';
import { reportSnapshotManager } from './ReportSnapshotManager';

export type ReportRequest = {
  reportId: string;
  rpcName: string;
  params: Record<string, unknown>;
  forceRefresh?: boolean;
  maxAgeMs?: number;
};

export type ReportResult<T> = { data: T | null; error: unknown | null };

const DEFAULT_SNAPSHOT_TTL_MS = 60_000;

class ReportEngine {
  async generate<T>(request: ReportRequest): Promise<ReportResult<T>> {
    const { reportId, rpcName, params, forceRefresh = false, maxAgeMs = DEFAULT_SNAPSHOT_TTL_MS } = request;

    if (!forceRefresh) {
      const cached = reportSnapshotManager.get<T>(reportId, params, maxAgeMs);
      if (cached !== null) {
        return { data: cached, error: null };
      }
    }

    const { data, error } = await runReportRpcRaw<T>(rpcName, params);
    if (error) return { data: null, error };
    if (data !== null) {
      reportSnapshotManager.set(reportId, params, deepFreeze(data));
    }
    const snapshot = reportSnapshotManager.get<T>(reportId, params, maxAgeMs);
    return { data: snapshot, error: null };
  }

  clearSnapshots(reportId?: string): void {
    reportSnapshotManager.clear(reportId);
  }
}

export const reportEngine = new ReportEngine();

const deepFreeze = <T>(value: T): T => {
  if (!value || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const child = (value as Record<string, unknown>)[key];
    if (child && typeof child === 'object' && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
};
