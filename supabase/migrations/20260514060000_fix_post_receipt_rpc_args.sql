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
as $$
declare
  v_invoice public.invoices%rowtype;
  v_amount numeric := round(amount::numeric, 2);
begin
  select *
    into v_invoice
    from public.invoices
   where id = invoice_id
     and deleted_at is null
   for update;

  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;

  if v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if round((v_invoice.paid_amount + v_amount)::numeric, 2) > v_invoice.amount then
    raise exception 'Payment exceeds remaining balance';
  end if;

  insert into public.payments(invoice_id, amount, payment_method, payment_date, reference_number)
  values (v_invoice.id, v_amount, method, date, reference);

  update public.invoices
     set paid_amount = round((v_invoice.paid_amount + v_amount)::numeric, 2),
         status = case
           when round((v_invoice.paid_amount + v_amount)::numeric, 2) >= v_invoice.amount then 'paid'
           when round((v_invoice.paid_amount + v_amount)::numeric, 2) > 0 then 'partial'
           else status
         end
   where id = v_invoice.id;

  return 'ok';
end;
$$;
