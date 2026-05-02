-- Billing core tables

create table plans (
 id uuid primary key,
 name text,
 price numeric
);

create table subscriptions (
 id uuid primary key,
 organization_id uuid,
 plan_id uuid,
 status text
);

create table invoices_billing (
 id uuid primary key,
 subscription_id uuid,
 amount numeric,
 status text
);

create table usage_limits (
 id uuid primary key,
 plan_id uuid,
 metric text,
 limit_value integer
);
