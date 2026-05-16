-- Harden the payment receipt write path without changing the frontend RPC payload.
--
-- The public.post_receipt_atomic argument names intentionally match the
-- Supabase RPC payload used by the frontend: invoice_id, amount, method, date,
-- and reference. This migration also removes direct authenticated writes to
-- payments so posted receipts are written through the guarded RPC path.

drop function if exists public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text);

create function public.post_receipt_atomic(
  invoice_id uuid,
  amount numeric,
  method public.payment_method,
  date date,
  reference text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user uuid := (select auth.uid());
  v_invoice public.invoices%rowtype;
  v_amount numeric(14, 2);
  v_remaining numeric(14, 2);
  v_new_paid_amount numeric(14, 2);
begin
  if v_auth_user is null then
    raise exception 'Authentication is required';
  end if;

  if amount is null or amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if date is null then
    raise exception 'Payment date is required';
  end if;

  v_amount := round(amount::numeric, 2);

  select i.*
    into v_invoice
    from public.invoices i
    join public.contracts c on c.id = i.contract_id
    join public.properties p on p.id = c.property_id
   where i.id = invoice_id
     and i.deleted_at is null
     and c.deleted_at is null
     and p.deleted_at is null
   for update of i;

  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;

  v_remaining := round((v_invoice.amount - v_invoice.paid_amount)::numeric, 2);

  if v_amount > v_remaining then
    raise exception 'Payment exceeds remaining balance';
  end if;

  v_new_paid_amount := round((v_invoice.paid_amount + v_amount)::numeric, 2);

  insert into public.payments(invoice_id, amount, payment_method, payment_date, reference_number)
  values (v_invoice.id, v_amount, method, date, reference);

  update public.invoices
     set paid_amount = v_new_paid_amount,
         status = case
           when v_new_paid_amount >= v_invoice.amount then 'paid'
           when v_new_paid_amount > 0 then 'partial'
           else status
         end
   where id = v_invoice.id;

  return 'ok';
end;
$$;

revoke execute on function public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text) from public, anon;
grant execute on function public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text) to authenticated;

drop policy if exists "Authenticated users can manage payments" on public.payments;
drop policy if exists authenticated_manage_payments on public.payments;

create policy authenticated_read_payments
on public.payments
for select
to authenticated
using ((select auth.uid()) is not null);
