-- RBAC core tables

create table roles (
 id uuid primary key,
 name text
);

create table permissions (
 id uuid primary key,
 key text
);

create table role_permissions (
 role_id uuid,
 permission_id uuid
);

create table user_roles (
 user_id uuid,
 role_id uuid,
 organization_id uuid
);
