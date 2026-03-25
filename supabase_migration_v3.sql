-- ============================================================
-- Rentrix – Supabase Migration v3 – Add missing columns
-- Run AFTER the base schema (supabase_schema.sql) is applied
-- ============================================================

-- OWNERS: add missing fields
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS management_contract_date TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'RATE';
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS portal_token TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- PROPERTIES: add missing fields
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS area NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS year_built INT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS facilities TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- UNITS: add missing fields
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS rent_default NUMERIC DEFAULT 0;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS bedrooms INT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS bathrooms INT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS kitchens INT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS living_rooms INT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS water_meter TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS electricity_meter TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS features TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- Backfill rent_default from legacy rent column where rent_default is 0 or null
UPDATE public.units SET rent_default = rent WHERE (rent_default IS NULL OR rent_default = 0) AND rent IS NOT NULL AND rent > 0;

-- TENANTS: add missing fields
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'INDIVIDUAL';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cr_number TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS po_box TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- CONTRACTS: add missing fields
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS due_day INT DEFAULT 1;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS sponsor_name TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS sponsor_id TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS sponsor_phone TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- INVOICES: add missing fields
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS external_payment_ref TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- RECEIPTS: add missing fields
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ref TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- EXPENSES: add missing fields
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payee TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_amount NUMERIC;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ref TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- MAINTENANCE RECORDS: add missing fields
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS expense_id UUID;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS completed_at BIGINT;

-- DEPOSIT TXS: add missing field
ALTER TABLE public.deposit_txs ADD COLUMN IF NOT EXISTS note TEXT;

-- OWNER SETTLEMENTS: add missing fields
ALTER TABLE public.owner_settlements ADD COLUMN IF NOT EXISTS ref TEXT;
ALTER TABLE public.owner_settlements ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- LEADS: add missing fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS desired_unit_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS min_budget NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS max_budget NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- LANDS: add missing fields
ALTER TABLE public.lands ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.lands ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.lands ADD COLUMN IF NOT EXISTS owner_price NUMERIC;
ALTER TABLE public.lands ADD COLUMN IF NOT EXISTS commission NUMERIC;
ALTER TABLE public.lands ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.lands ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- COMMISSIONS: add missing fields
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS deal_value NUMERIC;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS percentage NUMERIC;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS expense_id UUID;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS paid_at BIGINT;

-- MISSIONS: add missing fields
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS result_summary TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- BUDGETS: add missing fields
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- OUTGOING NOTIFICATIONS: add missing fields
ALTER TABLE public.outgoing_notifications ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.outgoing_notifications ADD COLUMN IF NOT EXISTS recipient_contact TEXT;

-- RECEIPTS: add check/electronic payment tracking fields
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS check_number TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS check_bank TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS check_date TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS check_status TEXT DEFAULT 'PENDING';

-- APP_NOTIFICATIONS: add WhatsApp invoice notification fields
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;

-- ============================================================
-- DONE – paste into Supabase SQL Editor and click Run
-- ============================================================
