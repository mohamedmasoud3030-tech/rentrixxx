-- tenant isolation foundation
alter table properties add column organization_id uuid;
alter table units add column organization_id uuid;
alter table contracts add column organization_id uuid;
alter table payments add column organization_id uuid;
alter table maintenance add column organization_id uuid;
