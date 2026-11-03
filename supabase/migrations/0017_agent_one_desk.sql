-- Back to one agent: conversations no longer belong to a desk (booking.status proposals stay).
drop index if exists ai_conversations_desk_idx;
alter table public.ai_conversations drop constraint if exists ai_conversations_desk_check;
alter table public.ai_conversations drop column if exists desk;
create index if not exists ai_conversations_admin_idx on public.ai_conversations (admin_email, updated_at desc);
