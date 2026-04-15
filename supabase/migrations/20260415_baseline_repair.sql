-- ==========================================
-- BASELINE REPAIR MIGRATION
-- Fix broken migration history safely
-- ==========================================

-- 1. No-op to register new baseline
select 1;

-- 2. Ensure critical tables exist (no destructive ops)
create table if not exists tenants (
  id uuid primary key default gen_random_uuid()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid()
);

-- 3. Ensure critical columns exist
alter table if exists tenants add column if not exists name text;
alter table if exists invoices add column if not exists amount numeric;
alter table if exists payments add column if not exists amount numeric;

-- 4. Guard against broken previous migrations
DO $$
BEGIN
  -- prevent crash if old constraints already exist or missing
  BEGIN
    alter table invoices add constraint invoices_amount_check check (amount >= 0);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    alter table payments add constraint payments_amount_check check (amount >= 0);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 5. Ensure automation_runs exists for app stability
create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp default now()
);

-- ==========================================
-- END BASELINE FIX
-- ==========================================