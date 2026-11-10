# Live Bus ETA Setup

This app expects the existing `public.location_reports` table and its anonymous insert, recent-row select, and Realtime policies. The expected columns are `route_id`, `anonymous_token`, `lat`, `lng`, `heading`, `speed`, `progress_meters`, and `reported_at`.

1. Copy the root `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project's API settings.
3. Restart the Vite dev server.

Apply the SQL migrations in `supabase/migrations/` to the same project configured in `.env.local`. The migration dated `20261015000000` adds anonymous trip feedback and grants the required `anon` table privileges for location reporting and feedback. The database must already contain `public.location_reports` before applying it.

Sharing starts automatically when a tracked trip starts and can be paused in the Track page. Each trip gets a random token. Arrival reads only the last two minutes of reports, estimates progress along the route geometry, and displays a live estimate when reports are available; otherwise, it uses the existing illustrative estimates.

After ending a trip, riders can submit a 1–5 star rating and optionally share a short experience note or app suggestion. Feedback is stored in `public.trip_feedback` without account or identity fields.

The migration dated `20261111000000` adds `public.app_usage`. A browser is counted only after Start Trip, a stop-to-stop or building search, opening an arrival timetable, or opening a route. The same browser keeps one random `visitor_id`, so using several of those features still counts as one user. The table does not store a name, email, or location. In the Supabase SQL editor, the number of users in the past 7 days is:

```sql
select count(distinct visitor_id)
from public.app_usage
where used_at >= now() - interval '7 days';
```