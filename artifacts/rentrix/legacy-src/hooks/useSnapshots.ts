import { useCallback, useState } from 'react';
import type { Database, Snapshot } from '../types';
import { createSnapshotPayload, restoreSnapshotData } from '../services/snapshotService';

export interface UseSnapshotsResult {
  snapshots: Snapshot[];
  lastBackupTime: number | null;
  createSnapshot: (db: Database, note: string, userId: string) => Snapshot;
  restoreSnapshot: (snapshot: Snapshot) => Database;
}

export const useSnapshots = (initial: Snapshot[] = []): UseSnapshotsResult => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(initial);
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);

  const createSnapshot = useCallback((db: Database, note: string, userId: string) => {
    const snapshot = createSnapshotPayload(db, note, userId);
    setSnapshots(prev => [snapshot, ...prev]);
    setLastBackupTime(snapshot.ts);
    return snapshot;
  }, []);

  const restoreSnapshot = useCallback((snapshot: Snapshot) => restoreSnapshotData(snapshot), []);

  return { snapshots, lastBackupTime, createSnapshot, restoreSnapshot };
};
