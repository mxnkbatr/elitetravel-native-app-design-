-- Face ID sign-in: one key per phone, held in the iOS Keychain behind Face ID.
-- Only a SHA-256 hash is stored; the key is replaced on every use and expires after 180 days.
create table if not exists public.auth_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  purpose       text not null check (purpose in ('traveller', 'staff')),
  secret_hash   text not null check (char_length(secret_hash) = 64),
  label         text check (char_length(label) <= 80),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  expires_at    timestamptz not null default now() + interval '180 days'
);
create index if not exists auth_devices_user_idx on public.auth_devices (user_id);
alter table public.auth_devices enable row level security;
