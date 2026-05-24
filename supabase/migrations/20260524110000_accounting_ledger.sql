set check_function_bodies = off;

create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name_ar text not null,
  name_en text null,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  is_active boolean not null default true,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (code)
);

create table if not exists public.accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  reference text null,
  description text null,
  source_module text not null check (source_module in ('manual','invoice','receipt','expense','commission','owner_payout')),
  source_id uuid null,
  status text not null default 'draft' check (status in ('draft','posted')),
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (source_module, source_id)
);

create table if not exists public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.accounting_journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounting_accounts(id),
  line_description text null,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  property_id uuid null references public.properties(id),
  unit_id uuid null references public.units(id),
  owner_id uuid null references public.owners(id),
  tenant_id uuid null references public.tenants(id),
  contract_id uuid null references public.contracts(id),
  invoice_id uuid null references public.invoices(id),
  receipt_id uuid null references public.receipts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint accounting_journal_line_single_side check ((debit = 0 and credit > 0) or (credit = 0 and debit > 0))
);

create index if not exists idx_accounting_accounts_type on public.accounting_accounts(account_type) where deleted_at is null;
create index if not exists idx_accounting_journal_entries_date on public.accounting_journal_entries(entry_date desc) where deleted_at is null;
create index if not exists idx_accounting_journal_lines_entry on public.accounting_journal_lines(journal_entry_id) where deleted_at is null;
create index if not exists idx_accounting_journal_lines_account on public.accounting_journal_lines(account_id) where deleted_at is null;

alter table public.accounting_accounts enable row level security;
alter table public.accounting_journal_entries enable row level security;
alter table public.accounting_journal_lines enable row level security;

drop policy if exists accounting_accounts_read on public.accounting_accounts;
create policy accounting_accounts_read on public.accounting_accounts for select to authenticated using (public.is_admin_or_manager());
drop policy if exists accounting_accounts_write on public.accounting_accounts;
create policy accounting_accounts_write on public.accounting_accounts for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

drop policy if exists accounting_entries_read on public.accounting_journal_entries;
create policy accounting_entries_read on public.accounting_journal_entries for select to authenticated using (public.is_admin_or_manager());
drop policy if exists accounting_entries_write on public.accounting_journal_entries;
create policy accounting_entries_write on public.accounting_journal_entries for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

drop policy if exists accounting_lines_read on public.accounting_journal_lines;
create policy accounting_lines_read on public.accounting_journal_lines for select to authenticated using (public.is_admin_or_manager());
drop policy if exists accounting_lines_write on public.accounting_journal_lines;
create policy accounting_lines_write on public.accounting_journal_lines for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

grant select, insert, update on public.accounting_accounts to authenticated;
grant select, insert, update on public.accounting_journal_entries to authenticated;
grant select, insert, update on public.accounting_journal_lines to authenticated;
