alter table public.contracts
  alter column unit_id set not null;

alter table public.contracts
  drop constraint if exists contracts_rent_amount_positive;

alter table public.contracts
  add constraint contracts_rent_amount_positive check (rent_amount > 0) not valid;
