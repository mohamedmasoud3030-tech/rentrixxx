set check_function_bodies = off;

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  basis text not null check (basis in ('contract','invoice','payment','property','manual')),
  calc_type text not null check (calc_type in ('percentage','fixed')),
  percentage numeric(6,3) null check (percentage is null or (percentage >= 0 and percentage <= 100)),
  fixed_amount numeric(14,2) null check (fixed_amount is null or fixed_amount > 0),
  recipient_person_id uuid null references public.people(id),
  is_active boolean not null default true,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint commission_rules_calc_valid check ((calc_type='percentage' and percentage is not null and fixed_amount is null) or (calc_type='fixed' and fixed_amount is not null and percentage is null))
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid null references public.commission_rules(id),
  recipient_person_id uuid null references public.people(id),
  source_type text not null check (source_type in ('contract','invoice','payment','property','manual')),
  source_id uuid null,
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','approved','paid','cancelled')),
  due_date date null,
  paid_date date null,
  notes text null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (source_type, source_id, rule_id)
);

create index if not exists idx_commission_rules_basis on public.commission_rules(basis) where deleted_at is null;
create index if not exists idx_commissions_status on public.commissions(status) where deleted_at is null;
create index if not exists idx_commissions_due_date on public.commissions(due_date) where deleted_at is null;

alter table public.commission_rules enable row level security;
alter table public.commissions enable row level security;

drop policy if exists commission_rules_read on public.commission_rules;
create policy commission_rules_read on public.commission_rules for select to authenticated using (public.is_admin_or_manager());
drop policy if exists commission_rules_write on public.commission_rules;
create policy commission_rules_write on public.commission_rules for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

drop policy if exists commissions_read on public.commissions;
create policy commissions_read on public.commissions for select to authenticated using (public.is_admin_or_manager());
drop policy if exists commissions_write on public.commissions;
create policy commissions_write on public.commissions for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

grant select,insert,update on public.commission_rules to authenticated;
grant select,insert,update on public.commissions to authenticated;
