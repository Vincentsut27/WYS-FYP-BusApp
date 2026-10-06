# Live Bus ETA Setup

This app expects the existing `public.location_reports` table and its anonymous insert, recent-row select, and Realtime policies. The expected columns are `route_id`, `anonymous_token`, `lat`, `lng`, `heading`, `speed`, `progress_meters`, and `reported_at`.

1. Copy the root `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project's API settings.
3. Restart the Vite dev server.

Sharing starts automatically when a tracked trip starts and can be paused in the Track page. Each trip gets a random token. Arrival reads only the last two minutes of reports, estimates progress along the route geometry, and displays a live estimate when reports are available; otherwise, it uses the existing illustrative estimates.