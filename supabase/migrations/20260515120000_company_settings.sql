-- Persisted company settings foundation.

create extension if not exists pgcrypto;

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true,
  company_name text not null default 'Rentrix',
  legal_name text,
  tax_number text,
  registration_number text,
  phone text,
  email text,
  address text,
  city text,
  country text default 'Oman',
  currency text not null default 'OMR',
  locale text not null default 'ar-OM',
  timezone text not null default 'Asia/Muscat',
  date_format text not null default 'dd/MM/yyyy',
  number_format text not null default 'ar-OM',
  logo_url text,
  invoice_prefix text not null default 'INV',
  receipt_prefix text not null default 'REC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint company_settings_singleton_key_true check (singleton_key),
  constraint company_settings_singleton_key_unique unique (singleton_key),
  constraint company_settings_company_name_not_blank check (length(btrim(company_name)) > 0),
  constraint company_settings_currency_not_blank check (length(btrim(currency)) > 0),
  constraint company_settings_locale_not_blank check (length(btrim(locale)) > 0),
  constraint company_settings_timezone_not_blank check (length(btrim(timezone)) > 0),
  constraint company_settings_date_format_not_blank check (length(btrim(date_format)) > 0),
  constraint company_settings_number_format_not_blank check (length(btrim(number_format)) > 0),
  constraint company_settings_invoice_prefix_not_blank check (length(btrim(invoice_prefix)) > 0),
  constraint company_settings_receipt_prefix_not_blank check (length(btrim(receipt_prefix)) > 0)
);

drop trigger if exists company_settings_set_updated_at on public.company_settings;

create trigger company_settings_set_updated_at
before update on public.company_settings
for each row
execute function public.set_updated_at();

alter table public.company_settings enable row level security;
alter table public.company_settings force row level security;

drop policy if exists authenticated_read_company_settings on public.company_settings;
drop policy if exists authenticated_update_company_settings on public.company_settings;

create policy authenticated_read_company_settings
on public.company_settings
for select
to authenticated
using ((select auth.uid()) is not null);

create policy authenticated_update_company_settings
on public.company_settings
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null and singleton_key = true);

insert into public.company_settings (
  id,
  singleton_key,
  company_name,
  country,
  currency,
  locale,
  timezone,
  date_format,
  number_format,
  invoice_prefix,
  receipt_prefix
)
values (
  '00000000-0000-4000-8000-000000000001',
  true,
  'Rentrix',
  'Oman',
  'OMR',
  'ar-OM',
  'Asia/Muscat',
  'dd/MM/yyyy',
  'ar-OM',
  'INV',
  'REC'
)
on conflict (singleton_key) do nothing;
