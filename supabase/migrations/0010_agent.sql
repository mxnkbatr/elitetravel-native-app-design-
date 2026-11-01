-- Admin AI agent (Grok): saved conversations and the changes it proposes.
-- The agent never writes tours itself; a staff member approves each proposal in /admin/agent.

create table if not exists public.ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  admin_email  text not null references public.admin_users (email) on delete cascade on update cascade,
  title        text not null default 'Шинэ яриа' check (char_length(title) <= 120),
  messages     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists ai_conversations_admin_idx on public.ai_conversations (admin_email, updated_at desc);

create table if not exists public.ai_proposals (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references public.ai_conversations (id) on delete set null,
  admin_email      text not null,
  kind             text not null check (kind in ('tour.create', 'tour.update')),
  target_id        text not null,
  -- tours.updated_at when the proposal was made; a different value at approval means someone else edited it
  base_updated_at  timestamptz,
  payload          jsonb not null,
  summary          text not null check (char_length(summary) <= 500),
  diff             jsonb not null default '[]'::jsonb,
  status           text not null default 'pending' check (status in ('pending', 'applied', 'cancelled', 'stale', 'failed')),
  error            text,
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  decided_by       text
);
create index if not exists ai_proposals_pending_idx on public.ai_proposals (status, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_proposals enable row level security;
