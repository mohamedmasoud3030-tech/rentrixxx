-- =============================================================================
-- 20260520013000_fix_pr565_rpc_serial_compatibility.sql
--
-- Forward-fix for PR #565 compatibility regressions in the consolidated
-- integrity migration. Keep this migration additive and idempotent so it is safe
-- for fresh preview branches and existing live databases.
-- =============================================================================

create extension if not exists pgcrypto;

-- Ensure profiles has the role column required by custom_access_token_hook.
alter table if exists public.profiles
  add column if not exists role text not null default 'USER';

update public.profiles
set role = 'USER'
where role is null;

do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'profiles_role_allowed_chk') then
    alter table public.profiles
      add constraint profiles_role_allowed_chk check (role in ('ADMIN', 'USER')) not valid;
  end if;

  if exists (select 1 from pg_constraint where conname = 'profiles_role_allowed_chk' and not convalidated) then
    alter table public.profiles validate constraint profiles_role_allowed_chk;
  end if;
end $$;

-- Normalize placeholder serials tables created by PR #565 to the canonical
-- counter-table shape used by post_receipt_atomic and legacy/current callers.
do $$
declare
  id_udt text;
  has_receipt boolean;
  has_scope boolean;
  has_value boolean;
  v_receipt bigint := 0;
  v_expense bigint := 0;
  v_maintenance bigint := 0;
  v_invoice bigint := 0;
  v_lead bigint := 0;
  v_owner_settlement bigint := 0;
  v_journal_entry bigint := 0;
  v_mission bigint := 0;
  v_contract bigint := 0;
begin
  if to_regclass('public.serials') is not null then
    select udt_name into id_udt
    from information_schema.columns
    where table_schema = 'public' and table_name = 'serials' and column_name = 'id';

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'serials' and column_name = 'receipt'
    ) into has_receipt;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'serials' and column_name = 'scope'
    ) into has_scope;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'serials' and column_name = 'value'
    ) into has_value;

    if has_scope and has_value then
      execute $snapshot$
        select
          coalesce(max(value) filter (where scope = 'receipt'), 0),
          coalesce(max(value) filter (where scope = 'expense'), 0),
          coalesce(max(value) filter (where scope = 'maintenance'), 0),
          coalesce(max(value) filter (where scope = 'invoice'), 0),
          coalesce(max(value) filter (where scope = 'lead'), 0),
          coalesce(max(value) filter (where scope = 'owner_settlement'), 0),
          coalesce(max(value) filter (where scope = 'journal_entry'), 0),
          coalesce(max(value) filter (where scope = 'mission'), 0),
          coalesce(max(value) filter (where scope = 'contract'), 0)
        from public.serials
      $snapshot$
      into v_receipt, v_expense, v_maintenance, v_invoice, v_lead,
           v_owner_settlement, v_journal_entry, v_mission, v_contract;
    end if;

    if id_udt <> 'int4' or not has_receipt then
      drop table public.serials;
    end if;
  end if;
end $$;

create table if not exists public.serials (
  id integer primary key,
  receipt integer default 0,
  expense integer default 0,
  maintenance integer default 0,
  invoice integer default 0,
  lead integer default 0,
  owner_settlement integer default 0,
  journal_entry integer default 0,
  mission integer default 0,
  contract integer default 0
);

alter table public.serials add column if not exists receipt integer default 0;
alter table public.serials add column if not exists expense integer default 0;
alter table public.serials add column if not exists maintenance integer default 0;
alter table public.serials add column if not exists invoice integer default 0;
alter table public.serials add column if not exists lead integer default 0;
alter table public.serials add column if not exists owner_settlement integer default 0;
alter table public.serials add column if not exists journal_entry integer default 0;
alter table public.serials add column if not exists mission integer default 0;
alter table public.serials add column if not exists contract integer default 0;

insert into public.serials (id)
values (1)
on conflict (id) do nothing;

-- Remove the PR #565 scope constraint only when it exists on the legacy counter
-- table shape. The canonical app table does not use scope/value counters.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'serials_scope_key')
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'serials' and column_name = 'scope'
     ) then
    alter table public.serials drop constraint serials_scope_key;
  end if;
end $$;

-- Preserve the argument name expected by Supabase RPC callers.
create or replace function public.increment_serial(serial_column text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_value bigint;
begin
  if serial_column is null or serial_column = 'id' then
    raise exception 'Invalid serial column';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'serials'
      and column_name = serial_column
      and data_type in ('integer', 'bigint')
  ) then
    raise exception 'Unknown serial column: %', serial_column;
  end if;

  insert into public.serials (id) values (1)
  on conflict (id) do nothing;

  execute format(
    'update public.serials set %1$I = coalesce(%1$I, 0) + 1 where id = 1 returning %1$I::bigint',
    serial_column
  ) into next_value;

  return next_value;
end;
$$;

revoke all on function public.increment_serial(text) from public;
grant execute on function public.increment_serial(text) to authenticated;
grant execute on function public.increment_serial(text) to service_role;

-- Match the receipt voiding signature expected by callers. This guard avoids a
-- silent success stub; until full voiding is restored, unsupported calls fail
-- loudly instead of mutating nothing while reporting success.
create or replace function public.void_receipt_atomic(
  p_receipt_id uuid,
  p_voided_at bigint,
  p_invoice_updates jsonb,
  p_reverse_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_receipt_id is null then
    raise exception 'p_receipt_id is required';
  end if;

  raise exception 'void_receipt_atomic full reversal workflow is not installed in this migration set';
end;
$$;

revoke all on function public.void_receipt_atomic(uuid, bigint, jsonb, jsonb) from public;
grant execute on function public.void_receipt_atomic(uuid, bigint, jsonb, jsonb) to authenticated;
grant execute on function public.void_receipt_atomic(uuid, bigint, jsonb, jsonb) to service_role;

-- Assert that the real receipt-posting function from
-- 20260503160000_atomic_receipt_serial.sql is the active jsonb-returning RPC.
do $$
declare
  return_type text;
begin
  select pg_get_function_result('public.post_receipt_atomic(jsonb)'::regprocedure)
  into return_type;

  if return_type <> 'jsonb' then
    raise exception 'post_receipt_atomic(jsonb) must return jsonb, found %', return_type;
  end if;
end $$;
