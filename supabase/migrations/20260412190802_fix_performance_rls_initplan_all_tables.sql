-- إصلاح auth_rls_initplan: استبدال auth.role() بـ (select auth.role()) في جميع policies
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'properties','units','contracts','tenants','owners','invoices','receipts',
    'receipt_allocations','expenses','maintenance_records','journal_entries',
    'accounts','account_balances','owner_balances','contract_balances',
    'tenant_balances','kpi_snapshots','serials','settings','snapshots',
    'owner_settlements','deposit_txs','audit_log','attachments','auto_backups',
    'governance','notification_templates','outgoing_notifications','app_notifications',
    'leads','lands','commissions','missions','budgets','automation_jobs',
    'status_history','utility_bills','notifications','automation_run_logs',
    'status_transition_rules','schema_refactor_notes'
  ]) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "%s_all_auth" ON public.%I;
       CREATE POLICY "%s_all_auth" ON public.%I
         FOR ALL TO authenticated USING ((SELECT auth.role()) = ''authenticated'');',
      t, t, t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "users can read own profile" ON public.users;
CREATE POLICY "users can read own profile" ON public.users FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "users can update own profile" ON public.users;
CREATE POLICY "users can update own profile" ON public.users FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
