-- Automation execution observability hardening.

alter table if exists public.automation_runs
  add column if not exists status text default 'success';

alter table if exists public.automation_runs
  add column if not exists task_name text default 'automation_summary';

alter table if exists public.automation_runs
  add column if not exists error_message text;

alter table if exists public.automation_runs
  add column if not exists executed_at timestamptz default now();

create index if not exists idx_automation_runs_task_executed_at
  on public.automation_runs (task_name, executed_at desc);
