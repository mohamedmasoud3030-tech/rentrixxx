set check_function_bodies = off;

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('note','whatsapp','email','sms')),
  subject text null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('note','whatsapp','email','sms')),
  recipient_type text not null,
  person_id uuid null references public.people(id),
  lead_id uuid null references public.leads(id),
  owner_id uuid null references public.owners(id),
  tenant_id uuid null references public.tenants(id),
  recipient_name text null,
  recipient_phone text null,
  recipient_email text null,
  subject text null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','queued','sent','failed')),
  provider_name text null,
  provider_message_id text null,
  provider_response jsonb null,
  error_message text null,
  sent_at timestamptz null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comm_messages_status on public.communication_messages(status);
create index if not exists idx_comm_messages_channel on public.communication_messages(channel);
create index if not exists idx_comm_messages_created_at on public.communication_messages(created_at desc);

alter table public.communication_templates enable row level security;
alter table public.communication_messages enable row level security;

drop policy if exists communication_templates_read on public.communication_templates;
create policy communication_templates_read on public.communication_templates for select to authenticated using (public.is_admin_or_manager());
drop policy if exists communication_templates_write on public.communication_templates;
create policy communication_templates_write on public.communication_templates for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

drop policy if exists communication_messages_read on public.communication_messages;
create policy communication_messages_read on public.communication_messages for select to authenticated using (public.is_admin_or_manager());
drop policy if exists communication_messages_write on public.communication_messages;
create policy communication_messages_write on public.communication_messages for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

grant select,insert,update on public.communication_templates to authenticated;
grant select,insert,update on public.communication_messages to authenticated;
