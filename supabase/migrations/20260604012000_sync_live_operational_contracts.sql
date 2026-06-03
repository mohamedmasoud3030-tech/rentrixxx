-- Record compatibility fixes already applied successfully to the live project.
-- This migration is intentionally idempotent and type-aware so it can replay on
-- both the historical live schema and fresh schema environments.

do $$
declare
  column_type text;
begin
  if to_regclass('public.expenses') is not null then
    alter table public.expenses
      add column if not exists expense_date date;

    select data_type
      into column_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'expenses'
      and column_name = 'id';

    if column_type = 'text' then
      alter table public.expenses
        alter column id set default (gen_random_uuid())::text;
    elsif column_type = 'uuid' then
      alter table public.expenses
        alter column id set default gen_random_uuid();
    end if;

    create index if not exists expenses_expense_date_idx
      on public.expenses(expense_date)
      where deleted_at is null;
  end if;

  if to_regclass('public.properties') is not null then
    select data_type
      into column_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'id';

    if column_type = 'text' then
      alter table public.properties
        alter column id set default (gen_random_uuid())::text;
    elsif column_type = 'uuid' then
      alter table public.properties
        alter column id set default gen_random_uuid();
    end if;
  end if;

  if to_regclass('public.people') is not null then
    select data_type
      into column_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'people'
      and column_name = 'id';

    if column_type = 'text' then
      alter table public.people
        alter column id set default (gen_random_uuid())::text;
    elsif column_type = 'uuid' then
      alter table public.people
        alter column id set default gen_random_uuid();
    end if;
  end if;

  if to_regclass('public.units') is not null then
    select data_type
      into column_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'units'
      and column_name = 'id';

    if column_type = 'text' then
      alter table public.units
        alter column id set default (gen_random_uuid())::text;
    elsif column_type = 'uuid' then
      alter table public.units
        alter column id set default gen_random_uuid();
    end if;
  end if;
end;
$$;
