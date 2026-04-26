-- Production-safe reconciliation after schema_consistency_and_access_fixes
-- Focus: RLS/policy correctness for sessions, payments, profiles + ghost cleanup + constraints consistency.

-- -----------------------------------------------------------------------------
-- 0) Final ghost cleanup guard (no-op if already removed)
-- -----------------------------------------------------------------------------
drop view if exists public.maintenance cascade;
drop view if exists public.automation_runs cascade;
drop materialized view if exists public.automation_runs cascade;

-- -----------------------------------------------------------------------------
-- 1) sessions hardening: enforce secure ownership model + least-privilege policies
-- -----------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  if to_regclass('public.sessions') is not null then
    delete from public.sessions where user_id is null;

    begin
      alter table public.sessions alter column user_id set not null;
    exception when undefined_column then
      null;
    end;

    create index if not exists idx_sessions_user_id on public.sessions(user_id);

    alter table public.sessions enable row level security;
    alter table public.sessions force row level security;

    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'sessions'
    loop
      execute format('drop policy if exists %I on public.sessions', pol.policyname);
    end loop;

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

    create policy sessions_internal_worker_all
    on public.sessions
    for all
    to internal_worker
    using (true)
    with check (true);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) payments reconciliation: schema/constraints + tenant-aware RLS
-- -----------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  if to_regclass('public.payments') is not null then
    alter table public.payments
      add column if not exists tenant_id uuid,
      add column if not exists contract_id uuid,
      add column if not exists invoice_id uuid,
      add column if not exists created_at timestamptz default now(),
      add column if not exists updated_at timestamptz default now(),
      add column if not exists deleted_at timestamptz,
      add column if not exists payment_date timestamptz default now(),
      add column if not exists status text default 'pending';

    alter table public.payments
      alter column amount set default 0;

    begin
      alter table public.payments
        add constraint payments_amount_non_negative_chk check (amount >= 0) not valid;
    exception when duplicate_object then
      null;
    end;

    begin
      alter table public.payments
        add constraint payments_status_chk
        check (status in ('pending', 'posted', 'failed', 'cancelled', 'refunded')) not valid;
    exception when duplicate_object then
      null;
    end;

    -- Keys/indexes
    create index if not exists idx_payments_tenant_id on public.payments(tenant_id);
    create index if not exists idx_payments_invoice_id on public.payments(invoice_id);
    create index if not exists idx_payments_contract_id on public.payments(contract_id);
    create index if not exists idx_payments_active_rows on public.payments(tenant_id, payment_date) where deleted_at is null;

    -- Normalize old broad policies and enforce tenant claim scoping.
    alter table public.payments enable row level security;
    alter table public.payments force row level security;

    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'payments'
    loop
      execute format('drop policy if exists %I on public.payments', pol.policyname);
    end loop;

    create policy payments_tenant_select
    on public.payments
    for select
    to authenticated
    using (
      current_setting('request.jwt.claim.tenant_id', true) is not null
      and current_setting('request.jwt.claim.tenant_id', true) <> ''
      and tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
      and deleted_at is null
    );

    create policy payments_tenant_insert
    on public.payments
    for insert
    to authenticated
    with check (
      current_setting('request.jwt.claim.tenant_id', true) is not null
      and current_setting('request.jwt.claim.tenant_id', true) <> ''
      and tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
    );

    create policy payments_tenant_update
    on public.payments
    for update
    to authenticated
    using (
      current_setting('request.jwt.claim.tenant_id', true) is not null
      and current_setting('request.jwt.claim.tenant_id', true) <> ''
      and tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
    )
    with check (
      current_setting('request.jwt.claim.tenant_id', true) is not null
      and current_setting('request.jwt.claim.tenant_id', true) <> ''
      and tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
    );

    create policy payments_service_all
    on public.payments
    for all
    to service_role
    using (true)
    with check (true);

    create policy payments_internal_worker_all
    on public.payments
    for all
    to internal_worker
    using (true)
    with check (true);

    -- Foreign keys as NOT VALID to avoid long blocking validation in prod.
    begin
      alter table public.payments
        add constraint payments_tenant_id_fk
        foreign key (tenant_id) references public.tenants(id) not valid;
    exception when duplicate_object then
      null;
    end;

    begin
      alter table public.payments
        add constraint payments_contract_id_fk
        foreign key (contract_id) references public.contracts(id) not valid;
    exception when duplicate_object then
      null;
    end;

    begin
      alter table public.payments
        add constraint payments_invoice_id_fk
        foreign key (invoice_id) references public.invoices(id) not valid;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3) profiles reconciliation: index + owner-scoped RLS policies
-- -----------------------------------------------------------------------------
do $$
declare
  pol record;
  has_auth_user_id boolean;
begin
  if to_regclass('public.profiles') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'auth_user_id'
    ) into has_auth_user_id;

    if has_auth_user_id then
      create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id);
    end if;

    alter table public.profiles enable row level security;
    alter table public.profiles force row level security;

    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'profiles'
    loop
      execute format('drop policy if exists %I on public.profiles', pol.policyname);
    end loop;

    if has_auth_user_id then
      create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (
        auth.uid() is not null
        and (
          auth_user_id = auth.uid()
          or id = auth.uid()
        )
      );

      create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (
        auth.uid() is not null
        and (
          auth_user_id = auth.uid()
          or id = auth.uid()
        )
      );

      create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (
        auth.uid() is not null
        and (
          auth_user_id = auth.uid()
          or id = auth.uid()
        )
      )
      with check (
        auth.uid() is not null
        and (
          auth_user_id = auth.uid()
          or id = auth.uid()
        )
      );
    else
      create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (auth.uid() is not null and id = auth.uid());

      create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() is not null and id = auth.uid());

      create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (auth.uid() is not null and id = auth.uid())
      with check (auth.uid() is not null and id = auth.uid());
    end if;

    create policy profiles_service_all
    on public.profiles
    for all
    to service_role
    using (true)
    with check (true);

    create policy profiles_internal_worker_all
    on public.profiles
    for all
    to internal_worker
    using (true)
    with check (true);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4) updated_at + soft-delete enforcement consistency guards
-- -----------------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['accounts','attachments','audit_log','deposit_txs','journal_entries','payments','profiles']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists updated_at timestamptz default now()', t);
      execute format('drop trigger if exists %I on public.%I', 'trg_' || t || '_updated_at', t);
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.update_updated_at()',
        'trg_' || t || '_updated_at',
        t
      );
    end if;
  end loop;
end $$;

alter table if exists public.invoices add column if not exists deleted_at timestamptz;
alter table if exists public.expenses add column if not exists deleted_at timestamptz;
alter table if exists public.journal_entries add column if not exists deleted_at timestamptz;
alter table if exists public.payments add column if not exists deleted_at timestamptz;

create index if not exists idx_invoices_active_soft_delete on public.invoices(id) where deleted_at is null;
create index if not exists idx_expenses_active_soft_delete on public.expenses(id) where deleted_at is null;
create index if not exists idx_journal_entries_active_soft_delete on public.journal_entries(id) where deleted_at is null;
create index if not exists idx_payments_active_soft_delete on public.payments(id) where deleted_at is null;
