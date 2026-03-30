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
 codex/conduct-full-technical-audit-y73z10

create table if not exists public.edge_rate_limits (
  id bigserial primary key,
  user_id uuid not null,
  endpoint text not null,
  ts bigint not null
);

create index if not exists idx_edge_rate_limits_lookup
  on public.edge_rate_limits (user_id, endpoint, ts);

 main
