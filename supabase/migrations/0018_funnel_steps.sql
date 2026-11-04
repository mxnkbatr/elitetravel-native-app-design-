-- Booking funnel, finer: "booking_contact" when a traveller reaches the name/phone step and
-- "booking_error" when a sent form is turned back, so /admin/reports shows where people stop.
alter table public.site_events drop constraint if exists site_events_type_check;
alter table public.site_events add constraint site_events_type_check
  check (type in ('page', 'tour_view', 'booking_open', 'booking_contact', 'booking_submit', 'booking_error', 'pay_open', 'chat_open'));

-- Everything /admin/reports and the AI agent show, aggregated in the database
-- (PostgREST caps row reads, so counting in the app would undercount busy months).
create or replace function public.site_stats(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
as $$
  with e as (
    select * from public.site_events where at >= p_from and at < p_to
  )
  select jsonb_build_object(
    'visitors', (select count(distinct visitor) from e),
    'sessions', (select count(distinct session) from e),
    'pageviews', (select count(*) from e where type = 'page'),
    'funnel', (
      select jsonb_build_object(
        'visitors', count(distinct visitor),
        'tour_viewers', count(distinct visitor) filter (where type = 'tour_view'),
        'booking_openers', count(distinct visitor) filter (where type = 'booking_open'),
        'contact_reachers', count(distinct visitor) filter (where type = 'booking_contact'),
        'booking_errors', count(*) filter (where type = 'booking_error'),
        'booking_submitters', count(distinct visitor) filter (where type = 'booking_submit'),
        'pay_openers', count(distinct visitor) filter (where type = 'pay_open')
      ) from e
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'visitors', visitors, 'views', views) order by day), '[]'::jsonb)
      from (
        select to_char((at at time zone 'Asia/Ulaanbaatar')::date, 'YYYY-MM-DD') as day,
               count(distinct visitor) as visitors,
               count(*) filter (where type = 'page') as views
        from e group by 1
      ) s
    ),
    'tours', (
      select coalesce(jsonb_agg(jsonb_build_object('tour_id', tour_id, 'viewers', viewers, 'views', views, 'openers', openers, 'submitters', submitters) order by viewers desc), '[]'::jsonb)
      from (
        select tour_id,
               count(distinct visitor) filter (where type = 'tour_view') as viewers,
               count(*) filter (where type = 'tour_view') as views,
               count(distinct visitor) filter (where type = 'booking_open') as openers,
               count(distinct visitor) filter (where type = 'booking_submit') as submitters
        from e where tour_id is not null group by tour_id
      ) s
    ),
    -- Each visitor counts once, under the first source seen in the period (later events carry none)
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', source, 'visitors', visitors, 'submitters', submitters) order by visitors desc), '[]'::jsonb)
      from (
        select coalesce(first_source, 'direct') as source,
               count(*) as visitors,
               count(*) filter (where booked) as submitters
        from (
          select visitor,
                 (array_agg(source order by at) filter (where source is not null))[1] as first_source,
                 bool_or(type = 'booking_submit') as booked
          from e group by visitor
        ) v
        group by 1 order by 2 desc limit 15
      ) s
    ),
    'devices', (
      select coalesce(jsonb_object_agg(coalesce(device, 'unknown'), visitors), '{}'::jsonb)
      from (select device, count(distinct visitor) as visitors from e group by device) s
    )
  );
$$;
