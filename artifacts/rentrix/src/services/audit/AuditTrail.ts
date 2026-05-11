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
      const actor = event.performedBy || 'system';
      
      const payload = {
        user_id: actor,
        action: event.action,
        entity_id: event.entityId,
        table: event.entityType,
        details: toJson({
          actor,
          timestamp: ts,
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
