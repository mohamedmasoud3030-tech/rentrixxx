import type { AuditLogRecord, AuditLogResult } from '../types';

type RawAuditRecord = Readonly<Record<string, unknown>>;

const AUDIT_SCHEMA_UNVERIFIED_REASON = 'لم يتم التحقق من جدول سجل التدقيق في مخطط التشغيل الحالي، لذلك يبقى السجل غير متاح بأمان.';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeAuditRecords(rows: readonly RawAuditRecord[]): readonly AuditLogRecord[] {
  return rows.map((row, index) => ({
    id: readString(row.id) ?? `audit-${index}`,
    occurredAt: readString(row.occurred_at) ?? readString(row.created_at) ?? new Date(0).toISOString(),
    actor: readString(row.actor_email) ?? readString(row.username) ?? readString(row.user_id) ?? 'غير محدد',
    action: readString(row.action) ?? 'غير محدد',
    entityType: readString(row.entity_type) ?? readString(row.table_name) ?? 'غير محدد',
    entityId: readString(row.entity_id),
    description: readString(row.description) ?? readString(row.note),
  }));
}

export async function fetchAuditLog(): Promise<AuditLogResult> {
  return {
    status: 'unavailable',
    reason: AUDIT_SCHEMA_UNVERIFIED_REASON,
  };
}

