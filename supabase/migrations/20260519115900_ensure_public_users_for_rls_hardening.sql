begin;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'USER',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists role text not null default 'USER';
alter table public.users add column if not exists status text not null default 'ACTIVE';
alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();

update public.users set role = 'USER' where role is null;
update public.users set status = 'ACTIVE' where status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_role_check
      check (role in ('ADMIN', 'MANAGER', 'USER')) not valid;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
      and not convalidated
  ) then
    alter table public.users
      validate constraint users_role_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_status_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_status_check
      check (status in ('ACTIVE', 'DISABLED')) not valid;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'users_status_check'
      and conrelid = 'public.users'::regclass
      and not convalidated
  ) then
    alter table public.users
      validate constraint users_status_check;
  end if;
end $$;

commit;
