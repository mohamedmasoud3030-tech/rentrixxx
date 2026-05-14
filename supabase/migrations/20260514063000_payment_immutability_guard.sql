create or replace function public.prevent_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'payment records cannot be changed';
end;
$$;

drop trigger if exists payments_prevent_update on public.payments;
drop trigger if exists payments_prevent_delete on public.payments;

create trigger payments_prevent_update
before update on public.payments
for each row
execute function public.prevent_payment_mutation();

create trigger payments_prevent_delete
before delete on public.payments
for each row
execute function public.prevent_payment_mutation();
