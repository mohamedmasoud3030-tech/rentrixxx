-- Add missing covering indexes for foreign-key columns reported by Supabase
-- Performance Advisor. Guard every index so the migration is safe across preview
-- replays and legacy/live schemas where optional tables may be absent.

DO $$
BEGIN
  IF to_regclass('public.automation_run_logs') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'automation_run_logs'
         AND column_name = 'job_id'
     ) THEN
    CREATE INDEX IF NOT EXISTS idx_automation_run_logs_job_id
      ON public.automation_run_logs(job_id);
  END IF;

  IF to_regclass('public.automation_runs') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'automation_runs'
         AND column_name = 'job_id'
     ) THEN
    CREATE INDEX IF NOT EXISTS idx_automation_runs_job_id
      ON public.automation_runs(job_id);
  END IF;

  IF to_regclass('public.contracts') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'contracts'
         AND column_name = 'property_id'
     ) THEN
    CREATE INDEX IF NOT EXISTS idx_contracts_property_id
      ON public.contracts(property_id);
  END IF;

  IF to_regclass('public.contracts') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'contracts'
         AND column_name = 'renewed_from_id'
     ) THEN
    CREATE INDEX IF NOT EXISTS idx_contracts_renewed_from_id
      ON public.contracts(renewed_from_id);
  END IF;
END $$;
