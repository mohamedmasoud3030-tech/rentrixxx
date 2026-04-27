import { supabase } from '@/services/api/supabaseClient';
import { logger } from '@/services/logger';

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
      const referenceId = event.referenceId || buildReferenceId({ ...event, performedBy: actor, timestamp: ts });
      const { error } = await supabase.from('audit_log').insert({
        id: crypto.randomUUID(),
        ts,
        user_id: actor,
        username: actor,
        action: event.action,
        entity: event.entityType,
        entity_id: event.entityId,
        note: toJson({
          actor,
          timestamp: ts,
          document_id: event.entityId,
          reference_id: referenceId,
          before_state: event.before ?? null,
          after_state: event.after ?? null,
        }),
      });
      if (error) {
        logger.error('[AuditTrail] insert failed', error);
      }
    } catch (err) {
      logger.error('[AuditTrail] unexpected error', err);
    }
  },
};

const buildReferenceId = (event: Required<Pick<AuditEvent, 'action' | 'entityType' | 'entityId' | 'performedBy' | 'timestamp'>> & Pick<AuditEvent, 'before' | 'after'>): string => {
  const raw = [
    event.action,
    event.entityType,
    event.entityId,
    event.performedBy,
    String(event.timestamp),
    toJson(event.before),
    toJson(event.after),
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `evt_${Math.abs(hash).toString(16).padStart(8, '0')}`;
};
