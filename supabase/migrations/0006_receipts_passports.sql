-- И-баримт receipts per payment, encrypted passport storage with consent, passport access log.

-- One receipt per settled payment. Issued through the configured adapter (mock until PosAPI 3.0
-- credentials arrive); 'pending' rows are retried by the daily job.
create table if not exists public.receipts (
  id          bigint generated always as identity primary key,
  payment_id  text not null unique references public.payments (id) on delete cascade,
  booking_id  text not null references public.booking_requests (id) on delete cascade,
  created_at  timestamptz not null default now(),
  amount      bigint not null check (amount > 0),
  provider    text,
  status      text not null default 'pending' check (status in ('pending', 'issued', 'failed')),
  bill_id     text,
  lottery     text,
  qr_data     text,
  issued_at   timestamptz,
  attempts    smallint not null default 0,
  error       text
);

create index if not exists receipts_booking_idx on public.receipts (booking_id);
create index if not exists receipts_open_idx on public.receipts (created_at) where status <> 'issued';

-- Passport details are stored encrypted (AES-256-GCM, key in PASSPORT_ENCRYPTION_KEY).
-- Only counts stay in clear so lists and reminders work without decrypting.
alter table public.booking_requests add column if not exists passengers_enc text;
alter table public.booking_requests add column if not exists passengers_count smallint not null default 0;
alter table public.booking_requests add column if not exists passengers_ready smallint not null default 0;
alter table public.booking_requests add column if not exists passport_consent_at timestamptz;
alter table public.booking_requests add column if not exists passport_consent_version text;
alter table public.booking_requests add column if not exists passengers_deleted_at timestamptz;

-- Who looked at or exported passport details
create table if not exists public.passport_access_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       text not null,
  booking_id  text,
  action      text not null check (action in ('view', 'export', 'delete', 'purge'))
);

create index if not exists passport_access_log_at_idx on public.passport_access_log (at desc);

alter table public.receipts enable row level security;
alter table public.passport_access_log enable row level security;
