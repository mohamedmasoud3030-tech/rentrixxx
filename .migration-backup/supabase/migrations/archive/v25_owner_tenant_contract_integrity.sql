-- Rentrix v25: owner/tenant/contract integrity + safer org isolation

-- 1) Ensure organization_id exists for core business tables used by the app.
alter table if exists public.owners add column if not exists organization_id uuid;
alter table if exists public.tenants add column if not exists organization_id uuid;
alter table if exists public.properties add column if not exists organization_id uuid;
alter table if exists public.units add column if not exists organization_id uuid;
alter table if exists public.contracts add column if not exists organization_id uuid;

-- 2) Resolve current organization from membership rather than direct auth.uid() comparison.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.organization_id
  from public.memberships m
  where m.user_id = auth.uid()
  order by m.created_at asc
  limit 1
$$;

grant execute on function public.current_organization_id() to authenticated;

-- 3) Useful indexes for common app queries.
create index if not exists idx_owners_organization_id on public.owners (organization_id);
create index if not exists idx_tenants_organization_id on public.tenants (organization_id);
create index if not exists idx_contracts_organization_id on public.contracts (organization_id);
create index if not exists idx_contracts_tenant_status_active
  on public.contracts (tenant_id, status)
  where deleted_at is null;

-- 4) Unique tenant identity per organization (prevents duplicate tenant records).
create unique index if not exists uq_tenants_org_id_no
  on public.tenants (organization_id, id_no)
  where id_no is not null;

-- 5) Validate that each unit has at most one ACTIVE contract (ignoring soft-deleted rows).
create unique index if not exists uq_contracts_unit_active
  on public.contracts (unit_id)
  where status = 'ACTIVE' and deleted_at is null;

-- 6) (Re)create policies for owners/tenants/contracts using current_organization_id().
alter table if exists public.owners enable row level security;
alter table if exists public.tenants enable row level security;
alter table if exists public.contracts enable row level security;

drop policy if exists org_isolation_owners on public.owners;
create policy org_isolation_owners
on public.owners
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists org_isolation_tenants on public.tenants;
create policy org_isolation_tenants
on public.tenants
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists org_isolation_contracts on public.contracts;
create policy org_isolation_contracts
on public.contracts
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());
