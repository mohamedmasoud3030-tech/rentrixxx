-- ============================================================
-- Rentrix - Attachments table refactor for Supabase Storage
-- NOTE: legacy base64 columns are kept for fallback.
-- ============================================================

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  file_size integer,
  mime_type text not null,
  storage_path text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.attachments
  add column if not exists file_name text,
  add column if not exists file_size integer,
  add column if not exists mime_type text,
  add column if not exists storage_path text,
  add column if not exists uploaded_by uuid references auth.users(id),
  add column if not exists created_at_ts timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'attachments'
      and column_name = 'entity_id'
      and data_type <> 'uuid'
  ) then
    alter table public.attachments
      alter column entity_id type uuid using nullif(entity_id, '')::uuid;
  end if;
exception
  when others then
    raise notice 'entity_id conversion skipped: %', sqlerrm;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'attachments'
      and column_name = 'created_at'
      and data_type <> 'timestamp with time zone'
  ) then
    update public.attachments
    set created_at_ts = coalesce(to_timestamp(created_at::double precision / 1000.0), now())
    where created_at is not null and created_at_ts is null;
  end if;
end $$;

alter table public.attachments
  alter column entity_type set not null,
  alter column entity_id set not null;

-- Keep legacy columns and mark them as deprecated.
comment on column public.attachments.data_url is 'deprecated: use attachments table storage_path';
comment on column public.utility_bills.bill_image_url is 'deprecated: use attachments table';
comment on column public.utility_bills.bill_image_mime is 'deprecated: use attachments table';
