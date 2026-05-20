-- Phase 2B contracts: cancellation metadata and atomic renewal.

alter table public.contracts
  add column if not exists cancellation_reason text,
  add column if not exists renewed_from_id uuid references public.contracts(id) on delete restrict;

create index if not exists contracts_renewed_from_id_idx on public.contracts(renewed_from_id) where renewed_from_id is not null and deleted_at is null;

create or replace function public.renew_contract_atomic(
  contract_id uuid,
  new_start date,
  new_end date,
  new_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  original_contract public.contracts%rowtype;
  new_contract_id uuid;
begin
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
    property_id,
    unit_id,
    tenant_id,
    start_date,
    end_date,
    rent_amount,
    payment_cycle,
    status,
    notes,
    renewed_from_id
  ) values (
    original_contract.property_id,
    original_contract.unit_id,
    original_contract.tenant_id,
    new_start,
    new_end,
    new_amount,
    original_contract.payment_cycle,
    'draft',
    original_contract.notes,
    original_contract.id
  )
  returning id into new_contract_id;

  return new_contract_id;
end;
$$;

grant execute on function public.renew_contract_atomic(uuid, date, date, numeric) to authenticated;
