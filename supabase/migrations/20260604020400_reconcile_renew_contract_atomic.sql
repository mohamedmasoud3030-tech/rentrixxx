-- Stable server-side renewal RPC. The browser supplies only the old contract id
-- and allowed renewal fields; stable relational fields are copied in the DB.

create or replace function public.contract_status_label(preferred text[])
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  status_column record;
  label text;
begin
  select data_type, udt_name
    into status_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'contracts'
    and column_name = 'status';

  if status_column.udt_name is not null then
    for label in select unnest(preferred)
    loop
      if exists (
        select 1
        from pg_type t
        join pg_enum e on e.enumtypid = t.oid
        where t.typnamespace = 'public'::regnamespace
          and t.typname = status_column.udt_name
          and e.enumlabel = label
      ) then
        return label;
      end if;
    end loop;
  end if;

  return preferred[1];
end;
$$;

create or replace function public.renew_contract_atomic(
  old_contract_id uuid,
  new_contract_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid;
  original_contract jsonb;
  new_start date;
  new_end date;
  new_amount numeric;
  new_contract_id uuid;
  old_terminal_status text;
  new_contract_status text;
  insert_columns text[] := array[]::text[];
  insert_values text[] := array[]::text[];
  v_column_name text;
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception 'Authentication is required to renew contracts';
  end if;

  new_start := nullif(new_contract_data->>'new_start', '')::date;
  new_end := nullif(new_contract_data->>'new_end', '')::date;
  new_amount := coalesce((new_contract_data->>'new_amount')::numeric, 0);

  if new_start is null or new_end is null then
    raise exception 'new_start and new_end are required';
  end if;

  if new_end < new_start then
    raise exception 'new_end must be greater than or equal to new_start';
  end if;

  if new_amount <= 0 then
    raise exception 'new_amount must be greater than zero';
  end if;

  select to_jsonb(c)
    into original_contract
  from public.contracts c
  where c.id = old_contract_id
    and coalesce((to_jsonb(c)->>'deleted_at')::timestamptz, null) is null
  for update;

  if original_contract is null then
    raise exception 'contract not found';
  end if;

  old_terminal_status := public.contract_status_label(array['renewed', 'expired', 'terminated', 'RENEWED', 'EXPIRED', 'TERMINATED']);
  new_contract_status := public.contract_status_label(array['draft', 'DRAFT', 'active', 'ACTIVE']);

  foreach v_column_name in array array['property_id', 'unit_id', 'tenant_id', 'organization_id', 'org_id', 'company_id', 'payment_cycle', 'notes']
  loop
    if original_contract ? v_column_name
       and exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'contracts'
           and column_name = v_column_name
       ) then
      insert_columns := insert_columns || quote_ident(v_column_name);
      insert_values := insert_values || quote_nullable(original_contract->>v_column_name);
    end if;
  end loop;

  insert_columns := insert_columns || array['start_date', 'end_date', 'rent_amount', 'status'];
  insert_values := insert_values || array[quote_literal(new_start), quote_literal(new_end), quote_literal(new_amount), quote_literal(new_contract_status)];

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contracts'
      and column_name = 'renewed_from_id'
  ) then
    insert_columns := insert_columns || 'renewed_from_id';
    insert_values := insert_values || quote_literal(old_contract_id);
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contracts'
      and column_name = 'previous_contract_id'
  ) then
    insert_columns := insert_columns || 'previous_contract_id';
    insert_values := insert_values || quote_literal(old_contract_id);
  end if;

  execute format(
    'insert into public.contracts (%s) values (%s) returning id',
    array_to_string(insert_columns, ', '),
    array_to_string(insert_values, ', ')
  ) into new_contract_id;

  execute format(
    'update public.contracts set status = %L, updated_at = timezone(''utc'', now()) where id = %L',
    old_terminal_status,
    old_contract_id
  );

  return jsonb_build_object(
    'status', 'renewed',
    'old_contract_id', old_contract_id,
    'new_contract_id', new_contract_id
  );
end;
$$;

revoke all on function public.contract_status_label(text[]) from public, anon;
grant execute on function public.contract_status_label(text[]) to authenticated;

revoke all on function public.renew_contract_atomic(uuid, jsonb) from public, anon;
grant execute on function public.renew_contract_atomic(uuid, jsonb) to authenticated;
