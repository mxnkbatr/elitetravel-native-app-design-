-- Pay-later partners (Pocket, Toki, Simple, Dari). Until their merchant APIs are connected,
-- staff send the invoice from the partner's merchant portal and mark it paid in /admin.

alter table public.payments add column if not exists method text not null default 'qpay';
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('qpay', 'manual', 'pocket', 'toki', 'simple', 'dari'));
-- Phone number of the traveller's account in the partner app
alter table public.payments add column if not exists phone text check (phone is null or phone ~ '^[0-9+ ]{8,20}$');
alter table public.payments add column if not exists invoice_sent_at timestamptz;

update public.payments set method = 'manual' where method = 'qpay' and qr_text like 'manual:%';

create index if not exists payments_pending_idx on public.payments (created_at) where status = 'pending' and method <> 'qpay';

-- Which partners are offered, and for which amounts (null = no limit)
create table if not exists public.payment_providers (
  id          text primary key check (id in ('pocket', 'toki', 'simple', 'dari')),
  enabled     boolean not null default true,
  min_amount  bigint check (min_amount is null or min_amount >= 0),
  max_amount  bigint check (max_amount is null or max_amount >= 0),
  terms       text check (terms is null or char_length(terms) <= 200),
  updated_at  timestamptz not null default now()
);

insert into public.payment_providers (id) values ('pocket'), ('toki'), ('simple'), ('dari') on conflict do nothing;

alter table public.payment_providers enable row level security;
