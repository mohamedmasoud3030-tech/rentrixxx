import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkflowStatus } from '../../src/utils/status';

test('stress: status normalization remains stable over large mixed input', () => {
  const seed = ['PENDING', 'SENT', 'COMPLETED', 'Pending', 'Completed', 'unknown', '', '  pending  '];
  const sampleSize = 20000;
  const start = Date.now();
  let pendingCount = 0;
  let completedCount = 0;

  for (let i = 0; i < sampleSize; i += 1) {
    const normalized = normalizeWorkflowStatus(seed[i % seed.length]);
    if (normalized === 'Pending') pendingCount += 1;
    if (normalized === 'Completed') completedCount += 1;
  }

  const durationMs = Date.now() - start;

  assert.equal(pendingCount + completedCount, sampleSize);
  assert.ok(pendingCount > 0);
  assert.ok(completedCount > 0);
  assert.ok(durationMs < 1500, `normalization took too long: ${durationMs}ms`);
});
