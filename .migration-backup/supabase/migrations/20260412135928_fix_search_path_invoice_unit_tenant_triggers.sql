CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  update invoices set status =
    case
      when paid_amount >= amount + coalesce(tax_amount, 0) then 'PAID'
      when paid_amount > 0 then 'PARTIALLY_PAID'
      else 'UNPAID'
    end
  where id = coalesce(NEW.invoice_id, OLD.invoice_id);
  return coalesce(NEW, OLD);
end;
$$;
