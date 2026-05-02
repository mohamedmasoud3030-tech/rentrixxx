-- Migration: fix_rls_missing_policies_idempotent
-- Issue #243: Data invisibility — RLS enabled with no policies on 5 tables
-- Fully idempotent: wraps every statement in DO $$ to guard missing tables

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='utility_bills') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='utility_bills' AND policyname='utility_bills_all_auth') THEN
      EXECUTE 'CREATE POLICY "utility_bills_all_auth" ON public.utility_bills FOR ALL TO authenticated USING ((SELECT auth.role()) = ''authenticated'')';
    END IF;
    EXECUTE 'GRANT ALL ON public.utility_bills TO authenticated';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_all_auth') THEN
      EXECUTE 'CREATE POLICY "notifications_all_auth" ON public.notifications FOR ALL TO authenticated USING ((SELECT auth.role()) = ''authenticated'')';
    END IF;
    EXECUTE 'GRANT ALL ON public.notifications TO authenticated';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='automation_run_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='automation_run_logs' AND policyname='automation_run_logs_all_auth') THEN
      EXECUTE 'CREATE POLICY "automation_run_logs_all_auth" ON public.automation_run_logs FOR ALL TO authenticated USING ((SELECT auth.role()) = ''authenticated'')';
    END IF;
    EXECUTE 'GRANT ALL ON public.automation_run_logs TO authenticated';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='status_transition_rules') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='status_transition_rules' AND policyname='status_transition_rules_all_auth') THEN
      EXECUTE 'CREATE POLICY "status_transition_rules_all_auth" ON public.status_transition_rules FOR ALL TO authenticated USING ((SELECT auth.role()) = ''authenticated'')';
    END IF;
    EXECUTE 'GRANT ALL ON public.status_transition_rules TO authenticated';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='schema_refactor_notes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='schema_refactor_notes' AND policyname='schema_refactor_notes_all_auth') THEN
      EXECUTE 'CREATE POLICY "schema_refactor_notes_all_auth" ON public.schema_refactor_notes FOR ALL TO authenticated USING ((SELECT auth.role()) = ''authenticated'')';
    END IF;
    EXECUTE 'GRANT ALL ON public.schema_refactor_notes TO authenticated';
  END IF;
END $$;
