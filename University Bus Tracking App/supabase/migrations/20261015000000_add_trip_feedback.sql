-- Store anonymous trip ratings and optional short feedback.
create table if not exists public.trip_feedback (
  id uuid primary key default gen_random_uuid(),
  route_id text,
  rating smallint not null check (rating between 1 and 5),
  experience text check (char_length(experience) <= 280),
  suggestion text check (char_length(suggestion) <= 280),
  submitted_at timestamptz not null default now()
);

alter table public.trip_feedback enable row level security;

grant usage on schema public to anon;
grant insert on table public.trip_feedback to anon;

drop policy if exists "trip_feedback_anonymous_insert" on public.trip_feedback;
create policy "trip_feedback_anonymous_insert"
  on public.trip_feedback
  for insert
  to anon
  with check (
    rating between 1 and 5
    and (experience is null or char_length(experience) <= 280)
    and (suggestion is null or char_length(suggestion) <= 280)
  );

-- RLS policies do not grant table privileges; these grants are also needed for
-- the existing anonymous location-report API calls to succeed.
grant insert, select on table public.location_reports to anon;

alter table public.location_reports enable row level security;

drop policy if exists "location_reports_anonymous_insert" on public.location_reports;
drop policy if exists "location_reports_anonymous_select" on public.location_reports;

create policy "location_reports_anonymous_insert"
  on public.location_reports
  for insert
  to anon
  with check (
    anonymous_token is not null
    and char_length(anonymous_token) > 0
    and lat between -90 and 90
    and lng between -180 and 180
  );

create policy "location_reports_anonymous_select"
  on public.location_reports
  for select
  to anon
  using (reported_at >= now() - interval '2 minutes');
