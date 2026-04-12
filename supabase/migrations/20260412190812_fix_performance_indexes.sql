-- إضافة indexes للـ foreign keys المفقودة + حذف duplicate indexes
CREATE INDEX IF NOT EXISTS idx_automation_run_logs_job_id    ON public.automation_run_logs (job_id);
CREATE INDEX IF NOT EXISTS idx_contracts_unit_id             ON public.contracts (unit_id);
CREATE INDEX IF NOT EXISTS idx_deposit_txs_contract_id       ON public.deposit_txs (contract_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_id    ON public.journal_entries (account_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_reported_by ON public.maintenance_records (reported_by);
CREATE INDEX IF NOT EXISTS idx_receipt_allocations_invoice_id ON public.receipt_allocations (invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipt_allocations_receipt_id ON public.receipt_allocations (receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipts_contract_id          ON public.receipts (contract_id);
CREATE INDEX IF NOT EXISTS idx_status_history_actor_id       ON public.status_history (actor_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id             ON public.units (property_id);
DROP INDEX IF EXISTS public.idx_maintenance_unit_status;
DROP INDEX IF EXISTS public.tenants_unit_id_idx;
