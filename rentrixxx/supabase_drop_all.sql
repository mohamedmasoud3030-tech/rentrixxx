-- ============================================================
-- Rentrix – Drop All Tables  (run this BEFORE supabase_schema.sql
-- if you previously ran an older version of the schema)
-- ============================================================

DROP TABLE IF EXISTS public.tenant_balances        CASCADE;
DROP TABLE IF EXISTS public.contract_balances      CASCADE;
DROP TABLE IF EXISTS public.owner_balances         CASCADE;
DROP TABLE IF EXISTS public.auto_backups           CASCADE;
DROP TABLE IF EXISTS public.attachments            CASCADE;
DROP TABLE IF EXISTS public.budgets                CASCADE;
DROP TABLE IF EXISTS public.missions               CASCADE;
DROP TABLE IF EXISTS public.commissions            CASCADE;
DROP TABLE IF EXISTS public.lands                  CASCADE;
DROP TABLE IF EXISTS public.leads                  CASCADE;
DROP TABLE IF EXISTS public.app_notifications      CASCADE;
DROP TABLE IF EXISTS public.outgoing_notifications CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.governance             CASCADE;
DROP TABLE IF EXISTS public.serials                CASCADE;
DROP TABLE IF EXISTS public.snapshots              CASCADE;
DROP TABLE IF EXISTS public.owner_settlements      CASCADE;
DROP TABLE IF EXISTS public.journal_entries        CASCADE;
DROP TABLE IF EXISTS public.accounts               CASCADE;
DROP TABLE IF EXISTS public.audit_log              CASCADE;
DROP TABLE IF EXISTS public.deposit_txs            CASCADE;
DROP TABLE IF EXISTS public.maintenance_records    CASCADE;
DROP TABLE IF EXISTS public.expenses               CASCADE;
DROP TABLE IF EXISTS public.receipt_allocations    CASCADE;
DROP TABLE IF EXISTS public.receipts               CASCADE;
DROP TABLE IF EXISTS public.invoices               CASCADE;
DROP TABLE IF EXISTS public.contracts              CASCADE;
DROP TABLE IF EXISTS public.tenants                CASCADE;
DROP TABLE IF EXISTS public.units                  CASCADE;
DROP TABLE IF EXISTS public.properties             CASCADE;
DROP TABLE IF EXISTS public.owners                 CASCADE;
DROP TABLE IF EXISTS public.settings               CASCADE;
DROP TABLE IF EXISTS public.profiles               CASCADE;

-- Now run supabase_schema.sql
