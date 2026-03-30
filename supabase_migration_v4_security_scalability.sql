-- Atomic serial increment to avoid race conditions
create or replace function public.increment_serial(serial_column text)
returns integer
language plpgsql
security definer
as $$
declare
  result integer;
begin
  if serial_column not in ('receipt','expense','maintenance','invoice','lead','owner_settlement','journal_entry','mission','contract') then
    raise exception 'invalid serial column';
  end if;

  execute format('update serials set %I = coalesce(%I, 999) + 1 where id = 1 returning %I', serial_column, serial_column, serial_column)
  into result;

  if result is null then
    insert into serials(id) values (1)
    on conflict (id) do nothing;

    execute format('update serials set %I = coalesce(%I, 999) + 1 where id = 1 returning %I', serial_column, serial_column, serial_column)
    into result;
  end if;

  return result;
end;
$$;
