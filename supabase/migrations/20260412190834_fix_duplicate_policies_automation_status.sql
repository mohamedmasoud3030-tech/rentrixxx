-- حذف policies مكررة قديمة على automation_jobs و status_history
DROP POLICY IF EXISTS "auth" ON public.automation_jobs;
DROP POLICY IF EXISTS "auth" ON public.status_history;
