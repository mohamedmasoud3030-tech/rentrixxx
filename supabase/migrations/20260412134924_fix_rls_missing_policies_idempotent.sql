-- Migration: fix_rls_missing_policies_idempotent
-- Issue #243: Data invisibility — RLS enabled with no policies on 5 tables

DROP POLICY IF EXISTS "utility_bills_all_auth" ON public.utility_bills;
CREATE POLICY "utility_bills_all_auth" ON public.utility_bills
  FOR ALL TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "notifications_all_auth" ON public.notifications;
CREATE POLICY "notifications_all_auth" ON public.notifications
  FOR ALL TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "automation_run_logs_all_auth" ON public.automation_run_logs;
CREATE POLICY "automation_run_logs_all_auth" ON public.automation_run_logs
  FOR ALL TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "status_transition_rules_all_auth" ON public.status_transition_rules;
CREATE POLICY "status_transition_rules_all_auth" ON public.status_transition_rules
  FOR ALL TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "schema_refactor_notes_all_auth" ON public.schema_refactor_notes;
CREATE POLICY "schema_refactor_notes_all_auth" ON public.schema_refactor_notes
  FOR ALL TO authenticated USING (auth.role() = 'authenticated');

GRANT ALL ON public.utility_bills           TO authenticated;
GRANT ALL ON public.notifications           TO authenticated;
GRANT ALL ON public.automation_run_logs     TO authenticated;
GRANT ALL ON public.status_transition_rules TO authenticated;
GRANT ALL ON public.schema_refactor_notes   TO authenticated;
