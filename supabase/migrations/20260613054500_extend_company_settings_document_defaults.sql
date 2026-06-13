alter table public.company_settings
  add column if not exists contract_prefix text not null default 'CON',
  add column if not exists default_vat_rate numeric(6,3) not null default 0,
  add column if not exists notification_email_enabled boolean not null default true,
  add column if not exists notification_sms_enabled boolean not null default false;

alter table public.company_settings
  drop constraint if exists company_settings_contract_prefix_not_blank,
  add constraint company_settings_contract_prefix_not_blank check (length(btrim(contract_prefix)) > 0),
  drop constraint if exists company_settings_default_vat_rate_range,
  add constraint company_settings_default_vat_rate_range check (default_vat_rate >= 0 and default_vat_rate <= 100);
