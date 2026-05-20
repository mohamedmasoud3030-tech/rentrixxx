do $$
begin
  if exists (
    select 1
      from public.contracts
     where unit_id is null
        or rent_amount is null
        or rent_amount <= 0
  ) then
    raise exception 'Cannot validate contract integrity constraints: existing contracts contain null unit_id or non-positive rent_amount values.';
  end if;
end;
$$;

alter table public.contracts
  validate constraint contracts_unit_id_required;

alter table public.contracts
  validate constraint contracts_rent_amount_positive;
