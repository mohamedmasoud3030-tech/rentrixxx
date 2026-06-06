-- Enforce the operational contract invariants at the database boundary.
-- Compatible with historical text dates and fresh replay typed date columns.

begin;

do $$
begin
  if exists (select 1 from public.units where status is null) then
    raise exception 'Cannot harden units.status while NULL values exist';
  end if;

  if exists (
    select 1
    from public.contracts c
    left join public.units u on u.id = c.unit_id
    where c.deleted_at is null
      and (
        c.property_id is null
        or c.unit_id is null
        or c.tenant_id is null
        or c.start_date is null
        or c.end_date is null
        or u.id is null
        or u.deleted_at is not null
        or u.property_id is distinct from c.property_id
      )
  ) then
    raise exception 'Cannot harden contracts while orphaned or mismatched rows exist';
  end if;

  if exists (
    select 1
    from public.contracts c
    where c.deleted_at is null
      and (
        btrim(c.start_date::text) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or btrim(c.end_date::text) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      )
  ) then
    raise exception 'Cannot harden contracts while non-ISO date values exist';
  end if;

  if exists (
    select 1
    from public.contracts c
    where c.deleted_at is null
      and btrim(c.end_date::text)::date < btrim(c.start_date::text)::date
  ) then
    raise exception 'Cannot harden contracts while invalid date windows exist';
  end if;

  if exists (
    select 1
    from public.contracts c1
    join public.contracts c2
      on c1.id < c2.id
     and c1.unit_id = c2.unit_id
    where c1.deleted_at is null
      and c2.deleted_at is null
      and lower(c1.status::text) = 'active'
      and lower(c2.status::text) = 'active'
      and btrim(c1.start_date::text)::date <= btrim(c2.end_date::text)::date
      and btrim(c2.start_date::text)::date <= btrim(c1.end_date::text)::date
  ) then
    raise exception 'Cannot harden contracts while overlapping active windows exist';
  end if;
end
$$;

alter table public.units
  alter column status set default 'available',
  alter column status set not null;

alter table public.contracts
  alter column property_id set not null,
  alter column unit_id set not null,
  alter column tenant_id set not null,
  alter column start_date set not null,
  alter column end_date set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contracts'::regclass
      and conname = 'contracts_valid_date_window_check'
  ) then
    alter table public.contracts
      add constraint contracts_valid_date_window_check
      check (
        btrim(start_date::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        and btrim(end_date::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        and btrim(end_date::text)::date >= btrim(start_date::text)::date
      ) not valid;
  end if;
end
$$;

alter table public.contracts
  validate constraint contracts_valid_date_window_check;

create index if not exists contracts_active_unit_lookup_idx
  on public.contracts (unit_id)
  where deleted_at is null;

create or replace function public.validate_contract_invariants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  contract_start date;
  contract_end date;
begin
  if new.property_id is null or new.unit_id is null or new.tenant_id is null then
    raise exception 'Contract requires exactly one property, unit, and tenant';
  end if;

  if not exists (
    select 1
    from public.units u
    where u.id = new.unit_id
      and u.property_id = new.property_id
      and u.deleted_at is null
  ) then
    raise exception 'Contract unit must belong to the selected property';
  end if;

  if btrim(new.start_date::text) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or btrim(new.end_date::text) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Contract dates must use ISO YYYY-MM-DD format';
  end if;

  contract_start := btrim(new.start_date::text)::date;
  contract_end := btrim(new.end_date::text)::date;

  if contract_end < contract_start then
    raise exception 'Contract end_date must be greater than or equal to start_date';
  end if;

  if new.deleted_at is null and lower(new.status::text) = 'active' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.unit_id::text, 0)
    );

    if exists (
      select 1
      from public.contracts existing
      where existing.id is distinct from new.id
        and existing.deleted_at is null
        and lower(existing.status::text) = 'active'
        and existing.unit_id = new.unit_id
        and btrim(existing.start_date::text)::date <= contract_end
        and contract_start <= btrim(existing.end_date::text)::date
    ) then
      raise exception 'Unit already has an overlapping active contract';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_contract_invariants()
  from public, anon, authenticated;

drop trigger if exists contracts_prevent_active_overlap on public.contracts;
drop trigger if exists contracts_validate_invariants on public.contracts;

create trigger contracts_validate_invariants
before insert or update of property_id, unit_id, tenant_id, start_date, end_date, status, deleted_at
on public.contracts
for each row
execute function public.validate_contract_invariants();

commit;
