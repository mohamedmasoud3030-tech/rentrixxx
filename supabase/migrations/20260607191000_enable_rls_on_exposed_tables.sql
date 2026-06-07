-- Enable RLS on public tables surfaced by Preview Branch Security Advisor.
-- Keep this migration replay-safe across environments where optional tables may
-- not exist yet.

begin;

alter table if exists public.profiles enable row level security;
alter table if exists public.governance enable row level security;
alter table if exists public.settings enable row level security;
alter table if exists public.serials enable row level security;
alter table if exists public.financial_operation_idempotency enable row level security;

commit;
