import test from 'node:test';
import assert from 'node:assert/strict';
import { getContractStatusSummary } from '../../src/services/contractMonitoringService';
import type { Contract } from '../../src/types';
import { WORKFLOW_STATUS } from '../../src/constants/status';
import { isWorkflowStatus, normalizeWorkflowStatus } from '../../src/utils/status';
import { formatDate, sanitizePhoneNumber } from '../../src/utils/helpers';

const createContract = (overrides: Partial<Contract> = {}): Contract => ({
  id: 'contract-1',
  no: 'CTR-001',
  unitId: 'unit-1',
  tenantId: 'tenant-1',
  rent: 500,
  dueDay: 1,
  start: '2026-01-01',
  end: '2099-12-31',
  deposit: 200,
  status: 'ACTIVE',
  createdAt: Date.now(),
  ...overrides,
});

test('normalizes legacy statuses', () => {
  assert.equal(normalizeWorkflowStatus('PENDING'), WORKFLOW_STATUS.Pending);
  assert.equal(normalizeWorkflowStatus('SENT'), WORKFLOW_STATUS.Completed);
  assert.equal(normalizeWorkflowStatus('COMPLETED'), WORKFLOW_STATUS.Completed);
});

test('keeps canonical statuses as-is', () => {
  assert.equal(normalizeWorkflowStatus(WORKFLOW_STATUS.Pending), WORKFLOW_STATUS.Pending);
  assert.equal(normalizeWorkflowStatus(WORKFLOW_STATUS.Completed), WORKFLOW_STATUS.Completed);
});

test('falls back to Pending for unknown values', () => {
  assert.equal(normalizeWorkflowStatus('UNKNOWN'), WORKFLOW_STATUS.Pending);
  assert.equal(normalizeWorkflowStatus(undefined), WORKFLOW_STATUS.Pending);
});

test('workflow status type guard', () => {
  assert.equal(isWorkflowStatus('Pending'), true);
  assert.equal(isWorkflowStatus('Completed'), true);
  assert.equal(isWorkflowStatus('SENT'), false);
});

test('sanitizePhoneNumber removes all non-digit characters', () => {
  assert.equal(sanitizePhoneNumber('+968 (9123)-45ab67'), '96891234567');
});

test('formatDate returns original value for invalid dates', () => {
  assert.equal(formatDate('not-a-date'), 'not-a-date');
});

test('contract status summary counts terminated contracts without type casting hacks', () => {
  const summary = getContractStatusSummary([
    createContract(),
    createContract({ id: 'contract-2', no: 'CTR-002', status: 'TERMINATED' }),
  ]);

  assert.equal(summary.active, 1);
  assert.equal(summary.terminated, 1);
});
