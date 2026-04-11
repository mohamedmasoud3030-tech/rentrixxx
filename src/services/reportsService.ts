import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

type ReportResponse<T> = { data: T | null; error: PostgrestError | null };

const CACHE_TTL_MS = 60_000;
const reportCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlight = new Map<string, Promise<ReportResponse<unknown>>>();

const buildKey = (name: string, params: Record<string, unknown>): string => `${name}:${JSON.stringify(params)}`;

export async function runReportRpcRaw<T>(name: string, params: Record<string, unknown>): Promise<ReportResponse<T>> {
  const key = buildKey(name, params);
  const cached = reportCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.value as T, error: null };
  }

  const existing = inFlight.get(key);
  if (existing) {
    const result = await existing;
    return { data: result.data as T | null, error: result.error };
  }

  const request: Promise<ReportResponse<unknown>> = (async () => {
    const { data, error } = await supabase.rpc(name, params);
    if (!error) {
      reportCache.set(key, { value: data, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return { data, error };
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, request);
  const result = await request;
  return { data: result.data as T | null, error: result.error };
}
