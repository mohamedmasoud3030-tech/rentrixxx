-- Add attachment_url columns to maintenance_records, contracts, expenses
-- P2-4.4: File upload & attachments

alter table public.maintenance_records
  add column if not exists attachment_url text;

alter table public.expenses
  add column if not exists attachment_url text;

alter table public.contracts
  add column if not exists attachment_url text;
