-- Migration v6: critical schema hotfixes for runtime compatibility
-- Date: 2026-03-30

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS ref TEXT;

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS ref TEXT,
ADD COLUMN IF NOT EXISTS property_id UUID;

ALTER TABLE public.owners
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'RATE',
ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS portal_token TEXT,
ADD COLUMN IF NOT EXISTS management_contract_date TEXT;
