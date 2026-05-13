/**
 * API client for authenticated calls to the Express backend (/api/*).
 *
 * Token source: `supabase.auth.getSession()` is the canonical source of the
 * Supabase session JWT in this application. The Supabase client is already
 * the auth authority (handles sign-in, sign-out, token refresh), so reading
 * the access token directly from it is consistent with the auth architecture.
 * Using `useAuth` / `authService` for this would require threading the token
 * through React context into non-React service code — unnecessary indirection
 * given that `supabase` is a singleton shared across both layers.
 *
 * Deduplication: The Supabase auth client uses the Navigator Locks API to
 * serialize token operations. When multiple concurrent apiGet() calls all
 * invoke getSession() simultaneously, they race for the lock — some lose and
 * return null, causing spurious 401 responses. The _inflightToken promise
 * ensures all concurrent calls within the same tick share a single
 * getSession() invocation. The promise is cleared after it settles so the
 * next round of calls gets a fresh (potentially refreshed) token.
 */
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { supabase } from './supabaseClient';

let _inflightToken: Promise<string | null> | null = null;

function getToken(): Promise<string | null> {
  if (!_inflightToken) {
    _inflightToken = supabase.auth.getSession()
      .then(({ data }) => data.session?.access_token ?? null)
      .finally(() => { _inflightToken = null; });
  }
  return _inflightToken;
}

setAuthTokenGetter(getToken);

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    method: 'GET',
    headers: { 'Accept': 'application/json', ...headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}${body ? ': ' + body : ''}`);
  }
  return res.json() as Promise<T>;
}
