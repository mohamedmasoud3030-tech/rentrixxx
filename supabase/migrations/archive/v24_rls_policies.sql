-- Enable Row Level Security and tenant isolation policies

alter table properties enable row level security;
alter table units enable row level security;
alter table contracts enable row level security;
alter table payments enable row level security;
alter table maintenance enable row level security;

create policy org_isolation_properties
on properties
for all
using (organization_id = auth.uid());

create policy org_isolation_units
on units
for all
using (organization_id = auth.uid());

create policy org_isolation_contracts
on contracts
for all
using (organization_id = auth.uid());

create policy org_isolation_payments
on payments
for all
using (organization_id = auth.uid());

create policy org_isolation_maintenance
on maintenance
for all
using (organization_id = auth.uid());
