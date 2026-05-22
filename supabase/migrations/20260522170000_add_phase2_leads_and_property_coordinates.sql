-- Phase 2 MVP: leads module and optional property coordinates.

alter table if exists public.properties
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  source text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  notes text,
  assigned_to uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to) where assigned_to is not null;

create trigger leads_set_updated_at before update on public.leads
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.leads force row level security;

do $$ begin
  create policy leads_read_app_users on public.leads for select to authenticated using (public.is_app_user());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy leads_write_admin_manager on public.leads for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
exception when duplicate_object then null; end $$;

grant select on public.leads to authenticated;
