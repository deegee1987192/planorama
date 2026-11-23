-- Planorama v1, Session 1: data model for goals, tracking, reviews, settings and calendar feeds.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.
--
-- ADDITIVE ONLY: this file creates new tables and adds new columns. It never drops,
-- truncates, renames or rewrites anything that already exists, and changes no existing rows.
--
-- How the spec's tables map onto what already exists:
--   tasks       -> existing tasks (do_on = date, repeat = repeat_rule); adds rolled_from.
--                  Subtasks stay in the existing subtasks table (instead of parent_id).
--   list_items  -> existing buy_lists (= sections) + buy_items, and research_items (adds goal_id).
--   notes       -> existing notes; adds tags and pinned.
--   inbox_items and pin_logins are left as they are.

-- ---------------------------------------------------------------
-- updated_at: kept current automatically on every table
-- ---------------------------------------------------------------
create or replace function public.planorama_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  result text not null default '',
  tier text not null default 'big_goal' check (tier in ('big_goal', 'give_back', 'social', 'foundation')),
  colour text not null default '#E4572E',
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  paused_until date,
  start_date date,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id, sort_order);

-- ---------------------------------------------------------------
-- Checkpoints (first not-done per goal = active)
-- ---------------------------------------------------------------
create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  due_date date not null,
  title text not null,
  how_youll_know text not null default '',
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'done')),
  done_at timestamptz,
  best_result text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checkpoints_goal_idx on public.checkpoints (goal_id, due_date);

-- ---------------------------------------------------------------
-- Goal actions (recurring weekly actions)
-- preferred_days: ISO weekday numbers, 1 = Monday ... 7 = Sunday.
-- ---------------------------------------------------------------
create table if not exists public.goal_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  name text not null,
  per_week integer check (per_week is null or per_week >= 0),
  hours_per_week numeric check (hours_per_week is null or hours_per_week >= 0),
  track_by text not null default 'check' check (track_by in ('check', 'timer', 'number')),
  unit text not null default '',
  preferred_days smallint[] not null default '{}',
  preferred_time time,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goal_actions_goal_idx on public.goal_actions (goal_id);

-- ---------------------------------------------------------------
-- Scheduled actions (created by Sunday review; count toward the daily cap)
-- ---------------------------------------------------------------
create table if not exists public.scheduled_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_action_id uuid not null references public.goal_actions (id) on delete cascade,
  date date not null,
  time time,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped', 'moved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scheduled_actions_user_date_idx on public.scheduled_actions (user_id, date);
create index if not exists scheduled_actions_action_idx on public.scheduled_actions (goal_action_id);

-- ---------------------------------------------------------------
-- Logs (timers, checks, numbers; feed the weekly score and heat map)
-- A running timer is a row with started_at set and ended_at empty.
-- History is protected: an action that has logs can't be deleted (archive the goal instead).
-- ---------------------------------------------------------------
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_action_id uuid not null references public.goal_actions (id) on delete restrict,
  scheduled_action_id uuid references public.scheduled_actions (id) on delete set null,
  date date not null,
  started_at timestamptz,
  ended_at timestamptz,
  minutes numeric check (minutes is null or minutes >= 0),
  amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists logs_user_date_idx on public.logs (user_id, date);
create index if not exists logs_action_idx on public.logs (goal_action_id);
-- One timer at a time.
create unique index if not exists logs_one_running_timer_idx
  on public.logs (user_id) where started_at is not null and ended_at is null;

-- ---------------------------------------------------------------
-- Weekly reviews
-- ---------------------------------------------------------------
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  score numeric,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------
-- Settings (one row per account)
-- ---------------------------------------------------------------
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  daily_cap integer not null default 3 check (daily_cap > 0),
  good_week_pct integer not null default 80 check (good_week_pct between 0 and 100),
  week_starts text not null default 'monday' check (week_starts in ('monday', 'sunday')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------
-- Calendar feeds (read-only ICS). Until Session 2 the app still reads the
-- *_ICS_URL environment variables in Vercel; this table is for later.
-- ---------------------------------------------------------------
create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  ics_url text not null,
  colour text not null default '#6B5D52',
  visible boolean not null default true,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- New columns on existing tables (nothing existing is changed)
-- ---------------------------------------------------------------
alter table public.tasks add column if not exists rolled_from date;
alter table public.buy_items add column if not exists done_at timestamptz;
alter table public.research_items add column if not exists goal_id uuid references public.goals (id) on delete set null;
alter table public.research_items add column if not exists done_at timestamptz;
alter table public.notes add column if not exists tags text[] not null default '{}';
alter table public.notes add column if not exists pinned boolean not null default false;

-- updated_at on the existing tables (existing rows get the time this runs).
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
alter table public.subtasks add column if not exists updated_at timestamptz not null default now();
alter table public.buy_lists add column if not exists updated_at timestamptz not null default now();
alter table public.buy_items add column if not exists updated_at timestamptz not null default now();
alter table public.research_items add column if not exists updated_at timestamptz not null default now();
alter table public.notes add column if not exists updated_at timestamptz not null default now();
alter table public.inbox_items add column if not exists updated_at timestamptz not null default now();

create index if not exists research_items_goal_idx on public.research_items (goal_id) where goal_id is not null;
create index if not exists notes_user_pinned_idx on public.notes (user_id) where pinned;

-- ---------------------------------------------------------------
-- Row Level Security on the new tables, and updated_at triggers everywhere.
-- Only adds a policy/trigger if it isn't there yet (never drops or replaces one).
-- ---------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['goals', 'checkpoints', 'goal_actions', 'scheduled_actions', 'logs', 'weekly_reviews', 'settings', 'calendar_feeds']
  loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Own rows only') then
      execute format(
        'create policy "Own rows only" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
        t
      );
    end if;
  end loop;

  foreach t in array array[
    'goals', 'checkpoints', 'goal_actions', 'scheduled_actions', 'logs', 'weekly_reviews', 'settings', 'calendar_feeds',
    'tasks', 'subtasks', 'buy_lists', 'buy_items', 'research_items', 'notes', 'inbox_items'
  ]
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = 'planorama_touch_updated_at' and tgrelid = format('public.%I', t)::regclass
    ) then
      execute format(
        'create trigger planorama_touch_updated_at before update on public.%I for each row execute function public.planorama_touch_updated_at()',
        t
      );
    end if;
  end loop;
end
$$;
