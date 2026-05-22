create extension if not exists pgcrypto;

create type public.app_role as enum ('ADMIN', 'MANAGER', 'USER', 'TENANT');
create type public.user_status as enum ('ACTIVE', 'DISABLED', 'SUSPENDED');
create type public.contract_status as enum ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED');
create type public.invoice_status as enum ('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'VOID');
create type public.receipt_status as enum ('POSTED', 'VOID');
create type public.payment_method as enum ('CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'OTHER');
create type public.maintenance_status as enum ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.app_role not null default 'USER',
  status public.user_status not null default 'ACTIVE',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id)
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete set null,
  code text not null,
  rent_amount numeric(12,2) not null default 0 check (rent_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, code)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  start_date date not null,
  end_date date,
  monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  status public.contract_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  issue_date date not null,
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  balance_due numeric(12,2) not null check (balance_due >= 0),
  status public.invoice_status not null default 'ISSUED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no bigint generated always as identity,
  receipt_date date not null default current_date,
  payer_tenant_id uuid references public.tenants(id) on delete set null,
  amount_total numeric(12,2) not null check (amount_total > 0),
  method public.payment_method not null default 'CASH',
  status public.receipt_status not null default 'POSTED',
  voided_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique(receipt_id, invoice_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  receipt_id uuid references public.receipts(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method public.payment_method not null default 'CASH',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  category text,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  title text not null,
  description text,
  status public.maintenance_status not null default 'OPEN',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true,
  company_name text not null default 'Rentrix',
  currency text not null default 'USD',
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(singleton_key)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index contracts_unit_status_idx on public.contracts(unit_id, status);
create index invoices_contract_status_idx on public.invoices(contract_id, status);
create index receipts_status_date_idx on public.receipts(status, receipt_date);
create index maintenance_requests_status_idx on public.maintenance_requests(status);
create index audit_log_actor_created_idx on public.audit_log(actor_user_id, created_at desc);

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger people_set_updated_at before update on public.people for each row execute function public.set_updated_at();
create trigger owners_set_updated_at before update on public.owners for each row execute function public.set_updated_at();
create trigger tenants_set_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger units_set_updated_at before update on public.units for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger receipts_set_updated_at before update on public.receipts for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
create trigger maintenance_requests_set_updated_at before update on public.maintenance_requests for each row execute function public.set_updated_at();
create trigger company_settings_set_updated_at before update on public.company_settings for each row execute function public.set_updated_at();

create or replace function public.is_app_user()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
     and exists (select 1 from public.users u where u.id = auth.uid() and u.status = 'ACTIVE');
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.users u
       where u.id = auth.uid()
         and u.status = 'ACTIVE'
         and u.role in ('ADMIN', 'MANAGER')
     );
$$;

create or replace function public.sync_auth_user_to_public_users()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, email, full_name, role, status, is_active, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), 'User'),
    'USER',
    'ACTIVE',
    true,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        updated_at = now(),
        role = case when public.users.role in ('ADMIN', 'MANAGER') then public.users.role else excluded.role end,
        status = case when public.users.status in ('DISABLED', 'SUSPENDED') then public.users.status else excluded.status end,
        is_active = case when public.users.status in ('DISABLED', 'SUSPENDED') then false else excluded.is_active end;

  return new;
end;
$$;

revoke all on function public.sync_auth_user_to_public_users() from public;
grant execute on function public.sync_auth_user_to_public_users() to postgres, service_role;

drop trigger if exists on_auth_user_created_sync_public_users on auth.users;
create trigger on_auth_user_created_sync_public_users
after insert on auth.users
for each row execute function public.sync_auth_user_to_public_users();

create or replace function public.post_receipt_atomic(payload jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.app_role;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: user must be authenticated';
  end if;

  select role into v_role from public.users where id = v_uid and status = 'ACTIVE';
  if v_role is null then
    raise exception 'USER_NOT_FOUND_OR_INACTIVE: caller must exist in public.users and be active';
  end if;

  if v_role not in ('ADMIN', 'MANAGER') then
    raise exception 'FORBIDDEN: ADMIN or MANAGER role required';
  end if;

  return jsonb_build_object('ok', true, 'fn', 'post_receipt_atomic', 'payload', coalesce(payload, '{}'::jsonb));
end;
$$;

create or replace function public.renew_contract_atomic(old_contract_id uuid, new_contract_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.app_role;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: user must be authenticated';
  end if;

  select role into v_role from public.users where id = v_uid and status = 'ACTIVE';
  if v_role is null then
    raise exception 'USER_NOT_FOUND_OR_INACTIVE: caller must exist in public.users and be active';
  end if;

  if v_role not in ('ADMIN', 'MANAGER') then
    raise exception 'FORBIDDEN: ADMIN or MANAGER role required';
  end if;

  return jsonb_build_object('ok', true, 'fn', 'renew_contract_atomic', 'old_contract_id', old_contract_id, 'new_contract_data', coalesce(new_contract_data, '{}'::jsonb));
end;
$$;

create or replace function public.void_receipt_atomic(
  p_receipt_id uuid,
  p_voided_at bigint,
  p_invoice_updates jsonb,
  p_reverse_entries jsonb
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.app_role;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: user must be authenticated';
  end if;

  select role into v_role from public.users where id = v_uid and status = 'ACTIVE';
  if v_role is null then
    raise exception 'USER_NOT_FOUND_OR_INACTIVE: caller must exist in public.users and be active';
  end if;

  if v_role not in ('ADMIN', 'MANAGER') then
    raise exception 'FORBIDDEN: ADMIN or MANAGER role required';
  end if;

  return jsonb_build_object(
    'ok', true,
    'fn', 'void_receipt_atomic',
    'p_receipt_id', p_receipt_id,
    'p_voided_at', p_voided_at,
    'p_invoice_updates', coalesce(p_invoice_updates, '[]'::jsonb),
    'p_reverse_entries', coalesce(p_reverse_entries, '[]'::jsonb)
  );
end;
$$;

create or replace function public.rpt_financial_summary(p_from date, p_to date)
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object('from', p_from, 'to', p_to, 'invoices', 0, 'receipts', 0, 'expenses', 0);
$$;

create or replace function public.rpt_owner_statement(p_owner_id uuid, p_from date, p_to date)
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object('owner_id', p_owner_id, 'from', p_from, 'to', p_to, 'rows', '[]'::jsonb);
$$;

create or replace function public.rpt_tenant_statement(p_contract_id uuid)
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object('contract_id', p_contract_id, 'rows', '[]'::jsonb);
$$;

grant usage on schema public to anon, authenticated;
grant select on public.users, public.properties, public.units, public.people, public.owners, public.tenants, public.contracts, public.invoices, public.receipts, public.receipt_allocations, public.payments, public.expenses, public.maintenance_requests, public.company_settings, public.audit_log to authenticated;

grant execute on function public.is_app_user() to authenticated;
grant execute on function public.is_admin_or_manager() to authenticated;
grant execute on function public.post_receipt_atomic(jsonb) to authenticated;
grant execute on function public.renew_contract_atomic(uuid, jsonb) to authenticated;
grant execute on function public.void_receipt_atomic(uuid, bigint, jsonb, jsonb) to authenticated;
grant execute on function public.rpt_financial_summary(date, date) to authenticated;
grant execute on function public.rpt_owner_statement(uuid, date, date) to authenticated;
grant execute on function public.rpt_tenant_statement(uuid) to authenticated;

alter table public.users enable row level security;
alter table public.users force row level security;
create policy users_select_self_or_admin on public.users for select to authenticated using (id = auth.uid() or public.is_admin_or_manager());
create policy users_update_self_or_admin on public.users for update to authenticated using (id = auth.uid() or public.is_admin_or_manager()) with check (id = auth.uid() or public.is_admin_or_manager());

alter table public.properties enable row level security;
alter table public.properties force row level security;
create policy properties_read_all_app_users on public.properties for select to authenticated using (public.is_app_user());
create policy properties_write_admin_manager on public.properties for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.units enable row level security;
alter table public.units force row level security;
create policy units_read_all_app_users on public.units for select to authenticated using (public.is_app_user());
create policy units_write_admin_manager on public.units for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.people enable row level security;
alter table public.people force row level security;
create policy people_read_admin_manager on public.people for select to authenticated using (public.is_admin_or_manager());
create policy people_write_admin_manager on public.people for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.owners enable row level security;
alter table public.owners force row level security;
create policy owners_read_admin_manager on public.owners for select to authenticated using (public.is_admin_or_manager());
create policy owners_write_admin_manager on public.owners for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.tenants enable row level security;
alter table public.tenants force row level security;
create policy tenants_read_app_users on public.tenants for select to authenticated using (public.is_app_user());
create policy tenants_write_admin_manager on public.tenants for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.contracts enable row level security;
alter table public.contracts force row level security;
create policy contracts_read_app_users on public.contracts for select to authenticated using (public.is_app_user());
create policy contracts_write_admin_manager on public.contracts for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.invoices enable row level security;
alter table public.invoices force row level security;
create policy invoices_read_app_users on public.invoices for select to authenticated using (public.is_app_user());
create policy invoices_write_admin_manager on public.invoices for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.receipts enable row level security;
alter table public.receipts force row level security;
create policy receipts_read_app_users on public.receipts for select to authenticated using (public.is_app_user());
create policy receipts_write_admin_manager on public.receipts for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.receipt_allocations enable row level security;
alter table public.receipt_allocations force row level security;
create policy receipt_allocations_read_app_users on public.receipt_allocations for select to authenticated using (public.is_app_user());
create policy receipt_allocations_write_admin_manager on public.receipt_allocations for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.payments enable row level security;
alter table public.payments force row level security;
create policy payments_read_app_users on public.payments for select to authenticated using (public.is_app_user());
create policy payments_write_admin_manager on public.payments for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.expenses enable row level security;
alter table public.expenses force row level security;
create policy expenses_read_app_users on public.expenses for select to authenticated using (public.is_app_user());
create policy expenses_write_admin_manager on public.expenses for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.maintenance_requests enable row level security;
alter table public.maintenance_requests force row level security;
create policy maintenance_read_app_users on public.maintenance_requests for select to authenticated using (public.is_app_user());
create policy maintenance_write_admin_manager on public.maintenance_requests for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.company_settings enable row level security;
alter table public.company_settings force row level security;
create policy company_settings_read_app_users on public.company_settings for select to authenticated using (public.is_app_user());
create policy company_settings_write_admin_manager on public.company_settings for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;
create policy audit_log_read_admin_manager on public.audit_log for select to authenticated using (public.is_admin_or_manager());
create policy audit_log_insert_app_users on public.audit_log for insert to authenticated with check (public.is_app_user());
