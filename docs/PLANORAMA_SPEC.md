# Planorama v1 build spec

Single-user personal app for Domenic: day planner, 2027 goal tracker with checkpoints and timers, lists and notes. Used on a phone and two laptops.

## Ground rules for every session (read first)

1. **Never delete or overwrite existing work.** Before changing anything, inspect the repo and the Supabase project and summarize what already exists. Show the plan and wait for approval before writing code.
2. Ship straight to the live site: after `npm run build` passes, commit and push to `main` (Vercel deploys planorama-8npn.vercel.app). No preview branches. (Changed by the owner on 2026-11-23: preview deployments lack the Supabase env vars and added setup work.)
3. Database changes are **additive only**: new tables and new columns via migration files. No `DROP`, no `TRUNCATE`, no destructive `ALTER`. If an existing table already holds similar data (tasks, notes, lists), reuse it or add columns; never recreate it. If a destructive change seems needed, stop and ask.
4. Do not touch the Fibe Check or Kitchenapp repos or Supabase projects. They are separate apps and stay in use.
5. Follow the repo's existing conventions (CLAUDE.md, folder structure, components). Don't invent new folders or approaches when an existing pattern fits.
6. The owner does not build locally. Every session ends with the changes pushed to `main` and live on planorama-8npn.vercel.app, plus a short phone checklist.
7. Ask design or flow questions before building anything this spec leaves unclear.

## Stack and fixed decisions

- Next.js 14 (App Router), Supabase, Tailwind, Vercel, deployed from GitHub.
- PWA, installable on phone and laptops. Same data on all devices.
- Single user. Supabase auth with row-level security limited to the owner's account.
- Look: warm and colourful. Cream background (#FFF8F1), dark ink text (#2A2320), Nunito font, rounded cards, each goal has its own colour. Bottom tab bar on phone.
- Calendars (Seneca Outlook and personal Google) are **read-only** ICS feeds. Nothing is written back. Everything scheduled stays inside Planorama.
- Every input works by keyboard. Voice comes later.
- Mockup of every screen: https://claude.ai/artifact/4oaPA66MxYETbVktjpKDM6 (owner can share screenshots).

## Scope

| Version | Ready by | Includes |
| --- | --- | --- |
| v1 | Early January 2027 | Today, Goals, Goal detail, Sunday review, Edit goals, Lists, Notes |
| v2 | February 2027 | Food tab (protein/fibre logging, meal plan, recipes, pantry, missing ingredients to To Buy) |
| v3 | March 2027 | Ask button (plan my week, summarize a note, draft checkpoints) via Claude API, no web search |

In v1, Food and Ask show as greyed-out "coming soon" items.

## Screens

### Bottom bar
Today · Goals · Lists · Notes (+ greyed Food).

### Today
1. Week strip at the top; tap a day to view it; dots mark days with events. Button for a full 7-day week view.
2. **Today's goals**: that day's scheduled goal actions, each with Start timer, a checkbox, or a number entry depending on how it's tracked.
3. **Schedule and to-dos**: calendar events and tasks in time order, with a "Show calendar events" switch.
4. Tasks: title, optional time, priority, repeat rule, subtasks, optional hard deadline. Filter by deadline.
5. Unfinished tasks roll over to the next day and show "Rolled over from <day>".

### Goals
1. **Timer banner** while a timer runs: goal name, elapsed time, "Stop and log". One timer at a time. It keeps running across app closes and device switches.
2. **This week's score**: % of this week's scheduled goal actions done. 80%+ shows "Good week".
3. **Heat map**: one square per day of the month, shaded by number of goal actions done that day. Swipe between months. Today outlined.
4. **This week cards**: one per active goal, progress vs weekly target, total time logged. Tap opens Goal detail.
5. **Edit goals** link.

### Goal detail
1. Name, December result, colour, Edit button.
2. **Checkpoints** in date order: done = ticked; first not-done = active (highlighted, progress bar, best result so far); later ones collapsed ("+ N later checkpoints").
3. **Reschedule** on the active checkpoint: pick a new date; it and all later checkpoints shift by the same number of days.
4. **Add checkpoint** and **Add action** buttons.
5. **Next week's load**: a bar per day showing how many goal actions are scheduled (all goals).

### Sunday review (opens from Goals; prompt shown on Sundays)
1. Last week's score, pre-filled from logs; owner confirms.
2. One-line note: what got in the way.
3. For each active goal, schedule next week's actions for its active checkpoint. Suggest days and times that avoid calendar events and respect each action's preferred days.
4. **Daily cap**: max 3 goal actions per day (setting). Adding a fourth shows "Day is full. Move to <lightest day>?" with Move / Keep.

### Edit goals
| Action | Behaviour |
| --- | --- |
| New goal | Name, December result, colour, tier (big goal / give back / social / foundation), start date. Then add actions and checkpoints. |
| Add checkpoint | Due date, title, "how you'll know". |
| Add action | Name, times per week or hours per week, tracked by (check / timer / number + unit), optional preferred days and time. |
| Edit | Change any field in place. History stays. |
| Archive | Removes the goal from Today, Goals and future scheduled actions (delete only its *future planned* scheduled_actions). Logs and heat-map history are kept. Shown in an Archived list; Unarchive restores it. |
| Pause | Pause until a date. When it resumes, its not-done checkpoints shift later by the pause length. |
| Reorder / recolour | Drag to reorder; tap colour dot. |

### Lists
1. One input at the top with a To Buy / To Research toggle.
2. Filter chips: All, To Buy, To Research.
3. To Buy items grouped in sections (Groceries, Running, Household, plus custom). Research items can be tagged with a goal.

### Notes
1. Search, tag chips, New note.
2. Pinned "Ideas parking lot" note created on first launch.
3. Any line in a note can be turned into a to-do with one tap.

## Data model (Supabase)

Every table: `id`, `user_id`, `created_at`, `updated_at`; RLS = owner only. If equivalent tables already exist, reuse/extend them instead (see ground rule 3).

| Table | Main fields | Notes |
| --- | --- | --- |
| `goals` | name, result, tier, colour, status (active/paused/archived), paused_until, start_date, sort_order | |
| `checkpoints` | goal_id, due_date, title, how_youll_know, status (upcoming/active/done), done_at, best_result | First not-done per goal = active |
| `goal_actions` | goal_id, name, per_week, hours_per_week, track_by (check/timer/number), unit, preferred_days, preferred_time | Recurring weekly action |
| `scheduled_actions` | goal_action_id, date, time, status (planned/done/skipped/moved) | Created by Sunday review; counts toward daily cap |
| `logs` | goal_action_id, scheduled_action_id, date, started_at, ended_at, minutes, amount | Timers, checks, numbers; feeds score and heat map. Running timer = row with started_at and no ended_at |
| `weekly_reviews` | week_start, score, note | |
| `tasks` | title, date, time, priority, deadline, repeat_rule, parent_id, done_at, rolled_from | |
| `list_items` | list (buy/research), section, title, goal_id, done_at | |
| `notes` | title, body, tags, pinned | |
| `calendar_feeds` | name, ics_url, colour, visible | Read-only |
| `settings` | daily_cap (3), good_week_pct (80), week_starts (Monday) | One row |

### How the data model maps onto the existing database (decided in Session 1)

- `tasks` → existing `tasks`: `do_on` = date, `repeat` = repeat_rule; `rolled_from` added. Subtasks stay in the existing `subtasks` table (instead of `parent_id`).
- `list_items` (buy) → existing `buy_lists` (= sections) + `buy_items`; `done_at` added.
- `list_items` (research) → existing `research_items`; `goal_id` and `done_at` added.
- `notes` → existing `notes`; `tags` and `pinned` added.
- New tables: `goals`, `checkpoints`, `goal_actions`, `scheduled_actions`, `logs`, `weekly_reviews`, `settings`, `calendar_feeds`.
- `inbox_items` and `pin_logins` are kept as they are.
- See `supabase/migrations/005_v1_foundation.sql`.

## Starting data (seed once on first launch, only if `goals` is empty)

| Goal | Tier | Colour | Actions | Status |
| --- | --- | --- | --- | --- |
| Half marathon | Big goal | Coral #E4572E | Run, 3x/week (timer + km) | Active |
| Voice marking system | Big goal | Blue #2F6FDB | Build session, 2x/week (timer) | Active |
| MetaClass for professors | Big goal | Teal #0F7C74 | MetaClass work, 4 h/week (timer); Professor outreach, 1x/week (check) | Active |
| Student club at Seneca | Give back | Red-orange #C4441F | Club step, 1x/week (check) | Active |
| Groups (boxing, gym class, running club) | Social | Amber #D98A1C | Group session, 1x/week (check) | Active |
| Eat better | Foundation | Green #3E8E41 | Protein and fibre targets, 5x/week (check); Sunday meal prep, 1x/week (check) | Active |
| Read more | Foundation | Violet #6C4AB6 | Read 20 pages, 5x/week (timer + pages) | Active |
| Sleep better | Foundation | Indigo #3F51B5 | In bed on time, 5x/week (check) | Paused until 2027-04-01 |
| Learn more | Foundation | Pink #C2185B | Learning session, 2x/week (timer) | Paused until 2027-07-01 |

Checkpoints:

**Half marathon** (result: finish 21.1 km in May/June 2027)
- 2026-12-31 Run/walk 20 minutes, 3x a week, without stopping to rest
- 2027-01-15 Registered for a May/June half marathon
- 2027-01-31 Run 30 minutes non-stop (about 4–5 km)
- 2027-02-28 Long run of 7 km at an easy pace
- 2027-03-31 Long run of 11–12 km
- 2027-04-30 Long run of 16 km
- 3 weeks before race (placeholder 2027-05-10) Long run of 18 km, then 2 lighter weeks
- Race day (placeholder 2027-05-31) Finish 21.1 km

**Voice marking system** (result: used to mark every major assignment in at least one course)
- 2026-12-31 Spec done: screens, rubric flow, what the AI produces
- 2027-01-15 One long recording on one paper gives clean, organized feedback
- 2027-01-31 Rubric upload and a suggested mark per criterion
- 2027-02-28 One real assignment batch marked with it (compare minutes per paper)
- 2027-03-31 Fixes from the first batch; feedback exports in the format handed back to students
- 2027-04-30 End-of-term marking done with it
- 2027-12-15 Every major assignment in at least one Fall course

**MetaClass for professors** (result: professors outside Domenic's classes signed up and using MetaClass apps)
- 2027-02-28 Setup decided · 2027-05-31 Professor version built · 2027-06-30 Pilot with 5–10 professors · 2027-08-31 Open to all professors · 2027-12-31 Usage review

**Student club** (result: groundwork in Winter term, launched Fall 2027)
- 2027-02-28 Focus picked · 2027-04-30 Approved · 2027-08-31 Fall events planned · 2027-09-30 Launched · 2027-12-31 First events run

**Groups**: 2027-01-31 Three options tried · 2027-02-28 Committed to 1–2 groups

**Read more** (result: 12 books): 2027-03-31 3 books · 2027-06-30 6 · 2027-09-30 9 · 2027-12-31 12

**Learn more** (result: 3 courses or skills finished): 2027-08-31 1 · 2027-10-31 2 · 2027-12-31 3

Eat better and Sleep better: habits, no checkpoints.

## Build sessions

| # | Session | Builds |
| --- | --- | --- |
| 1 | Foundation | Inspect existing repo + Supabase and report; auth (owner only); migrations for the data model; bottom bar; theme; PWA install |
| 2 | Today | Week strip, week view, tasks (priority, repeat, subtasks, deadline filter, roll-over), read-only ICS calendar feeds with show/hide |
| 3 | Goals core | Edit goals (new, edit, archive, pause, reorder), Goal detail with checkpoints and Reschedule, seed data |
| 4 | Tracking | Timers that survive device switches, check and number logging, Today's goals list, weekly score, heat map |
| 5 | Sunday review | Review flow, suggested days around calendar, daily cap prompt, next week's load bars |
| 6 | Lists and Notes | Combined lists with sections and goal tags; notes with search, tags, parking lot, line-to-task |

## Done when

- [ ] Installed on phone and both laptops, same data on all three
- [ ] A timer started on the phone shows as running on a laptop
- [ ] All 9 goals seeded with their checkpoints
- [ ] Archiving a goal removes it from Today and future weeks but keeps its heat-map history
- [ ] Adding a new goal with 3 checkpoints takes under 2 minutes, no code changes
- [ ] Reschedule shifts the active checkpoint and all later ones together
- [ ] Sunday review plans a week; no day goes over 3 goal actions without asking
- [ ] Seneca and Google events show on Today and can be hidden
- [ ] Unfinished tasks roll over to the next day
- [ ] Nothing that existed before v1 was deleted
