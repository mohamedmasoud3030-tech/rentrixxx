-- Ensure ON CONFLICT (operation_name, request_id) is backed by an exact unique index.
-- The preceding rollout migration validates duplicate pairs before this repair runs.
begin;
create unique index if not exists financial_operation_idempotency_operation_request_uidx
  on public.financial_operation_idempotency(operation_name, request_id);
commit;
