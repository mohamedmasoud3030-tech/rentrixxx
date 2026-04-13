create or replace function public.renew_contract_atomic(
  p_old_contract_id uuid,
  p_new_contract jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_new_id uuid;
  v_unit_id uuid;
  v_active_count integer;
begin
  -- Guard: original contract must be ACTIVE and not soft-deleted
  select unit_id
  into v_unit_id
  from public.contracts
  where id = p_old_contract_id
    and status = 'ACTIVE'
    and deleted_at is null;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Original contract is not ACTIVE'
    );
  end if;

  -- Guard: no other active contract on the same unit (excluding soft-deleted rows)
  select count(*)
  into v_active_count
  from public.contracts
  where unit_id = v_unit_id
    and status = 'ACTIVE'
    and deleted_at is null
    and id <> p_old_contract_id;

  if v_active_count > 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Unit already has another ACTIVE contract'
    );
  end if;

  -- Step 1: close old contract first
  update public.contracts
  set
    status = 'ENDED',
    ended_at = now(),
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where id = p_old_contract_id;

  -- Step 2: only then create the new contract
  insert into public.contracts (
    id,
    no,
    unit_id,
    tenant_id,
    rent_amount,
    due_day,
    start_date,
    end_date,
    deposit,
    status,
    sponsor_name,
    sponsor_id,
    sponsor_phone,
    is_demo,
    created_at,
    updated_at,
    deleted_at
  )
  select
    coalesce(r.id, gen_random_uuid()),
    r.no,
    r.unit_id,
    r.tenant_id,
    r.rent_amount,
    r.due_day,
    r.start_date,
    r.end_date,
    coalesce(r.deposit, 0),
    coalesce(r.status, 'ACTIVE'),
    r.sponsor_name,
    r.sponsor_id,
    r.sponsor_phone,
    coalesce(r.is_demo, false),
    coalesce(r.created_at, (extract(epoch from now()) * 1000)::bigint),
    r.updated_at,
    null
  from jsonb_populate_record(null::public.contracts, p_new_contract) as r
  returning id into v_new_id;

  return jsonb_build_object(
    'success', true,
    'old_contract_id', p_old_contract_id,
    'new_contract_id', v_new_id
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', sqlerrm
    );
end;
$$;

grant execute on function public.renew_contract_atomic(uuid, jsonb) to authenticated;
