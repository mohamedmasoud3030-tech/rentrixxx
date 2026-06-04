-- Keep current and historical payment reference columns synchronized during the
-- first-client demo compatibility window.

alter table if exists public.payments
  add column if not exists reference_number text;

alter table if exists public.payments
  add column if not exists payment_reference text;

create or replace function public.sync_payment_reference_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if nullif(new.reference_number, '') is not null
     and nullif(new.payment_reference, '') is not null
     and new.reference_number is distinct from new.payment_reference then
    raise exception 'payments reference_number and payment_reference must match when both are provided';
  end if;

  if nullif(new.reference_number, '') is null and nullif(new.payment_reference, '') is not null then
    new.reference_number := new.payment_reference;
  elsif nullif(new.payment_reference, '') is null and nullif(new.reference_number, '') is not null then
    new.payment_reference := new.reference_number;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_sync_reference_columns on public.payments;

create trigger payments_sync_reference_columns
before insert or update on public.payments
for each row
execute function public.sync_payment_reference_columns();
