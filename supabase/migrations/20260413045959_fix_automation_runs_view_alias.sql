-- التطبيق يستدعي automation_runs لكن الجدول اسمه automation_run_logs
-- view بالاسم القديم يشير للجدول الصحيح
CREATE OR REPLACE VIEW public.automation_runs
  WITH (security_invoker = true)
AS
SELECT * FROM public.automation_run_logs;

GRANT SELECT ON public.automation_runs TO authenticated;
