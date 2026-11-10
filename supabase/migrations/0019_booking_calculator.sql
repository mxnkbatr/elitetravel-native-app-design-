-- Persist Lovable-style room calculator choices with each booking request.
alter table public.booking_requests
  add column if not exists calculator jsonb;

comment on column public.booking_requests.calculator is
  'Room/guest calculator payload (adults, children, pair/odd rooms, totals). Server recalculates money.';
