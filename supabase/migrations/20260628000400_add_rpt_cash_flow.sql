-- Migration: add_rpt_cash_flow
-- Description: Adds the rpt_cash_flow function for financial reporting.

CREATE OR REPLACE FUNCTION rpt_cash_flow(
  p_from_date date,
  p_to_date date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_operating jsonb;
  v_investing jsonb;
  v_financing jsonb;
  v_receipts numeric;
  v_expenses numeric;
BEGIN
  -- Operating: Rent receipts - Expense payments
  
  -- Calculate Receipts (from payments table)
  SELECT COALESCE(SUM(amount), 0) INTO v_receipts
  FROM public.payments
  WHERE payment_date BETWEEN p_from_date AND p_to_date
    AND deleted_at IS NULL;

  -- Calculate Expenses (from expenses table)
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM public.expenses
  WHERE expense_date BETWEEN p_from_date AND p_to_date
    AND deleted_at IS NULL;

  v_operating := jsonb_build_object(
    'receipts', v_receipts,
    'expenses', v_expenses,
    'net_operating', v_receipts - v_expenses
  );

  -- For single-office, investing and financing are often N/A or handled via journal entries
  v_investing := jsonb_build_object('note', 'not_applicable_single_office', 'amount', 0);
  v_financing := jsonb_build_object('note', 'not_applicable_single_office', 'amount', 0);

  RETURN jsonb_build_object(
    'period', jsonb_build_object('from', p_from_date, 'to', p_to_date),
    'operating', v_operating,
    'investing', v_investing,
    'financing', v_financing,
    'net_change', v_receipts - v_expenses
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpt_cash_flow(date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpt_cash_flow(date, date) TO authenticated;
