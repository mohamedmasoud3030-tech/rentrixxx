create or replace function check_unit_maintenance_block(
  p_unit_id uuid
) returns jsonb
language plpgsql
as $$
declare
  v_blocking_count integer;
  v_blocking_requests jsonb;
begin
  select
    count(*),
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', description,
        'priority', priority,
        'status', status
      )
    )
  into v_blocking_count, v_blocking_requests
  from maintenance_records
  where unit_id = p_unit_id
    and status in ('NEW', 'IN_PROGRESS')
    and priority in ('URGENT', 'HIGH');

  return jsonb_build_object(
    'blocked', v_blocking_count > 0,
    'count', v_blocking_count,
    'requests', coalesce(v_blocking_requests, '[]'::jsonb)
  );
end;
$$;

grant execute on function check_unit_maintenance_block(uuid) to authenticated;
