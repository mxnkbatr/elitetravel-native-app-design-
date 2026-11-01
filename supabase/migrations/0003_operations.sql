-- Operations: seats per departure, traveller ↔ staff messages, QPay payments, passport details.
-- Same rule as before: only the Next.js server (secret key) touches these tables; RLS on, no policies.

-- One row per tour date. `date_label` is the exact text from the tour's «dates» field
-- ('' for tours without fixed dates). No row / null capacity = seats are not tracked.
create table if not exists public.departures (
  tour_id     text not null,
  date_label  text not null,
  capacity    smallint check (capacity is null or capacity between 0 and 999),
  closed      boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (tour_id, date_label)
);

-- The traveller's device holds `access_token` and uses it to read its booking, chat and pay.
alter table public.booking_requests add column if not exists access_token text unique;
alter table public.booking_requests add column if not exists paid_amount bigint not null default 0 check (paid_amount >= 0);
alter table public.booking_requests add column if not exists passengers jsonb not null default '[]'::jsonb;
alter table public.booking_requests add column if not exists traveller_seen_at timestamptz;
alter table public.booking_requests add column if not exists staff_seen_at timestamptz;

-- Full departures put new requests on a waitlist instead of overselling
alter table public.booking_requests drop constraint if exists booking_requests_status_check;
alter table public.booking_requests add constraint booking_requests_status_check
  check (status in ('new', 'contacted', 'confirmed', 'paid', 'cancelled', 'waitlist'));

create index if not exists booking_requests_departure_idx on public.booking_requests (tour_id, travel_date);

-- Chat thread per booking. `key` makes automatic messages (reminders) idempotent.
create table if not exists public.booking_messages (
  id          bigint generated always as identity primary key,
  booking_id  text not null references public.booking_requests (id) on delete cascade,
  created_at  timestamptz not null default now(),
  sender      text not null check (sender in ('traveller', 'staff', 'system')),
  body        text not null check (char_length(body) between 1 and 2000),
  author      text,
  key         text,
  unique (booking_id, key)
);

create index if not exists booking_messages_booking_idx on public.booking_messages (booking_id, created_at);
create index if not exists booking_messages_recent_idx on public.booking_messages (created_at desc) where sender = 'traveller';

-- QPay invoices. `id` is our sender_invoice_no.
create table if not exists public.payments (
  id               text primary key,
  booking_id       text not null references public.booking_requests (id) on delete cascade,
  created_at       timestamptz not null default now(),
  amount           bigint not null check (amount > 0),
  status           text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  qpay_invoice_id  text unique,
  qr_image         text,
  qr_text          text,
  urls             jsonb,
  paid_at          timestamptz
);

create index if not exists payments_booking_idx on public.payments (booking_id, created_at desc);

alter table public.departures enable row level security;
alter table public.booking_messages enable row level security;
alter table public.payments enable row level security;
