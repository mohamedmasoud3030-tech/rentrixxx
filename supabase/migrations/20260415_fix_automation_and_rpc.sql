-- Fix automation_runs_view to include created_at for ordering
create or replace view automation_runs_view as
select
    ar.id,
    ar.status,
    ar.type,
    ar.created_at,
    ar.updated_at
from automation_runs ar;

-- Add alias for old RPC name
create or replace function get_financial_summary(
    from_date date,
    to_date date
)
returns setof rpt_financial_summary
language sql
as $$
    select * from rpt_financial_summary(from_date, to_date);
$$;