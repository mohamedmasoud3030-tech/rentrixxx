-- Add explicit authentication guards to mutable RPC functions.

create or replace function public.generate_invoices_from_active_contracts()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user uuid := (select auth.uid());
  v_generated_count integer;
begin
  if v_auth_user is null then
    raise exception 'Authentication is required';
  end if;

  with generated as (
    insert into public.invoices (contract_id, issue_date, due_date, amount, paid_amount, status)
    select c.id, current_date, current_date + interval '10 day', round(c.rent_amount::numeric,2), 0, 'issued'
    from public.contracts c
    where c.status = 'active' and c.deleted_at is null
      and not exists (
        select 1
        from public.invoices i
        where i.contract_id = c.id
          and i.deleted_at is null
          and date_trunc('month', i.issue_date) = date_trunc('month', current_date)
      )
    returning id
  )
  select count(*)::integer into v_generated_count from generated;

  return coalesce(v_generated_count, 0);
end;
$$;

create or replace function public.renew_contract_atomic(contract_id uuid, new_start date, new_end date, new_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user uuid := (select auth.uid());
  original_contract public.contracts%rowtype;
  new_contract_id uuid;
begin
  if v_auth_user is null then
    raise exception 'Authentication is required';
  end if;

  if new_end < new_start then
    raise exception 'new_end must be greater than or equal to new_start';
  end if;

  if new_amount < 0 then
    raise exception 'new_amount must be greater than or equal to zero';
  end if;

  select * into original_contract
  from public.contracts
  where id = contract_id and deleted_at is null
  for update;

  if not found then
    raise exception 'contract not found';
  end if;

  update public.contracts
  set status = 'expired', updated_at = timezone('utc', now())
  where id = original_contract.id;

  insert into public.contracts (
    property_id, unit_id, tenant_id, start_date, end_date,
    rent_amount, payment_cycle, status, notes, renewed_from_id
  ) values (
    original_contract.property_id, original_contract.unit_id, original_contract.tenant_id,
    new_start, new_end, new_amount, original_contract.payment_cycle, 'draft',
    original_contract.notes, original_contract.id
  )
  returning id into new_contract_id;

  return new_contract_id;
end;
$$;
