-- Planorama v1, Session 3: remember when a goal was paused.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.
-- ADDITIVE ONLY: adds one column; changes no existing rows.
--
-- When a paused goal resumes, its not-done checkpoints move later by the real
-- pause length (resume day minus paused_at). Goals loaded already paused have no
-- paused_at, so their checkpoints (planned around the pause) don't move.
alter table public.goals add column if not exists paused_at date;
