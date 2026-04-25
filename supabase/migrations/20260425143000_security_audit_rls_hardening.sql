-- Full schema security hardening: RLS, policy cleanup, duplicate indexes, function search_path safety.

create table if not exists public.security_audit_findings (
  id bigserial primary key,
  finding_type text not null,
  object_schema text not null,
  object_name text not null,
  details jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now()
);

-- Snapshot: tables in public schema without RLS enabled.
insert into public.security_audit_findings (finding_type, object_schema, object_name, details)
select
  'missing_rls',
  n.nspname,
  c.relname,
  jsonb_build_object('relrowsecurity', c.relrowsecurity)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false;

-- Snapshot: tables with no policies.
insert into public.security_audit_findings (finding_type, object_schema, object_name, details)
select
  'no_policies',
  n.nspname,
  c.relname,
  '{}'::jsonb
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = true
  and not exists (
    select 1
    from pg_policies p
    where p.schemaname = n.nspname
      and p.tablename = c.relname
  );

-- Global hardening: revoke implicit public access.
revoke all on schema public from public;
revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke all on all functions in schema public from public;

-- Ensure RLS exists on critical automation/status tables.
alter table if exists public.automation_jobs enable row level security;
alter table if exists public.automation_run_logs enable row level security;
alter table if exists public.status_history enable row level security;
alter table if exists public.status_transition_rules enable row level security;

-- Policy cleanup on critical tables: remove permissive/duplicate rules, then apply least-privilege baseline.
do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array['automation_jobs','automation_run_logs','status_history','status_transition_rules']
  loop
    if exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = tbl and c.relkind = 'r'
    ) then
      for pol in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = tbl
      loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
      end loop;

      execute format(
        'create policy %I on public.%I for select to authenticated using ((select auth.role()) = ''authenticated'')',
        tbl || '_select_authenticated',
        tbl
      );

      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.role()) = ''authenticated'')',
        tbl || '_insert_authenticated',
        tbl
      );

      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.role()) = ''authenticated'') with check ((select auth.role()) = ''authenticated'')',
        tbl || '_update_authenticated',
        tbl
      );

      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select auth.role()) = ''authenticated'')',
        tbl || '_delete_authenticated',
        tbl
      );
    end if;
  end loop;
end;
$$;

-- Duplicate index cleanup (exact semantic duplicates, non-constraint indexes only).
do $$
declare
  idx record;
begin
  for idx in
    with idxs as (
      select
        n.nspname as schema_name,
        t.relname as table_name,
        i.relname as index_name,
        x.indisprimary,
        x.indisunique,
        x.indkey,
        x.indclass,
        x.indcollation,
        pg_get_expr(x.indpred, x.indrelid) as indpred,
        pg_get_expr(x.indexprs, x.indrelid) as indexprs,
        row_number() over (
          partition by n.nspname, t.relname, x.indisunique, x.indkey, x.indclass, x.indcollation, pg_get_expr(x.indpred, x.indrelid), pg_get_expr(x.indexprs, x.indrelid)
          order by i.oid
        ) as rn
      from pg_index x
      join pg_class i on i.oid = x.indexrelid
      join pg_class t on t.oid = x.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relkind = 'r'
        and not x.indisprimary
        and not exists (
          select 1
          from pg_constraint c
          where c.conindid = x.indexrelid
        )
    )
    select * from idxs where rn > 1
  loop
    execute format('drop index if exists %I.%I', idx.schema_name, idx.index_name);

    insert into public.security_audit_findings (finding_type, object_schema, object_name, details)
    values (
      'duplicate_index_removed',
      idx.schema_name,
      idx.index_name,
      jsonb_build_object('table', idx.table_name)
    );
  end loop;
end;
$$;

-- Function hardening: enforce immutable search_path for targeted public functions.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('prevent_notification_deletion', 'verify_login', 'update_updated_at')
  loop
    execute format('alter function %s set search_path = public', fn.signature);
  end loop;
end;
$$;

-- Ensure function execution is not granted to anonymous users by default.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('prevent_notification_deletion', 'verify_login', 'update_updated_at')
  loop
    execute format('revoke all on function %s from anon', fn.signature);
    execute format('grant execute on function %s to authenticated', fn.signature);
  end loop;
end;
$$;
