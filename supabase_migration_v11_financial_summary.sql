CREATE OR REPLACE FUNCTION get_financial_summary()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    summary json;
BEGIN
    SELECT json_build_object(
        'receiptsToday', (SELECT COALESCE(SUM(amount), 0) FROM receipts WHERE DATE(dateTime) = CURRENT_DATE),
        'expensesMonth', (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE DATE_TRUNC('month', "dateTime") = DATE_TRUNC('month', CURRENT_DATE)),
        'totalDeposits', (SELECT COALESCE(SUM(CASE WHEN type = 'DEPOSIT_IN' THEN amount WHEN type = 'DEPOSIT_RETURN' THEN -amount ELSE 0 END), 0) FROM deposit_txs),
        'pendingSettlements', (SELECT COUNT(*) FROM owner_settlements),
        'openInvoices', (SELECT COUNT(*) FROM invoices WHERE status <> 'PAID')
    )
    INTO summary;

    RETURN summary;
END;
$$;