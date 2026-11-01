-- The admin agent can also propose departure seat changes, messages to a traveller and news drafts.
alter table public.ai_proposals drop constraint if exists ai_proposals_kind_check;
alter table public.ai_proposals add constraint ai_proposals_kind_check
  check (kind in ('tour.create', 'tour.update', 'departure.update', 'message.send', 'news.create'));
