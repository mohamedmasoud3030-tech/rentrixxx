-- Persist live compatibility fixes for demo-critical entity id defaults.
-- Existing rows are preserved; only missing insert defaults are reconciled.

do $$
declare
  target record;
  column_type text;
begin
  for target in
    select *
    from (values
      ('contracts'),
      ('invoices'),
      ('maintenance_requests'),
      ('maintenance_records')
    ) as t(table_name)
  loop
    if to_regclass(format('public.%I', target.table_name)) is not null then
      select data_type
        into column_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = target.table_name
        and column_name = 'id';

      if column_type = 'uuid' then
        execute format('alter table public.%I alter column id set default gen_random_uuid()', target.table_name);
      elsif column_type = 'text' then
        execute format('alter table public.%I alter column id set default (gen_random_uuid())::text', target.table_name);
      end if;
    end if;
  end loop;
end;
$$;
