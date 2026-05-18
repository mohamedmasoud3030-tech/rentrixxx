-- Superseded migration.
--
-- This migration filename was seen by Supabase Branching during an earlier
-- failed preview-branch attempt. The guarded implementation now lives in:
--   20260518105500_harden_rpc_execution_retry.sql
--
-- Keep this file as an explicit no-op so production migration ordering remains
-- stable while avoiding duplicated SQL in SonarCloud new-code analysis.

select 1;
