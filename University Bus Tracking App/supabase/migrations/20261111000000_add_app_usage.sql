-- Count browsers that used a bus feature. visitor_id is a random id stored
-- in the browser. It is not an account, name, email, or location.
-- used_at is Hong Kong wall time (UTC+8), not UTC.
create table if not exists public.app_usage (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null check (char_length(visitor_id) between 8 and 80),
  feature text not null check (feature in ('start_trip', 'search', 'arrival', 'route')),
  used_at timestamp not null default (timezone('Asia/Hong_Kong', now()))
);

-- Convert a table that was already created with a UTC timestamptz.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_usage'
      and column_name = 'used_at'
      and data_type = 'timestamp with time zone'
  ) then
    alter table public.app_usage
      alter column used_at type timestamp
      using (used_at at time zone 'Asia/Hong_Kong');
  end if;
end $$;

alter table public.app_usage
  alter column used_at set default (timezone('Asia/Hong_Kong', now()));

create index if not exists app_usage_used_at_visitor_idx
  on public.app_usage (used_at, visitor_id);

alter table public.app_usage enable row level security;

grant insert on table public.app_usage to anon;

drop policy if exists "app_usage_anonymous_insert" on public.app_usage;
create policy "app_usage_anonymous_insert"
  on public.app_usage
  for insert
  to anon
  with check (
    char_length(visitor_id) between 8 and 80
    and feature in ('start_trip', 'search', 'arrival', 'route')
  );
