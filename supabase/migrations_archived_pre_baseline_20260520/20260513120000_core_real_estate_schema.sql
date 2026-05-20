-- Rentrix Phase 1 core schema: Supabase is the sole source of truth.

create extension if not exists pgcrypto;

create type public.property_status as enum ('active', 'inactive', 'maintenance', 'sold');
create type public.unit_status as enum ('available', 'occupied', 'maintenance', 'reserved');
create type public.person_type as enum ('tenant', 'owner', 'contact');
create type public.contract_status as enum ('draft', 'active', 'expired', 'terminated');
create type public.payment_cycle as enum ('monthly', 'quarterly', 'semi_annual', 'annual');
create type public.invoice_status as enum ('draft', 'issued', 'partial', 'paid', 'overdue', 'void');
create type public.payment_method as enum ('cash', 'bank_transfer', 'card', 'check', 'other');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  address text not null,
  owner_name text,
  purchase_value numeric(14,2) check (purchase_value is null or purchase_value >= 0),
  current_value numeric(14,2) check (current_value is null or current_value >= 0),
  status public.property_status not null default 'active',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_number text not null,
  floor text,
  status public.unit_status not null default 'available',
  rent_amount numeric(14,2) check (rent_amount is null or rent_amount >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint units_property_unit_number_unique unique (property_id, unit_number)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  national_id text,
  type public.person_type not null,
  address text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  tenant_id uuid not null references public.people(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  rent_amount numeric(14,2) not null check (rent_amount >= 0),
  payment_cycle public.payment_cycle not null default 'monthly',
  status public.contract_status not null default 'draft',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint contracts_valid_date_range check (end_date >= start_date)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  issue_date date not null,
  due_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  status public.invoice_status not null default 'issued',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint invoices_paid_not_greater_than_amount check (paid_amount <= amount)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method not null,
  payment_date date not null,
  reference_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  expense_date date not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index properties_status_idx on public.properties(status) where deleted_at is null;
create index units_property_id_idx on public.units(property_id) where deleted_at is null;
create index units_status_idx on public.units(status) where deleted_at is null;
create index people_type_idx on public.people(type) where deleted_at is null;
create index people_phone_idx on public.people(phone) where deleted_at is null and phone is not null;
create index contracts_property_id_idx on public.contracts(property_id) where deleted_at is null;
create index contracts_unit_id_idx on public.contracts(unit_id) where deleted_at is null;
create index contracts_tenant_id_idx on public.contracts(tenant_id) where deleted_at is null;
create index contracts_status_idx on public.contracts(status) where deleted_at is null;
create index invoices_contract_id_idx on public.invoices(contract_id) where deleted_at is null;
create index invoices_due_date_idx on public.invoices(due_date) where deleted_at is null;
create index invoices_status_idx on public.invoices(status) where deleted_at is null;
create index payments_invoice_id_idx on public.payments(invoice_id) where deleted_at is null;
create index payments_payment_date_idx on public.payments(payment_date) where deleted_at is null;
create index expenses_property_id_idx on public.expenses(property_id) where deleted_at is null;
create index expenses_expense_date_idx on public.expenses(expense_date) where deleted_at is null;

create trigger properties_set_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger units_set_updated_at before update on public.units for each row execute function public.set_updated_at();
create trigger people_set_updated_at before update on public.people for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();

alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.people enable row level security;
alter table public.contracts enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

create policy "Authenticated users can manage properties" on public.properties for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage units" on public.units for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage people" on public.people for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage contracts" on public.contracts for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage invoices" on public.invoices for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage payments" on public.payments for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage expenses" on public.expenses for all to authenticated using (true) with check (true);
