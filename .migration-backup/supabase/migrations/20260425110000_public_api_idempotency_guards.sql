-- Harden request-level idempotency and duplicate financial-write protections.

create unique index if not exists journal_entries_tenant_request_id_unique_idx
  on public.journal_entries (tenant_id, request_id)
  where request_id is not null;

create unique index if not exists financial_events_tenant_request_id_unique_idx
  on public.financial_events (tenant_id, request_id)
  where request_id is not null;

create unique index if not exists financial_audit_log_request_id_action_unique_idx
  on public.financial_audit_log (request_id, action)
  where request_id is not null;
