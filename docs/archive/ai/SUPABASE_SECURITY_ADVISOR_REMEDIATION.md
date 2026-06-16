# Supabase Security Advisor Remediation Audit

Repository-only audit performed on 2026-06-16 from branch `work` at
`5228faffdd6cf804489bb335c469db48396facd1`.

No live Supabase resources were touched. No migrations were run. No production
data, Vercel settings, credentials, or dashboard settings were accessed.

## Scope

Live Security Advisor reportedly lists:

- CRITICAL: Security Definer View `public.v_balance_reconciliation`
- Duplicate Index: `public.financial_operation_idempotency`
- Auth: Leaked Password Protection Disabled
- Multiple Permissive Policies: `public.audit_log`
- Signed-In Users Can Execute SECURITY DEFINER Function:
  - `public.generate_invoices_from_active_contracts()`
  - `public.record_invoice_payment_atomic(payload jsonb)`
  - `public.renew_contract_atomic(old_contract_id uuid, new_contract_data jsonb)`
  - `public.void_receipt_atomic(payload jsonb)`

This audit proposes a reviewed patch only. It does not assert that the live
database exactly matches repository migrations until an operator runs the
verification queries below against the intended live project.

## Source Evidence

Repository evidence reviewed:

- `supabase/migrations/20260609100000_audit_fix_all_schema_mismatches.sql`
- `supabase/migrations/20260612130000_fix_db_advisor_warns.sql`
- `supabase/migrations/20260615000100_fix_invoice_payment_account_resolution.sql`
- `supabase/migrations/20260615000200_fix_type_casts_void_receipt_security.sql`
- `supabase/migrations/20260615000300_harden_function_grants.sql`
- `artifacts/rentrix/src/features/financials/invoices/invoiceService.ts`
- `artifacts/rentrix/src/features/financials/payments/paymentService.ts`
- `artifacts/rentrix/src/features/financials/receipts/receiptService.ts`
- `artifacts/rentrix/src/features/contracts/services/contractService.ts`
- `artifacts/rentrix/src/features/audit/services/audit-log-service.ts`
- `artifacts/rentrix/src/types/database.ts`

## Finding Classification

| Advisor finding | Classification | Recommendation |
| --- | --- | --- |
| `public.v_balance_reconciliation` security definer view | True security blocker / valid advisor finding | Apply a reviewed migration that recreates or alters the view with `security_invoker = true` after compatibility verification. |
| `public.financial_operation_idempotency` duplicate index | Likely reconciliation residue | Do not drop blindly. Verify duplicate index definitions first; if redundant, drop only `financial_operation_idempotency_operation_request_uidx` or its redundant constraint, preserving the primary key. |
| Leaked Password Protection disabled | Dashboard/auth configuration, not repo migration | Enable in Supabase Dashboard. Do not fake a SQL or app-code fix. |
| `public.audit_log` multiple permissive policies | Likely stale/live residue if repo migration was not fully reflected | Repository already splits SELECT/INSERT/UPDATE/DELETE policies. Verify live policies and only consolidate if overlapping same-command permissive policies still exist. |
| Signed-in users can execute `generate_invoices_from_active_contracts()` | Advisory/noise if current body/grants match repo | Keep `authenticated` EXECUTE. It is a browser-facing facade required by invoice generation and checks `is_admin_or_manager()`. |
| Signed-in users can execute `record_invoice_payment_atomic(jsonb)` | Advisory/noise if current body/grants match repo | Keep `authenticated` EXECUTE. It is the browser-facing payment facade and checks `auth.uid()` plus ADMIN/MANAGER role before posting. |
| Signed-in users can execute `renew_contract_atomic(uuid,jsonb)` | Advisory/noise if current body/grants match repo | Keep `authenticated` EXECUTE. It is the browser-facing renewal facade and checks `auth.uid()` plus ADMIN/MANAGER role. |
| Signed-in users can execute `void_receipt_atomic(jsonb)` | Advisory/noise for jsonb wrapper; blocker only if raw overload is still callable | Keep `authenticated` EXECUTE on the jsonb wrapper. Revoke authenticated from the 4-arg implementation if live grants drifted. |

## SECURITY DEFINER Function Review

### `generate_invoices_from_active_contracts()`

Classification: required browser-facing facade.

App dependency: `invoiceService.ts` calls
`supabase.rpc('generate_invoices_from_active_contracts')`.

Repository body/grants:

- `SECURITY DEFINER`
- `SET search_path = public, pg_temp`
- `REVOKE ALL ... FROM PUBLIC, anon`
- `GRANT EXECUTE ... TO authenticated`
- authorization check: `public.is_admin_or_manager()`

Risk decision: acceptable with documented risk and strong internal
authorization checks. Do not revoke `authenticated` unless the app is changed to
call through a separate backend or service role path.

### `record_invoice_payment_atomic(payload jsonb)`

Classification: required browser-facing facade.

App dependency: `paymentService.ts` calls
`supabase.rpc('record_invoice_payment_atomic', { payload })`.

Repository body/grants:

- `SECURITY DEFINER`
- `SET search_path = public, pg_temp`
- `auth.uid()` must be non-null
- `public.is_admin_or_manager()` must pass
- idempotency enforced with `request_id`, advisory lock, and
  `financial_operation_idempotency`
- calls internal `post_receipt_atomic(jsonb)`, whose authenticated direct grant
  was revoked in `20260615000300_harden_function_grants.sql`
- `REVOKE ALL ... FROM public, anon`
- `GRANT EXECUTE ... TO authenticated`

Risk decision: acceptable browser-facing facade. Revoking `authenticated` would
break payment recording and receipt generation.

### `renew_contract_atomic(old_contract_id uuid, new_contract_data jsonb)`

Classification: required browser-facing facade.

App dependency: `contractService.ts` calls
`supabase.rpc('renew_contract_atomic', { old_contract_id, new_contract_data })`.

Repository body/grants:

- `SECURITY DEFINER`
- `SET search_path = public, pg_temp`
- `auth.uid()` must be non-null
- `public.users.role` must be `ADMIN` or `MANAGER`
- active-unit overlap guard remains inside the transaction
- grants were previously reconciled to authenticated while revoking public/anon

Risk decision: acceptable browser-facing facade if live body matches repository.

### `void_receipt_atomic(payload jsonb)`

Classification: required browser-facing facade.

App dependency: `receiptService.ts` calls
`supabase.rpc('void_receipt_atomic', { payload })`.

Repository body/grants:

- jsonb wrapper: `SECURITY DEFINER`
- jsonb wrapper: `SET search_path = public, pg_temp`
- jsonb wrapper validates `receipt_id`, then calls the 4-arg implementation
- 4-arg implementation checks `auth.uid()` and `ADMIN`/`MANAGER`
- `20260615000300_harden_function_grants.sql` revokes
  `authenticated` from `void_receipt_atomic(uuid,bigint,jsonb,jsonb)`
- `authenticated` remains granted only on `void_receipt_atomic(jsonb)`

Risk decision: acceptable wrapper only. The raw 4-arg implementation must remain
internal-only.

## Proposed Migration SQL

This SQL is a proposal for review and preview validation. It should become a
normal timestamped migration only after the operator confirms live definitions
and accepts the compatibility risks.

```sql
begin;

-- 1. View warning: make the balance reconciliation view security-invoker.
-- PostgreSQL 15 supports security_invoker views. Supabase projects are expected
-- to be PostgreSQL 15+, but verify with `select version();` before applying.
alter view public.v_balance_reconciliation
  set (security_invoker = true);

comment on view public.v_balance_reconciliation is
  'Balance reconciliation view; security_invoker=true so caller RLS applies and Supabase Security Advisor does not classify it as a security definer view.';

-- 2. Duplicate index warning: preserve the primary key and remove only the
-- redundant unique index/constraint if it still exists independently.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.financial_operation_idempotency'::regclass
      and conname = 'financial_operation_idempotency_operation_request_uidx'
      and contype = 'u'
  ) then
    alter table public.financial_operation_idempotency
      drop constraint financial_operation_idempotency_operation_request_uidx;
  elsif exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'financial_operation_idempotency_operation_request_uidx'
      and c.relkind = 'i'
  ) then
    drop index public.financial_operation_idempotency_operation_request_uidx;
  end if;
end $$;

-- 3. Audit policies: keep one permissive policy per command. This is intentionally
-- equivalent to repo migration 20260612130000 if live drift reintroduced overlap.
drop policy if exists audit_log_write on public.audit_log;

drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select
  on public.audit_log for select to authenticated
  using (app_private.is_app_user());

drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert
  on public.audit_log for insert to authenticated
  with check (app_private.is_admin_or_manager());

drop policy if exists audit_log_update on public.audit_log;
create policy audit_log_update
  on public.audit_log for update to authenticated
  using (app_private.is_admin_or_manager())
  with check (app_private.is_admin_or_manager());

drop policy if exists audit_log_delete on public.audit_log;
create policy audit_log_delete
  on public.audit_log for delete to authenticated
  using (app_private.is_admin_or_manager());

-- 4. Helper overload safety: keep browser-facing facades, but ensure helper/raw
-- overloads are not accidentally callable by anon/authenticated.
revoke all on function public.void_receipt_atomic(uuid, bigint, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.post_receipt_atomic(jsonb)
  from public, anon, authenticated;
revoke all on function public.find_payment_account_id(text)
  from public, anon, authenticated;

-- Do not revoke these browser-facing APIs without app-code replacement.
grant execute on function public.generate_invoices_from_active_contracts() to authenticated;
grant execute on function public.record_invoice_payment_atomic(jsonb) to authenticated;
grant execute on function public.renew_contract_atomic(uuid, jsonb) to authenticated;
grant execute on function public.void_receipt_atomic(jsonb) to authenticated;

commit;
```

## Pre-Migration Verification Queries

Run these read-only queries against the intended live project before applying
any migration:

```sql
select version();

select
  n.nspname as schema_name,
  c.relname as view_name,
  pg_get_userbyid(c.relowner) as owner,
  c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'v_balance_reconciliation';

select
  p.oid::regprocedure as function_signature,
  p.prosecdef as security_definer,
  p.proconfig as settings,
  array_agg(distinct grantee order by grantee) as executable_by
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join information_schema.routine_privileges rp
  on rp.specific_schema = n.nspname
 and rp.routine_name = p.proname
where n.nspname = 'public'
  and p.proname in (
    'generate_invoices_from_active_contracts',
    'record_invoice_payment_atomic',
    'renew_contract_atomic',
    'void_receipt_atomic',
    'post_receipt_atomic',
    'find_payment_account_id'
  )
group by p.oid, p.prosecdef, p.proconfig
order by function_signature::text;

select
  polname,
  polcmd,
  polpermissive,
  pg_get_expr(polqual, polrelid) as using_expr,
  pg_get_expr(polwithcheck, polrelid) as check_expr,
  polroles::regrole[] as roles
from pg_policy
where polrelid = 'public.audit_log'::regclass
order by polcmd, polname;

select
  i.relname as index_name,
  ix.indisprimary,
  ix.indisunique,
  pg_get_indexdef(ix.indexrelid) as index_def
from pg_index ix
join pg_class i on i.oid = ix.indexrelid
where ix.indrelid = 'public.financial_operation_idempotency'::regclass
order by i.relname;
```

## Post-Migration Verification Queries

```sql
select
  c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'v_balance_reconciliation';

select
  i.relname as index_name,
  ix.indisprimary,
  ix.indisunique,
  pg_get_indexdef(ix.indexrelid) as index_def
from pg_index ix
join pg_class i on i.oid = ix.indexrelid
where ix.indrelid = 'public.financial_operation_idempotency'::regclass
order by i.relname;

select
  polname,
  polcmd,
  polpermissive,
  pg_get_expr(polqual, polrelid) as using_expr,
  pg_get_expr(polwithcheck, polrelid) as check_expr,
  polroles::regrole[] as roles
from pg_policy
where polrelid = 'public.audit_log'::regclass
order by polcmd, polname;

select
  p.oid::regprocedure as function_signature,
  p.prosecdef as security_definer,
  p.proconfig as settings,
  has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'generate_invoices_from_active_contracts',
    'record_invoice_payment_atomic',
    'renew_contract_atomic',
    'void_receipt_atomic',
    'post_receipt_atomic',
    'find_payment_account_id'
  )
order by function_signature::text;
```

Expected results:

- `v_balance_reconciliation` includes `security_invoker=true` in `reloptions`.
- `financial_operation_idempotency_pkey` remains and the redundant
  `financial_operation_idempotency_operation_request_uidx` no longer exists.
- `audit_log` has no overlapping permissive policies for the same command and
  same role set.
- `anon` cannot execute the reviewed financial RPCs/helpers.
- `authenticated` can execute only:
  - `generate_invoices_from_active_contracts()`
  - `record_invoice_payment_atomic(jsonb)`
  - `renew_contract_atomic(uuid,jsonb)`
  - `void_receipt_atomic(jsonb)`
- `authenticated` cannot execute:
  - `void_receipt_atomic(uuid,bigint,jsonb,jsonb)`
  - `post_receipt_atomic(jsonb)`
  - `find_payment_account_id(text)`

## App-Code Impact

No app-code changes are proposed.

Revoking `authenticated` from the four browser-facing facades would break active
application flows:

- invoice generation
- invoice payment recording
- receipt generation via payment posting
- contract renewal
- receipt voiding

If a future security decision requires removing browser direct RPC execution,
the replacement must be a new server-side API boundary with service-role
execution and equivalent authorization checks. That is out of scope for this
remediation.

## Leaked Password Protection

This is a Supabase Auth dashboard setting. It should be enabled by an operator
in the intended live Supabase project. There is no repository SQL migration or
frontend code fix for this finding.

Recommended operator action:

1. Open Supabase Dashboard for the intended live project.
2. Go to Authentication settings.
3. Enable Leaked Password Protection.
4. Record dashboard evidence in the release checklist or execution context.

## Rollback Plan

If the proposed migration causes unexpected behavior:

```sql
begin;

-- Restore historical owner-definer view behavior only if required for emergency
-- rollback. Prefer fixing missing RLS policies on underlying tables instead.
alter view public.v_balance_reconciliation
  reset (security_invoker);

-- Recreate redundant index only if a rollback requires exact prior shape.
create unique index if not exists financial_operation_idempotency_operation_request_uidx
  on public.financial_operation_idempotency(operation_name, request_id);

-- Restore previous broad audit policy only if the narrower policies demonstrably
-- block required audit behavior; otherwise keep the narrower policies.
drop policy if exists audit_log_insert on public.audit_log;
drop policy if exists audit_log_update on public.audit_log;
drop policy if exists audit_log_delete on public.audit_log;
create policy audit_log_write
  on public.audit_log for all to authenticated
  using (app_private.is_admin_or_manager())
  with check (app_private.is_admin_or_manager());

commit;
```

Do not roll back by granting helper/internal functions to `authenticated`.
Restore only the browser-facing facades unless a reviewed app-code dependency
proves otherwise.
