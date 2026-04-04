import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKFLOW_STATUS } from '../../src/constants/status';
import { getStatusBadgeClass } from '../../src/utils/helpers';
import { normalizeWorkflowStatus } from '../../src/utils/status';

test('communication flow maps pending/completed to expected badge buckets', () => {
  const pending = normalizeWorkflowStatus('PENDING');
  const completed = normalizeWorkflowStatus('SENT');

  assert.equal(pending, WORKFLOW_STATUS.Pending);
  assert.equal(completed, WORKFLOW_STATUS.Completed);
  assert.match(getStatusBadgeClass(pending), /yellow/);
  assert.match(getStatusBadgeClass(completed), /green/);
});
