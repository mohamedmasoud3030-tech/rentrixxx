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
 */
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { supabase } from './supabaseClient';

setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
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
