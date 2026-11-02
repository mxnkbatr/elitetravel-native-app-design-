-- Traveller accounts (passwordless email code via Supabase Auth). Optional: bookings still
-- work without one; an account keeps them when the traveller changes phones.
create table if not exists public.traveller_profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text check (char_length(email) <= 254),
  name        text check (char_length(name) <= 80),
  phone       text check (char_length(phone) <= 20),
  -- Tour ids saved with the heart button, merged from every device
  saved       text[] not null default '{}' check (cardinality(saved) <= 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.traveller_profiles enable row level security;

alter table public.booking_requests add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists booking_requests_user_idx on public.booking_requests (user_id) where user_id is not null;
