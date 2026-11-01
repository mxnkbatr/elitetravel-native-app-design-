-- Push notifications (Firebase Cloud Messaging): one row per device token.
-- Traveller devices list the bookings they hold an access token for; staff devices name the admin.
create table if not exists public.push_devices (
  token        text primary key check (char_length(token) between 20 and 4096),
  platform     text not null check (platform in ('ios', 'android', 'web')),
  booking_ids  text[] not null default '{}' check (cardinality(booking_ids) <= 50),
  staff_email  text references public.admin_users (email) on delete cascade on update cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists push_devices_booking_ids_idx on public.push_devices using gin (booking_ids);
create index if not exists push_devices_staff_idx on public.push_devices (staff_email) where staff_email is not null;

alter table public.push_devices enable row level security;
