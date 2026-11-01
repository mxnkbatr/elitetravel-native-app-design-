-- Traveller documents (encrypted files in a private bucket), signed contracts, contract template,
-- and the emergency contact / health / diet form (encrypted, like passports).

-- Private bucket; files are AES-256-GCM encrypted by the app before upload.
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;

-- One file per requirement slot (e.g. visa photo for passenger 2). Re-uploading replaces it.
create table if not exists public.booking_documents (
  id            bigint generated always as identity primary key,
  booking_id    text not null references public.booking_requests (id) on delete cascade,
  doc_type      text not null,
  slot          smallint not null default 0 check (slot between 0 and 30),
  storage_path  text not null,
  mime          text not null,
  size          integer not null check (size > 0),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  staff_note    text check (staff_note is null or char_length(staff_note) <= 500),
  check_result  jsonb,
  uploaded_at   timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   text,
  unique (booking_id, doc_type, slot)
);

create index if not exists booking_documents_booking_idx on public.booking_documents (booking_id);

-- What the traveller signed: the exact text (snapshot), its hash, the drawn signature, when and from where.
create table if not exists public.booking_contracts (
  booking_id      text primary key references public.booking_requests (id) on delete cascade,
  version         text not null,
  body            text not null,
  body_sha256     text not null,
  signed_name     text not null check (char_length(signed_name) between 2 and 120),
  signature_png   text not null check (char_length(signature_png) <= 300000),
  signed_at       timestamptz not null default now(),
  ip              text,
  user_agent      text
);

-- Small key/value settings edited in /admin (contract template)
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Emergency contact, diet, medical notes — sensitive, so encrypted
alter table public.booking_requests add column if not exists care_enc text;
alter table public.booking_requests add column if not exists care_done boolean not null default false;

-- Personal-data access log now also covers documents and the care form
alter table public.passport_access_log drop constraint if exists passport_access_log_action_check;
alter table public.passport_access_log add constraint passport_access_log_action_check
  check (action in ('view', 'export', 'delete', 'purge', 'document', 'care'));

alter table public.booking_documents enable row level security;
alter table public.booking_contracts enable row level security;
alter table public.app_settings enable row level security;
