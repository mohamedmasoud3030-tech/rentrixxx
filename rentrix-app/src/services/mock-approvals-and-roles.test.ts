// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { useMockDatabaseStore } from '@/store/mock-db-store';
import { requestApproval, approveAction, rejectAction, getPendingActions } from '@/services/mock-approvals';
import { getSimulatedRole, setSimulatedRole } from '@/services/mock-role-simulator';

const ACTIVE_CONTRACT = 'contract-yasmin-101-faisal';

// ─── mock-approvals ───────────────────────────────────────────────────────────

describe('mock-approvals — requestApproval / approve / reject', () => {
  beforeEach(() => {
    localStorage.clear();
    useMockDatabaseStore.getState().resetDatabase();
  });

  it('requestApproval adds a pending record with correct fields', () => {
    requestApproval({
      title: 'إنهاء عقد',
      entityType: 'contract',
      entityId: ACTIVE_CONTRACT,
      action: 'terminate',
      reason: 'طلب المستأجر',
    });

    const actions = getPendingActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].entityId).toBe(ACTIVE_CONTRACT);
    expect(actions[0].action).toBe('terminate');
    expect(actions[0].reason).toBe('طلب المستأجر');
    expect(actions[0].id).toMatch(/^appr-/);
    expect(actions[0].requestedAt).toBeTruthy();
  });

  it('rejectAction removes the record without executing the action', () => {
    requestApproval({
      title: 'إنهاء عقد',
      entityType: 'contract',
      entityId: ACTIVE_CONTRACT,
      action: 'terminate',
      reason: 'رفض',
    });

    const id = getPendingActions()[0].id;
    rejectAction(id);

    expect(getPendingActions()).toHaveLength(0);
    // Contract must still be active
    const state = useMockDatabaseStore.getState();
    expect(state.contracts.find((c) => c.id === ACTIVE_CONTRACT)?.status).toBe('active');
  });

  it('approveAction executes terminate and removes from queue', async () => {
    requestApproval({
      title: 'إنهاء عقد',
      entityType: 'contract',
      entityId: ACTIVE_CONTRACT,
      action: 'terminate',
      reason: 'انتهاء المدة',
    });

    const id = getPendingActions()[0].id;
    await approveAction(id);

    expect(getPendingActions()).toHaveLength(0);
    const state = useMockDatabaseStore.getState();
    expect(state.contracts.find((c) => c.id === ACTIVE_CONTRACT)?.status).toBe('terminated');
  });

  it('approveAction is a no-op for unknown id', async () => {
    await expect(approveAction('ghost-id')).resolves.toBeUndefined();
    expect(getPendingActions()).toHaveLength(0);
  });

  it('rejectAction is a no-op for unknown id', () => {
    expect(() => rejectAction('ghost-id')).not.toThrow();
  });

  it('multiple requests stack LIFO — most recent first', () => {
    requestApproval({ title: 'أول', entityType: 'contract', entityId: 'c-1', action: 'terminate', reason: 'أ' });
    requestApproval({ title: 'ثاني', entityType: 'contract', entityId: 'c-2', action: 'terminate', reason: 'ب' });

    const actions = getPendingActions();
    expect(actions).toHaveLength(2);
    expect(actions[0].entityId).toBe('c-2');
    expect(actions[1].entityId).toBe('c-1');
  });
});

// ─── Role simulator ──────────────────────────────────────────────────────────

describe('mock-role-simulator — getSimulatedRole / setSimulatedRole', () => {
  beforeEach(() => {
    localStorage.clear();
    setSimulatedRole('ADMIN'); // reset module-level memoryRole
  });

  it('defaults to ADMIN when localStorage is empty', () => {
    expect(getSimulatedRole()).toBe('ADMIN');
  });

  it('setSimulatedRole MANAGER persists to localStorage', () => {
    setSimulatedRole('MANAGER');
    expect(getSimulatedRole()).toBe('MANAGER');
    expect(localStorage.getItem('rentrix_simulated_role')).toBe('MANAGER');
  });

  it('setSimulatedRole USER is persisted correctly', () => {
    setSimulatedRole('USER');
    expect(getSimulatedRole()).toBe('USER');
  });

  it('falls back to memoryRole (ADMIN) for invalid localStorage value', () => {
    // Set memory to ADMIN explicitly, then write an invalid value to storage
    setSimulatedRole('ADMIN');
    localStorage.setItem('rentrix_simulated_role', 'SUPERADMIN');
    expect(getSimulatedRole()).toBe('ADMIN');
  });
});
