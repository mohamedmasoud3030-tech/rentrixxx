export type ReportSnapshot<T = unknown> = {
  key: string;
  reportId: string;
  params: Record<string, unknown>;
  data: T;
  createdAt: number;
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
};

export class ReportSnapshotManager {
  private readonly snapshots = new Map<string, ReportSnapshot>();

  createKey(reportId: string, params: Record<string, unknown>): string {
    return `${reportId}:${stableStringify(params)}`;
  }

  get<T>(reportId: string, params: Record<string, unknown>, maxAgeMs: number): T | null {
    const key = this.createKey(reportId, params);
    const snapshot = this.snapshots.get(key);
    if (!snapshot) return null;
    if (maxAgeMs > 0 && Date.now() - snapshot.createdAt > maxAgeMs) {
      this.snapshots.delete(key);
      return null;
    }
    return snapshot.data as T;
  }

  set<T>(reportId: string, params: Record<string, unknown>, data: T): void {
    const key = this.createKey(reportId, params);
    this.snapshots.set(key, {
      key,
      reportId,
      params,
      data,
      createdAt: Date.now(),
    });
  }

  clear(reportId?: string): void {
    if (!reportId) {
      this.snapshots.clear();
      return;
    }
    for (const [key, snapshot] of this.snapshots.entries()) {
      if (snapshot.reportId === reportId) this.snapshots.delete(key);
    }
  }
}

export const reportSnapshotManager = new ReportSnapshotManager();
