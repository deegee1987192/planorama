-- Planorama: partly-done tasks and reorderable notes.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

-- Tasks can be marked "partly done" (still unfinished, so they still roll over).
alter table public.tasks add column if not exists partial boolean not null default false;

-- Notes can be put in your own order. Existing notes keep newest-first.
alter table public.notes add column if not exists sort_order double precision;

update public.notes n
set sort_order = ranked.rn
from (
  select id, row_number() over (partition by user_id order by created_at desc) as rn
  from public.notes
) ranked
where n.id = ranked.id and n.sort_order is null;

alter table public.notes alter column sort_order set default 0;
alter table public.notes alter column sort_order set not null;

-- Finished tasks are kept 7 days (shown under "Done"), then deleted by the app.
create index if not exists tasks_user_done_at_idx on public.tasks (user_id, done_at) where done = true;
