-- Reconcile contract-number generation through public.serials and restrict the
-- sequence helper to authenticated callers only.

create table if not exists public.serials (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'default',
  value bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conrelid = 'public.serials'::regclass
      and conname = 'serials_scope_key'
  ) then
    alter table public.serials add constraint serials_scope_key unique (scope);
  end if;
end;
$$;

create or replace function public.increment_serial(scope_name text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_value bigint;
begin
  if nullif(btrim(scope_name), '') is null then
    raise exception 'serial scope is required';
  end if;

  insert into public.serials(scope, value, updated_at)
  values (scope_name, 1, timezone('utc', now()))
  on conflict (scope) do update
    set value = public.serials.value + 1,
        updated_at = timezone('utc', now())
  returning value into next_value;

  return next_value;
end;
$$;

revoke all on function public.increment_serial(text) from public, anon;
grant execute on function public.increment_serial(text) to authenticated;

create or replace function public.assign_contract_number_from_serials()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_column text;
  generated_number text;
begin
  select column_name
    into target_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'contracts'
    and column_name in ('contract_number', 'no')
  order by case column_name when 'contract_number' then 1 else 2 end
  limit 1;

  if target_column is null then
    return new;
  end if;

  if coalesce(to_jsonb(new)->>target_column, '') <> '' then
    return new;
  end if;

  generated_number := 'CON-' || lpad(public.increment_serial('contracts')::text, 6, '0');
  new := jsonb_populate_record(new, jsonb_build_object(target_column, generated_number));

  return new;
end;
$$;

drop trigger if exists contracts_assign_contract_number on public.contracts;

create trigger contracts_assign_contract_number
before insert on public.contracts
for each row
execute function public.assign_contract_number_from_serials();

revoke all on function public.assign_contract_number_from_serials() from public, anon;
grant execute on function public.assign_contract_number_from_serials() to authenticated;
