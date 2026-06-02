import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { OperationsDatabase } from '@/types/operations-database';

export const operationsSupabase = supabase as unknown as SupabaseClient<OperationsDatabase>;

export function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function createOperationId(): string {
  return globalThis.crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeStatus(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}
