create table if not exists public.owner_management_agreements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete restrict,
  property_owner_id uuid null references public.property_owners(id) on delete set null,
  agreement_type text not null,
  status text not null default 'draft',
  starts_on date not null,
  ends_on date null,
  currency text not null default 'OMR',
  calculation_basis text not null default 'cash_collected',
  payout_cycle text not null default 'monthly',
  payout_day smallint null,
  min_payout_amount numeric(12,2) null,
  carry_forward_deficit boolean not null default true,
  tax_inclusive boolean not null default false,
  deposit_treatment text not null default 'exclude',
  rounding_mode text not null default 'half_up_2dp',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  approved_by uuid null references auth.users(id) on delete set null,
  approved_at timestamptz null,
  constraint owner_management_agreements_type_check check (agreement_type in ('percentage_of_gross_collections','percentage_of_net_collections','fixed_owner_payout','fixed_management_fee','guaranteed_minimum_plus_percentage','fixed_plus_profit_share')),
  constraint owner_management_agreements_status_check check (status in ('draft','active','superseded','terminated')),
  constraint owner_management_agreements_calc_basis_check check (calculation_basis in ('cash_collected','accrual_billed')),
  constraint owner_management_agreements_payout_cycle_check check (payout_cycle in ('monthly','quarterly','custom')),
  constraint owner_management_agreements_deposit_treatment_check check (deposit_treatment in ('exclude','include','escrow')),
  constraint owner_management_agreements_date_check check (ends_on is null or ends_on >= starts_on),
  constraint owner_management_agreements_payout_day_check check (payout_day is null or (payout_day between 1 and 31)),
  constraint owner_management_agreements_min_payout_check check (min_payout_amount is null or min_payout_amount >= 0)
);

create table if not exists public.owner_agreement_terms (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.owner_management_agreements(id) on delete cascade,
  office_commission_rate numeric(7,4) null,
  owner_share_rate numeric(7,4) null,
  fixed_owner_payout_amount numeric(12,2) null,
  fixed_management_fee_amount numeric(12,2) null,
  guaranteed_minimum_amount numeric(12,2) null,
  profit_share_rate numeric(7,4) null,
  upside_threshold_amount numeric(12,2) null,
  apply_commission_before_expenses boolean null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_agreement_terms_office_commission_rate_check check (office_commission_rate is null or (office_commission_rate >= 0 and office_commission_rate <= 1)),
  constraint owner_agreement_terms_owner_share_rate_check check (owner_share_rate is null or (owner_share_rate >= 0 and owner_share_rate <= 1)),
  constraint owner_agreement_terms_profit_share_rate_check check (profit_share_rate is null or (profit_share_rate >= 0 and profit_share_rate <= 1)),
  constraint owner_agreement_terms_fixed_owner_payout_amount_check check (fixed_owner_payout_amount is null or fixed_owner_payout_amount >= 0),
  constraint owner_agreement_terms_fixed_management_fee_amount_check check (fixed_management_fee_amount is null or fixed_management_fee_amount >= 0),
  constraint owner_agreement_terms_guaranteed_minimum_amount_check check (guaranteed_minimum_amount is null or guaranteed_minimum_amount >= 0),
  constraint owner_agreement_terms_upside_threshold_amount_check check (upside_threshold_amount is null or upside_threshold_amount >= 0)
);

create table if not exists public.owner_agreement_expense_rules (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.owner_management_agreements(id) on delete cascade,
  expense_category text not null,
  treatment text not null,
  cap_amount numeric(12,2) null,
  created_at timestamptz not null default now(),
  constraint owner_agreement_expense_rules_treatment_check check (treatment in ('deductible','non_deductible','cap_only')),
  constraint owner_agreement_expense_rules_cap_amount_check check (cap_amount is null or cap_amount >= 0),
  unique (agreement_id, expense_category)
);

create table if not exists public.owner_agreement_tax_rules (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.owner_management_agreements(id) on delete cascade,
  rule_type text not null,
  rate numeric(7,4) not null,
  applies_to text not null,
  is_inclusive boolean not null default false,
  created_at timestamptz not null default now(),
  constraint owner_agreement_tax_rules_rule_type_check check (rule_type in ('commission_tax','withholding_tax','owner_tax')),
  constraint owner_agreement_tax_rules_rate_check check (rate >= 0 and rate <= 1)
);

create index if not exists owner_mgmt_agreements_property_id_idx on public.owner_management_agreements(property_id);
create index if not exists owner_mgmt_agreements_owner_id_idx on public.owner_management_agreements(owner_id);
create index if not exists owner_mgmt_agreements_property_owner_id_idx on public.owner_management_agreements(property_owner_id);
create index if not exists owner_mgmt_agreements_status_idx on public.owner_management_agreements(status);
create index if not exists owner_mgmt_agreements_starts_ends_idx on public.owner_management_agreements(starts_on, ends_on);

create or replace function public.prevent_overlapping_active_owner_agreements()
returns trigger language plpgsql as $$
begin
  if new.status = 'active' then
    if exists (
      select 1 from public.owner_management_agreements existing
      where existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and existing.property_id = new.property_id
        and existing.owner_id = new.owner_id
        and existing.status = 'active'
        and daterange(existing.starts_on, coalesce(existing.ends_on, 'infinity'::date), '[]')
            && daterange(new.starts_on, coalesce(new.ends_on, 'infinity'::date), '[]')
    ) then
      raise exception 'يوجد اتفاقية إدارة نشطة متداخلة لنفس المالك والعقار';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists owner_mgmt_agreements_overlap_guard on public.owner_management_agreements;
create trigger owner_mgmt_agreements_overlap_guard
before insert or update on public.owner_management_agreements
for each row execute function public.prevent_overlapping_active_owner_agreements();

drop trigger if exists owner_mgmt_agreements_set_updated_at on public.owner_management_agreements;
create trigger owner_mgmt_agreements_set_updated_at before update on public.owner_management_agreements
for each row execute function public.set_updated_at();

drop trigger if exists owner_agreement_terms_set_updated_at on public.owner_agreement_terms;
create trigger owner_agreement_terms_set_updated_at before update on public.owner_agreement_terms
for each row execute function public.set_updated_at();

alter table public.owner_management_agreements enable row level security;
alter table public.owner_agreement_terms enable row level security;
alter table public.owner_agreement_expense_rules enable row level security;
alter table public.owner_agreement_tax_rules enable row level security;


drop policy if exists owner_mgmt_agreements_select_auth on public.owner_management_agreements;
drop policy if exists owner_mgmt_agreements_write_admin_manager on public.owner_management_agreements;
drop policy if exists owner_agreement_terms_select_auth on public.owner_agreement_terms;
drop policy if exists owner_agreement_terms_write_admin_manager on public.owner_agreement_terms;
drop policy if exists owner_agreement_expense_rules_select_auth on public.owner_agreement_expense_rules;
drop policy if exists owner_agreement_expense_rules_write_admin_manager on public.owner_agreement_expense_rules;
drop policy if exists owner_agreement_tax_rules_select_auth on public.owner_agreement_tax_rules;
drop policy if exists owner_agreement_tax_rules_write_admin_manager on public.owner_agreement_tax_rules;

create policy owner_mgmt_agreements_select_auth on public.owner_management_agreements for select to authenticated using (true);
create policy owner_mgmt_agreements_write_admin_manager on public.owner_management_agreements for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy owner_agreement_terms_select_auth on public.owner_agreement_terms for select to authenticated using (true);
create policy owner_agreement_terms_write_admin_manager on public.owner_agreement_terms for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy owner_agreement_expense_rules_select_auth on public.owner_agreement_expense_rules for select to authenticated using (true);
create policy owner_agreement_expense_rules_write_admin_manager on public.owner_agreement_expense_rules for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy owner_agreement_tax_rules_select_auth on public.owner_agreement_tax_rules for select to authenticated using (true);
create policy owner_agreement_tax_rules_write_admin_manager on public.owner_agreement_tax_rules for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

grant select, insert, update, delete on public.owner_management_agreements to authenticated;
grant select, insert, update, delete on public.owner_agreement_terms to authenticated;
grant select, insert, update, delete on public.owner_agreement_expense_rules to authenticated;
grant select, insert, update, delete on public.owner_agreement_tax_rules to authenticated;
