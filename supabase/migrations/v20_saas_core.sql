-- Rentrix SaaS Core Foundation
-- Multi-tenant base tables

create table organizations (
 id uuid primary key,
 name text,
 created_at timestamptz default now()
);

create table memberships (
 id uuid primary key,
 user_id uuid,
 organization_id uuid,
 role text,
 created_at timestamptz default now()
);
