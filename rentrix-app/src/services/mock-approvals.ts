import { useSyncExternalStore } from 'react';
import { auditRepo } from './mock-repos/audit-repo';
import { contractRepo } from './mock-repos';

export interface PendingActionRecord {
  id: string;
  title: string;
  entityType: 'contract' | 'receipt';
  entityId: string;
  action: 'terminate';
  reason: string;
  requestedAt: string;
}

const KEY = 'rentrix_pending_actions';

export function getPendingActions(): PendingActionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function savePendingActions(actions: PendingActionRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(actions));
  window.dispatchEvent(new Event('pending-actions-change'));
}

export function requestApproval(record: Omit<PendingActionRecord, 'id' | 'requestedAt'>) {
  const actions = getPendingActions();
  const newItem: PendingActionRecord = {
    ...record,
    id: `appr-${crypto.randomUUID()}`,
    requestedAt: new Date().toISOString(),
  };
  savePendingActions([newItem, ...actions]);
  auditRepo.log('طلب موافقة مدير', record.entityType, record.entityId, `طلب إجراء ${record.action}: ${record.reason}`);
}

export function approveAction(id: string) {
  const actions = getPendingActions();
  const target = actions.find((a) => a.id === id);
  if (!target) return;

  if (target.entityType === 'contract' && target.action === 'terminate') {
    contractRepo.terminate(target.entityId, new Date().toISOString().split('T')[0] ?? '', target.reason);
  }

  savePendingActions(actions.filter((a) => a.id !== id));
  auditRepo.log('اعتماد طلب حساس', target.entityType, target.entityId, `تم اعتماد وتنفيذ ${target.action}`);
}

export function rejectAction(id: string) {
  const actions = getPendingActions();
  const target = actions.find((a) => a.id === id);
  if (!target) return;

  savePendingActions(actions.filter((a) => a.id !== id));
  auditRepo.log('رفض طلب حساس', target.entityType, target.entityId, `تم رفض إجراء ${target.action}`);
}

export function usePendingActions(): PendingActionRecord[] {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('pending-actions-change', cb);
      return () => window.removeEventListener('pending-actions-change', cb);
    },
    getPendingActions,
    getPendingActions
  );
}
