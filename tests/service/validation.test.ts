import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAsync, validateLoginPayload, validatePasswordStrength, validateRequiredString } from '../../src/utils/validation';

test('validateRequiredString trims and validates', () => {
  assert.equal(validateRequiredString(' abc ', 'field'), 'abc');
  assert.throws(() => validateRequiredString('   ', 'field'));
});

test('validatePasswordStrength enforces minimum length', () => {
  assert.throws(() => validatePasswordStrength('1234567'));
  assert.doesNotThrow(() => validatePasswordStrength('abc12345'));
});

test('validateLoginPayload returns clean credentials', () => {
  assert.deepEqual(validateLoginPayload(' test@a.com ', '12345678'), {
    email: 'test@a.com',
    password: '12345678',
  });
});

test('safeAsync returns fallback error for non-Error throws', async () => {
  await assert.rejects(
    () => safeAsync(async () => { throw 'x'; }, 'fallback message'),
    /fallback message/
  );
});
