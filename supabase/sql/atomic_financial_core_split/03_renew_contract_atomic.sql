create or replace function public.renew_contract_atomic(
  old_contract_id uuid,
  new_contract_data jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_unit_id uuid;
  v_active_count integer;
  v_request_id text;
  v_existing jsonb;
  v_tenant_id uuid;
begin
  v_request_id := nullif(new_contract_data->>'request_id', '');

  if v_request_id is not null then
    select response_payload
      into v_existing
    from public.financial_operation_idempotency
    where operation_name = 'renew_contract_atomic'
      and request_id = v_request_id
    for update;

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  select unit_id
    into v_unit_id
  from public.contracts
  where id = old_contract_id
    and status = 'ACTIVE'
    and deleted_at is null;

  if not found then
    raise exception 'Original contract is not ACTIVE';
  end if;

  select count(*)
    into v_active_count
  from public.contracts
  where unit_id = v_unit_id
    and status = 'ACTIVE'
    and deleted_at is null
    and id <> old_contract_id;

  if v_active_count > 0 then
    raise exception 'Unit already has another ACTIVE contract';
  end if;

  update public.contracts
  set
    status = 'ENDED',
    ended_at = now(),
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where id = old_contract_id;

  -- single-office mode: tenant scoping comes from the contract tenant_id
  select tenant_id into v_tenant_id
  from public.contracts
  where id = old_contract_id;

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
    'ACTIVE',
    r.sponsor_name,
    r.sponsor_id,
    r.sponsor_phone,
    coalesce(r.is_demo, false),
    coalesce(r.created_at, (extract(epoch from now()) * 1000)::bigint),
    r.updated_at,
    null
  from jsonb_populate_record(null::public.contracts, new_contract_data) as r
  returning id into v_new_id;

  v_existing := jsonb_build_object(
    'success', true,
    'old_contract_id', old_contract_id,
    'new_contract_id', v_new_id
  );

  if v_request_id is not null then
    insert into public.financial_operation_idempotency (operation_name, request_id, response_payload)
    values ('renew_contract_atomic', v_request_id, v_existing)
    on conflict (operation_name, request_id) do nothing;
  end if;

  insert into public.financial_audit_log (
    action,
    actor_id,
    source_module,
    request_id,
    entity_type,
    entity_id,
    before_state,
    after_state,
    metadata
  ) values (
    'RENEW_CONTRACT',
    null,
    'CONTRACTS',
    v_request_id,
    'CONTRACT',
    v_new_id,
    jsonb_build_object('old_contract_id', old_contract_id),
    jsonb_build_object('new_contract_id', v_new_id),
    jsonb_build_object('function', 'renew_contract_atomic')
  );

  perform public.append_financial_event(
    'CONTRACT_RENEWED',
    v_tenant_id,
    v_request_id,
    'CONTRACT',
    v_new_id,
    jsonb_build_object('old_contract_id', old_contract_id, 'new_contract_id', v_new_id)
  );

  return v_existing;
end;
$$;
