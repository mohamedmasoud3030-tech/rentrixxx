-- Schema consistency and access fixes

-- =========================
-- 1) SESSIONS RLS FIX (IDEMPOTENT + SAFE)
-- =========================

do $$
begin
  if to_regclass('public.sessions') is not null then
    -- Clean invalid rows
    delete from public.sessions where user_id is null;

    -- Enable RLS
    alter table public.sessions enable row level security;

    -- Drop old policies (if exist)
    drop policy if exists sessions_select_own on public.sessions;
    drop policy if exists sessions_insert_own on public.sessions;
    drop policy if exists sessions_update_own on public.sessions;
    drop policy if exists sessions_delete_own on public.sessions;
    drop policy if exists sessions_service_all on public.sessions;

    -- Recreate policies
    create policy sessions_select_own
    on public.sessions
    for select
    to authenticated
    using (auth.uid() = user_id);

    create policy sessions_insert_own
    on public.sessions
    for insert
    to authenticated
    with check (auth.uid() = user_id);

    create policy sessions_update_own
    on public.sessions
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

    create policy sessions_delete_own
    on public.sessions
    for delete
    to authenticated
    using (auth.uid() = user_id);

    create policy sessions_service_all
    on public.sessions
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end $$;

-- =========================
-- 2) REMOVE GHOST TABLES / VIEWS
-- =========================

drop view if exists public.maintenance cascade;

do $$
begin
  if exists (
    select 1 from pg_matviews where schemaname = 'public' and matviewname = 'automation_runs'
  ) then
    drop materialized view public.automation_runs cascade;
  elsif exists (
    select 1 from information_schema.views where table_schema = 'public' and table_name = 'automation_runs'
  ) then
    drop view public.automation_runs cascade;
  end if;
end $$;

-- =========================
-- 3) FIX PAYMENTS TABLE
-- =========================

do $$
begin
  if to_regclass('public.payments') is not null then
    alter table public.payments
    add column if not exists tenant_id uuid,
    add column if not exists contract_id uuid,
    add column if not exists invoice_id uuid,
    add column if not exists amount numeric not null default 0,
    add column if not exists status text default 'pending',
    add column if not exists payment_date timestamptz default now(),
    add column if not exists created_at timestamptz default now(),
    add column if not exists updated_at timestamptz default now(),
    add column if not exists deleted_at timestamptz;

    -- Indexes
    create index if not exists idx_payments_tenant on public.payments(tenant_id);
    create index if not exists idx_payments_invoice on public.payments(invoice_id);
    create index if not exists idx_payments_active on public.payments(deleted_at);
  end if;
end $$;

-- =========================
-- 4) PROFILES INDEX
-- =========================

do $$
begin
  if to_regclass('public.profiles') is not null then
    create index if not exists idx_profiles_auth_user_id
    on public.profiles(auth_user_id);
  end if;
end $$;

-- =========================
-- 5) UPDATED_AT COLUMNS
-- =========================

alter table if exists public.accounts add column if not exists updated_at timestamptz default now();
alter table if exists public.attachments add column if not exists updated_at timestamptz default now();
alter table if exists public.audit_log add column if not exists updated_at timestamptz default now();
alter table if exists public.deposit_txs add column if not exists updated_at timestamptz default now();
alter table if exists public.journal_entries add column if not exists updated_at timestamptz default now();
alter table if exists public.payments add column if not exists updated_at timestamptz default now();

-- =========================
-- 6) UPDATED_AT TRIGGER
-- =========================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'accounts',
    'attachments',
    'audit_log',
    'deposit_txs',
    'journal_entries',
    'payments'
  ])
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_%s_updated_at on public.%s', t, t);
      execute format('
        create trigger trg_%s_updated_at
        before update on public.%s
        for each row execute function public.update_updated_at()
      ', t, t);
    end if;
  end loop;
end $$;

-- =========================
-- 7) SOFT DELETE
-- =========================

alter table if exists public.invoices add column if not exists deleted_at timestamptz;
alter table if exists public.expenses add column if not exists deleted_at timestamptz;
alter table if exists public.journal_entries add column if not exists deleted_at timestamptz;

-- Partial indexes for active rows
create index if not exists idx_invoices_active
on public.invoices(id) where deleted_at is null;

create index if not exists idx_expenses_active
on public.expenses(id) where deleted_at is null;

create index if not exists idx_journal_entries_active
on public.journal_entries(id) where deleted_at is null;
