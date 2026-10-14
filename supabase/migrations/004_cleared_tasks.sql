-- Planorama: crossed-off tasks stay on their day until you remove them.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

-- When you remove a crossed-off task (the x, or "Clear crossed off"), it gets a
-- cleared_at time, moves to the Done tab, and is deleted 7 days later.
alter table public.tasks add column if not exists cleared_at timestamptz;

-- Tasks finished before this change were already hidden in Done; keep them there.
update public.tasks set cleared_at = coalesce(done_at, now()) where done = true and cleared_at is null;

create index if not exists tasks_user_cleared_at_idx on public.tasks (user_id, cleared_at) where cleared_at is not null;
