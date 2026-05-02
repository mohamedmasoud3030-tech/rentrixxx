alter table if exists public.contracts
  add column if not exists deleted_at timestamptz;
