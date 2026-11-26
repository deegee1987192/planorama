# Planorama

Personal organizer: week-view to-dos, shopping lists, research, notes, and a quick-capture inbox.

Next.js 14 (App Router) + Tailwind + Supabase, deployed on Vercel.

## Setup

1. Run each file in `supabase/migrations/` (001 → 006, in order) in the Supabase SQL Editor. All are safe to re-run and only add things.
2. In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OWNER_EMAIL` (only this account can use the app) and later `ANTHROPIC_API_KEY`.
3. In Supabase Auth, add the site URL and `https://<your-domain>/auth/callback` as a redirect URL.

## Where things live

- `lib/data/*` — all database reads and writes, one file per area.
- `lib/capture.ts` — what happens to captured text (step 2: AI sorting).
- `lib/daily-rules.ts` — rollover on app load. Repeats are in `lib/data/tasks.ts` (`setTaskDone`).
- `lib/dates.ts` — "today" is always America/Toronto.
- `lib/calendar/ics.ts` + `app/api/calendar` — read-only calendar feeds from any Vercel env var ending in `_ICS_URL` or `_ICS`.

The v1 build spec and ground rules are in `docs/PLANORAMA_SPEC.md`.
