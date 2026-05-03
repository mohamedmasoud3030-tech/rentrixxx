/**
 * Integration test: requireAuth + requireRole middleware
 *
 * Runs against the server already started by the dev workflow (port 8080).
 * Signs JWTs with the same SUPABASE_JWT_SECRET the server uses, injecting
 * different app_metadata.user_role values to validate role enforcement.
 *
 * Run:  node --test src/middlewares/auth.integration.test.mjs
 * (from artifacts/api-server directory with the server running on port 8080)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';

const SERVER_URL = 'http://localhost:8080';
const JWT_SECRET  = process.env['SUPABASE_JWT_SECRET'];
const SUPABASE_URL = process.env['VITE_SUPABASE_URL'] ?? process.env['SUPABASE_URL'];
const ISSUER      = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : undefined;

if (!JWT_SECRET) {
  throw new Error(
    'SUPABASE_JWT_SECRET must be set in the environment to run auth integration tests.'
  );
}

/**
 * Sign a short-lived HS256 JWT with the same secret the server uses.
 * Injects app_metadata.user_role so requireRole() can enforce it.
 *
 * @param {'ADMIN'|'USER'} role
 * @param {string} [sub]
 * @returns {Promise<string>}
 */
async function signJwt(role, sub = `test-${Date.now()}-${role}`) {
  const secret = new TextEncoder().encode(JWT_SECRET);

  let builder = new SignJWT({
    sub,
    email: `${role.toLowerCase()}@test.example`,
    app_metadata: { user_role: role },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m');

  // Match the issuer the server validates (EXPECTED_ISSUER in auth.ts)
  if (ISSUER) builder = builder.setIssuer(ISSUER);

  return builder.sign(secret);
}

/**
 * @param {string} path
 * @param {{ method?: string; token?: string; body?: unknown }} [opts]
 */
async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('requireAuth middleware', () => {
  test('returns 401 when Authorization header is absent', async () => {
    const res = await request('/api/properties');
    assert.equal(res.status, 401, JSON.stringify(res.body));
    assert.ok(res.body.error, 'should include error message');
  });

  test('returns 401 for a malformed token', async () => {
    const res = await request('/api/properties', { token: 'not.a.valid.jwt' });
    assert.equal(res.status, 401, JSON.stringify(res.body));
  });

  test('returns 401 for an expired token', async () => {
    // Sign a token that is already expired
    const secret = new TextEncoder().encode(JWT_SECRET);
    const past = Math.floor(Date.now() / 1000) - 3600; // 1 h ago
    const token = await new SignJWT({ sub: 'expired-user', app_metadata: { user_role: 'USER' } })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(past)
      .setExpirationTime(past + 60) // expired 59 min ago
      .sign(secret);

    const res = await request('/api/properties', { token });
    assert.equal(res.status, 401, JSON.stringify(res.body));
  });
});

describe('requireRole("USER") — GET /api/properties', () => {
  test('USER token: 200 OK', async () => {
    const token = await signJwt('USER');
    const res = await request('/api/properties', { token });
    assert.equal(res.status, 200, `USER should pass requireRole("USER"): ${JSON.stringify(res.body)}`);
    assert.ok('data' in res.body, 'response should have data field');
    assert.equal(res.body.role, 'USER', 'role should be echoed as USER');
  });

  test('ADMIN token: 200 OK (ADMIN satisfies USER requirement)', async () => {
    const token = await signJwt('ADMIN');
    const res = await request('/api/properties', { token });
    assert.equal(res.status, 200, `ADMIN should satisfy requireRole("USER"): ${JSON.stringify(res.body)}`);
    assert.equal(res.body.role, 'ADMIN', 'role should be echoed as ADMIN');
  });
});

describe('requireRole("ADMIN") — PATCH /api/properties/:id', () => {
  const TEST_ID = '00000000-0000-0000-0000-000000000001';

  test('USER token: 403 Forbidden', async () => {
    const token = await signJwt('USER');
    const res = await request(`/api/properties/${TEST_ID}`, {
      method: 'PATCH',
      token,
      body: { name: 'blocked' },
    });
    assert.equal(res.status, 403, `USER should be rejected by requireRole("ADMIN"): ${JSON.stringify(res.body)}`);
    assert.ok(
      res.body.error?.includes('ADMIN'),
      `error should mention ADMIN: ${JSON.stringify(res.body)}`,
    );
  });

  test('ADMIN token: passes role guard (200 / 423 / 501 are all acceptable)', async () => {
    const token = await signJwt('ADMIN');
    const res = await request(`/api/properties/${TEST_ID}`, {
      method: 'PATCH',
      token,
      body: { name: 'allowed' },
    });
    // 501 = not implemented; 423 = period locked; 200 = success — all mean ADMIN passed the guard
    assert.ok(
      [200, 423, 501].includes(res.status),
      `ADMIN should pass requireRole("ADMIN"), got ${res.status}: ${JSON.stringify(res.body)}`,
    );
  });
});
