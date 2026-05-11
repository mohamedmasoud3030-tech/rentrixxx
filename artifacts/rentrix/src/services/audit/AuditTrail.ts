import { supabase } from '@/services/api/supabaseClient';
import { logger } from '@/infrastructure/observability';

type AuditEvent = {
  action: 'CREATE_DOCUMENT' | 'POST_JOURNAL' | 'VOID_JOURNAL' | 'UPDATE_DOCUMENT' | 'EXPORT_PDF';
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  performedBy?: string;
  timestamp?: number;
  referenceId?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const toNullableUuid = (value: string | undefined): string | null => {
  if (!value) return null;
  return UUID_RE.test(value) ? value : null;
};

export const toJson = (value: unknown): Record<string, unknown> => {
  try {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return { value: value ?? null };
  } catch {
    return {};
  }
};

export const AuditTrail = {
  async log(event: AuditEvent): Promise<void> {
    try {
      const ts = event.timestamp ?? Date.now();
      const occurredAt = new Date(ts).toISOString();
      const actor = event.performedBy || 'system';
      const userId = toNullableUuid(event.performedBy);
      
      const payload = {
        user_id: userId,
        action: event.action,
        entity_id: event.entityId,
        table: event.entityType,
        details: toJson({
          actor,
          timestamp_ms: ts,
          occurred_at: occurredAt,
          entity: event.entityType,
          reference_id: event.referenceId ?? null,
          before_state: event.before ?? null,
          after_state: event.after ?? null,
        }),
      };

      const { error } = await supabase.from('audit_log').insert(payload);
      
      if (error) {
        logger.error('[AuditTrail] insert failed', { message: error?.message });
      }
    } catch (err) {
      logger.error('[AuditTrail] unexpected error', { message: (err as any)?.message });
    }
  },
};
