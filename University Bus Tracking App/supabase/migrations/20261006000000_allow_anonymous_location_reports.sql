-- Allow the anonymous mobile client to publish recent trip progress.
-- The app must still send a non-empty anonymous_token and valid coordinates.

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
