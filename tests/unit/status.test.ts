import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKFLOW_STATUS } from '../../src/constants/status.ts';
import { isWorkflowStatus, normalizeWorkflowStatus } from '../../src/utils/status.ts';

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
