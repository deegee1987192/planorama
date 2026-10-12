-- Planorama: step 1 schema
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.

-- ---------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  notes text not null default '',
  do_on date,
  time time,
  deadline date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  repeat text not null default 'none' check (repeat in ('none', 'daily', 'weekly', 'monthly')),
  done boolean not null default false,
  done_at timestamptz,
  sort_order double precision not null default 0,
  carried_over boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_do_on_idx on public.tasks (user_id, do_on);
create index if not exists tasks_user_deadline_idx on public.tasks (user_id, deadline) where done = false;

-- ---------------------------------------------------------------
-- Subtasks
-- ---------------------------------------------------------------
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists subtasks_task_idx on public.subtasks (task_id);

-- ---------------------------------------------------------------
-- To Buy
-- ---------------------------------------------------------------
create table if not exists public.buy_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.buy_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id uuid not null references public.buy_lists (id) on delete cascade,
  title text not null,
  note text not null default '',
  done boolean not null default false,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists buy_items_list_idx on public.buy_items (list_id);

-- ---------------------------------------------------------------
-- Research
-- ---------------------------------------------------------------
create table if not exists public.research_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  notes text not null default '',
  status text not null default 'to_look_into' check (status in ('to_look_into', 'in_progress', 'done')),
  sort_order double precision not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Inbox (captured items waiting to be sorted)
-- ---------------------------------------------------------------
create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Row Level Security: each account can only see and change its own rows
-- ---------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'subtasks', 'buy_lists', 'buy_items', 'research_items', 'notes', 'inbox_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Own rows only" on public.%I', t);
    execute format(
      'create policy "Own rows only" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end
$$;
