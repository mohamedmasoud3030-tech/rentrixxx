-- Reconcile the verified live units.status casing drift conservatively.
-- Canonical stored values: available | occupied | maintenance | reserved.
-- Historical compatibility: RENTED is accepted only as an incoming alias and stored as occupied.

-- Abort before mutation if any value cannot be reconciled safely.
do $$
begin
  if exists (
    select 1
    from public.units
    where status is null
       or btrim(lower(status::text)) not in ('available', 'occupied', 'rented', 'maintenance', 'reserved')
  ) then
    raise exception 'Cannot normalize public.units.status: unsupported values exist';
  end if;
end;
$$;

-- Normalize future writes, including writes emitted by historical trigger functions.
create or replace function public.normalize_unit_status_contract()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  canonical_status text;
begin
  canonical_status := case btrim(lower(new.status::text))
    when 'available' then 'available'
    when 'occupied' then 'occupied'
    when 'rented' then 'occupied'
    when 'maintenance' then 'maintenance'
    when 'reserved' then 'reserved'
    else null
  end;

  if canonical_status is null then
    raise exception 'Unsupported public.units.status value: %', new.status;
  end if;

  new.status := canonical_status;
  return new;
end;
$$;

create or replace trigger units_normalize_status_contract
before insert or update of status on public.units
for each row
execute function public.normalize_unit_status_contract();

-- Support the verified live text column and fresh schema replays using public.unit_status.
do $$
declare
  status_data_type text;
begin
  select data_type
  into status_data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'units'
    and column_name = 'status';

  if status_data_type is null then
    raise exception 'Cannot normalize public.units.status: column is missing';
  end if;

  if status_data_type = 'USER-DEFINED' then
    execute $update_enum$
      update public.units
      set status = (
        case btrim(lower(status::text))
          when 'rented' then 'occupied'
          else btrim(lower(status::text))
        end
      )::public.unit_status
      where status::text is distinct from (
        case btrim(lower(status::text))
          when 'rented' then 'occupied'
          else btrim(lower(status::text))
        end
      )
    $update_enum$;
  else
    update public.units
    set status = case btrim(lower(status::text))
      when 'rented' then 'occupied'
      else btrim(lower(status::text))
    end
    where status::text is distinct from (
      case btrim(lower(status::text))
        when 'rented' then 'occupied'
        else btrim(lower(status::text))
      end
    );
  end if;
end;
$$;

-- Add the canonical check only when it is not already present.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.units'::regclass
      and conname = 'units_status_canonical_check'
  ) then
    alter table public.units
      add constraint units_status_canonical_check
      check (status::text in ('available', 'occupied', 'maintenance', 'reserved'))
      not valid;
  end if;
end;
$$;

alter table public.units
  validate constraint units_status_canonical_check;
