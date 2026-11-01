-- Travel assistant conversations, kept only when CHAT_LOGS=on (shown in /admin/chat-logs).
create table if not exists public.chat_logs (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  question    text not null check (char_length(question) <= 2000),
  answer      text not null check (char_length(answer) <= 8000),
  messages    jsonb not null default '[]'::jsonb
);

create index if not exists chat_logs_created_idx on public.chat_logs (created_at desc);

alter table public.chat_logs enable row level security;
