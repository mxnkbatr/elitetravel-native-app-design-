-- The admin agent works from four desks (bookings, chats, site, boost); each chat belongs to one.
-- Chats from before the desks were the general agent, which is now the site desk.
alter table public.ai_conversations add column if not exists desk text not null default 'site';
alter table public.ai_conversations drop constraint if exists ai_conversations_desk_check;
alter table public.ai_conversations add constraint ai_conversations_desk_check check (desk in ('bookings', 'chats', 'site', 'boost'));
drop index if exists ai_conversations_admin_idx;
create index if not exists ai_conversations_desk_idx on public.ai_conversations (admin_email, desk, updated_at desc);

-- The bookings desk can also propose a booking status change
alter table public.ai_proposals drop constraint if exists ai_proposals_kind_check;
alter table public.ai_proposals add constraint ai_proposals_kind_check
  check (kind in ('tour.create', 'tour.update', 'departure.update', 'message.send', 'news.create', 'booking.status'));
