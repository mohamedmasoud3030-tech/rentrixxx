import { supabase } from '@/integrations/supabase/client';
import type { AuditLogRecord, AuditLogResult } from '../types';

type RawAuditRecord = Readonly<Record<string, unknown>>;

type AuditLogQueryResult = Readonly<{
  data: readonly RawAuditRecord[] | null;
  error: unknown;
}>;

type AuditLogClient = Readonly<{
  from: (table: 'audit_log') => Readonly<{
    select: (columns: string) => Readonly<{
      order: (column: 'created_at', options: Readonly<{ ascending: boolean }>) => Readonly<{
        limit: (count: number) => PromiseLike<AuditLogQueryResult>;
      }>;
    }>;
  }>;
}>;

// The live Supabase schema exposes public.audit_log, while the checked-in generated
// database type has not been refreshed yet. Keep the verified read model local to this
// feature so the pilot remains read-only and narrowly scoped.
const auditLogClient = supabase as unknown as AuditLogClient;

const AUDIT_LOG_COLUMNS = 'id, ts, user_id, username, action, entity, entity_id, note, table, details, created_at, updated_at';
const AUDIT_LOG_LIMIT = 200;

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readTimestamp(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const text = readString(value);
  if (!text) return null;

  if (/^\d+$/.test(text)) {
    const date = new Date(Number(text));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

export function normalizeAuditRecords(rows: readonly RawAuditRecord[]): readonly AuditLogRecord[] {
  return rows.map((row, index) => ({
    id: readString(row.id) ?? `audit-${index}`,
    occurredAt: readTimestamp(row.ts) ?? readTimestamp(row.created_at) ?? readTimestamp(row.updated_at) ?? new Date(0).toISOString(),
    actor: readString(row.actor_email) ?? readString(row.username) ?? readString(row.user_id) ?? 'غير محدد',
    action: readString(row.action) ?? 'غير محدد',
    entityType: readString(row.entity_type) ?? readString(row.entity) ?? readString(row.table_name) ?? readString(row.table) ?? 'غير محدد',
    entityId: readString(row.entity_id),
    description: readString(row.description) ?? readString(row.note) ?? readString(row.details),
  }));
}

export async function fetchAuditLog(): Promise<AuditLogResult> {
  const { data, error } = await auditLogClient
    .from('audit_log')
    .select(AUDIT_LOG_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(AUDIT_LOG_LIMIT);

  if (error) throw error;

  return {
    status: 'available',
    records: normalizeAuditRecords(data ?? []),
  };
}
