alter table public.contracts
  drop constraint if exists contracts_unit_id_required;

alter table public.contracts
  add constraint contracts_unit_id_required check (unit_id is not null) not valid;

alter table public.contracts
  drop constraint if exists contracts_rent_amount_positive;

alter table public.contracts
  add constraint contracts_rent_amount_positive check (rent_amount > 0) not valid;
