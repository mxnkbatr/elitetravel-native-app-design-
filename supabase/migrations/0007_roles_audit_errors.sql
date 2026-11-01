-- Staff roles, an audit trail of admin actions, and a self-hosted error log.

-- Existing admins keep full access ('owner').
alter table public.admin_users add column if not exists role text not null default 'owner';
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check check (role in ('owner', 'sales', 'finance', 'content'));
alter table public.admin_users add column if not exists name text check (name is null or char_length(name) <= 80);

-- Who changed what in /admin
create table if not exists public.admin_audit (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  actor        text not null,
  action       text not null,
  target_type  text,
  target_id    text,
  details      jsonb
);

create index if not exists admin_audit_at_idx on public.admin_audit (at desc);
create index if not exists admin_audit_target_idx on public.admin_audit (target_type, target_id);

-- Server errors (instrumentation onRequestError) and browser errors (/api/client-error)
create table if not exists public.error_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  source     text not null check (source in ('server', 'client')),
  message    text not null check (char_length(message) <= 2000),
  digest     text,
  path       text,
  context    jsonb,
  resolved   boolean not null default false
);

create index if not exists error_log_at_idx on public.error_log (at desc);

alter table public.admin_audit enable row level security;
alter table public.error_log enable row level security;
