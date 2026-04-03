import { useMemo } from 'react';
import { buildSnapshotState, findMissingOverdueNotifications } from '../services/snapshotService';

export interface UseSnapshotsResult {
  buildSnapshotState: typeof buildSnapshotState;
  findMissingOverdueNotifications: typeof findMissingOverdueNotifications;
}

export const useSnapshots = (): UseSnapshotsResult => {
  return useMemo(() => ({ buildSnapshotState, findMissingOverdueNotifications }), []);
};
