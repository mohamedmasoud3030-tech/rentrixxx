import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoRoleEscalation, sanitizeTextInput, validateLoginPayload, validatePasswordStrength } from '../../src/utils/validation';

test('sanitizeTextInput strips control chars and angle brackets', () => {
  assert.equal(sanitizeTextInput(' <script>alert(1)</script>\u0000 '), 'scriptalert(1)/script');
});

test('validateLoginPayload normalizes email casing and trims it', () => {
  assert.deepEqual(validateLoginPayload(' USER@Example.COM ', 'abc12345'), {
    email: 'user@example.com',
    password: 'abc12345',
  });
});

test('assertNoRoleEscalation blocks USER promotion attempts', () => {
  assert.throws(() => assertNoRoleEscalation('USER', 'ADMIN'), /لا يمكن ترقية مستخدم/);
  assert.doesNotThrow(() => assertNoRoleEscalation('ADMIN', 'ADMIN'));
});

test('validatePasswordStrength requires letters and numbers', () => {
  assert.throws(() => validatePasswordStrength('abcdefgh'), /أحرف وأرقام/);
  assert.throws(() => validatePasswordStrength('12345678'), /أحرف وأرقام/);
  assert.doesNotThrow(() => validatePasswordStrength('abc12345'));
});
