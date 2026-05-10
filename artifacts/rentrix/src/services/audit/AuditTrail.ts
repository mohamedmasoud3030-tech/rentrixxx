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

const toJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
};

export const AuditTrail = {
  async log(event: AuditEvent): Promise<void> {
    try {
      const ts = event.timestamp ?? Date.now();
      const actor = event.performedBy || 'system';
      
      const { error } = await supabase.from('audit_log').insert({
        id: crypto.randomUUID(),
        ts,
        user_id: actor,
        username: actor,
        action: event.action,
        entity: event.entityType,
        entity_id: event.entityId,
        table: event.entityType,
        note: toJson({
          actor,
          timestamp: ts,
        }),
        details: toJson({
          before_state: event.before ?? null,
          after_state: event.after ?? null,
        }),
      });
      
      if (error) {
        logger.error('[AuditTrail] insert failed', { message: error?.message });
      }
    } catch (err) {
      logger.error('[AuditTrail] unexpected error', { message: (err as any)?.message });
    }
  },
};
