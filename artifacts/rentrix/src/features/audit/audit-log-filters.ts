import type { AuditLogRecord } from './types';

export const AUDIT_FILTER_ALL = 'all';

export type AuditLogFilters = Readonly<{
  search: string;
  actor: string;
  action: string;
}>;

function normalize(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase('ar') ?? '';
}

export function filterAuditRecords(records: readonly AuditLogRecord[], filters: AuditLogFilters): readonly AuditLogRecord[] {
  const search = normalize(filters.search);

  return records.filter((record) => {
    const matchesActor = filters.actor === AUDIT_FILTER_ALL || record.actor === filters.actor;
    const matchesAction = filters.action === AUDIT_FILTER_ALL || record.action === filters.action;
    const matchesSearch = !search || [
      record.actor,
      record.action,
      record.entityType,
      record.entityId,
      record.description,
      record.occurredAt,
    ].some((value) => normalize(value).includes(search));

    return matchesActor && matchesAction && matchesSearch;
  });
}

export function collectAuditFilterValues(records: readonly AuditLogRecord[], key: 'actor' | 'action'): readonly string[] {
  return [...new Set(records.map((record) => record[key]).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'ar'));
}
