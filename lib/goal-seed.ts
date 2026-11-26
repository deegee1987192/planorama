import { getSupabase } from "@/lib/supabase/client";
import { todayISO } from "@/lib/dates";
import type { GoalStatus, GoalTier, TrackBy } from "@/lib/types";

// Starting data from docs/PLANORAMA_SPEC.md. Loaded once, only while you have no goals.

interface SeedAction {
  name: string;
  per_week?: number;
  hours_per_week?: number;
  track_by: TrackBy;
  unit?: string;
}

interface SeedGoal {
  name: string;
  result: string;
  tier: GoalTier;
  colour: string;
  status: GoalStatus;
  paused_until?: string;
  actions: SeedAction[];
  checkpoints: [due: string, title: string, howYoullKnow?: string][];
}

const GOALS: SeedGoal[] = [
  {
    name: "Half marathon",
    result: "Finish 21.1 km in May/June 2027",
    tier: "big_goal",
    colour: "#E4572E",
    status: "active",
    actions: [{ name: "Run", per_week: 3, track_by: "timer", unit: "km" }],
    checkpoints: [
      ["2026-12-31", "Run/walk 20 minutes, 3x a week, without stopping to rest"],
      ["2027-01-15", "Registered for a May/June half marathon"],
      ["2027-01-31", "Run 30 minutes non-stop (about 4–5 km)"],
      ["2027-02-28", "Long run of 7 km at an easy pace"],
      ["2027-03-31", "Long run of 11–12 km"],
      ["2027-04-30", "Long run of 16 km"],
      ["2027-05-10", "Long run of 18 km, then 2 lighter weeks", "3 weeks before race day (date is a placeholder until you register)"],
      ["2027-05-31", "Race day: finish 21.1 km", "Date is a placeholder until you register"],
    ],
  },
  {
    name: "Voice marking system",
    result: "Used to mark every major assignment in at least one course",
    tier: "big_goal",
    colour: "#2F6FDB",
    status: "active",
    actions: [{ name: "Build session", per_week: 2, track_by: "timer" }],
    checkpoints: [
      ["2026-12-31", "Spec done: screens, rubric flow, what the AI produces"],
      ["2027-01-15", "One long recording on one paper gives clean, organized feedback"],
      ["2027-01-31", "Rubric upload and a suggested mark per criterion"],
      ["2027-02-28", "One real assignment batch marked with it", "Compare minutes per paper"],
      ["2027-03-31", "Fixes from the first batch; feedback exports in the format handed back to students"],
      ["2027-04-30", "End-of-term marking done with it"],
      ["2027-12-15", "Every major assignment in at least one Fall course"],
    ],
  },
  {
    name: "MetaClass for professors",
    result: "Professors outside Domenic's classes signed up and using MetaClass apps",
    tier: "big_goal",
    colour: "#0F7C74",
    status: "active",
    actions: [
      { name: "MetaClass work", hours_per_week: 4, track_by: "timer" },
      { name: "Professor outreach", per_week: 1, track_by: "check" },
    ],
    checkpoints: [
      ["2027-02-28", "Setup decided"],
      ["2027-05-31", "Professor version built"],
      ["2027-06-30", "Pilot with 5–10 professors"],
      ["2027-08-31", "Open to all professors"],
      ["2027-12-31", "Usage review"],
    ],
  },
  {
    name: "Student club at Seneca",
    result: "Groundwork in Winter term, launched Fall 2027",
    tier: "give_back",
    colour: "#C4441F",
    status: "active",
    actions: [{ name: "Club step", per_week: 1, track_by: "check" }],
    checkpoints: [
      ["2027-02-28", "Focus picked"],
      ["2027-04-30", "Approved"],
      ["2027-08-31", "Fall events planned"],
      ["2027-09-30", "Launched"],
      ["2027-12-31", "First events run"],
    ],
  },
  {
    name: "Groups (boxing, gym class, running club)",
    result: "",
    tier: "social",
    colour: "#D98A1C",
    status: "active",
    actions: [{ name: "Group session", per_week: 1, track_by: "check" }],
    checkpoints: [
      ["2027-01-31", "Three options tried"],
      ["2027-02-28", "Committed to 1–2 groups"],
    ],
  },
  {
    name: "Eat better",
    result: "",
    tier: "foundation",
    colour: "#3E8E41",
    status: "active",
    actions: [
      { name: "Protein and fibre targets", per_week: 5, track_by: "check" },
      { name: "Sunday meal prep", per_week: 1, track_by: "check" },
    ],
    checkpoints: [],
  },
  {
    name: "Read more",
    result: "12 books",
    tier: "foundation",
    colour: "#6C4AB6",
    status: "active",
    actions: [{ name: "Read 20 pages", per_week: 5, track_by: "timer", unit: "pages" }],
    checkpoints: [
      ["2027-03-31", "3 books"],
      ["2027-06-30", "6 books"],
      ["2027-09-30", "9 books"],
      ["2027-12-31", "12 books"],
    ],
  },
  {
    name: "Sleep better",
    result: "",
    tier: "foundation",
    colour: "#3F51B5",
    status: "paused",
    paused_until: "2027-04-01",
    actions: [{ name: "In bed on time", per_week: 5, track_by: "check" }],
    checkpoints: [],
  },
  {
    name: "Learn more",
    result: "3 courses or skills finished",
    tier: "foundation",
    colour: "#C2185B",
    status: "paused",
    paused_until: "2027-07-01",
    actions: [{ name: "Learning session", per_week: 2, track_by: "timer" }],
    checkpoints: [
      ["2027-08-31", "1 course or skill finished"],
      ["2027-10-31", "2 courses or skills finished"],
      ["2027-12-31", "3 courses or skills finished"],
    ],
  },
];

/**
 * First launch: if you have no goals at all (archived ones count), load the 9
 * starting goals with their actions and checkpoints. Also makes the settings row.
 * Never changes or duplicates anything that exists.
 */
export async function ensureStartingData(): Promise<void> {
  const db = getSupabase();

  const { count: settingsCount, error: settingsError } = await db.from("settings").select("id", { count: "exact", head: true });
  if (settingsError) throw settingsError;
  if (!settingsCount) {
    const { error } = await db.from("settings").insert({});
    if (error && error.code !== "23505") throw error; // another device got there first
  }

  const { count, error: countError } = await db.from("goals").select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if (count) return;

  const today = todayISO();
  const { data: goals, error } = await db
    .from("goals")
    .insert(
      GOALS.map((g, i) => ({
        name: g.name,
        result: g.result,
        tier: g.tier,
        colour: g.colour,
        status: g.status,
        paused_until: g.paused_until ?? null,
        start_date: today,
        sort_order: i,
      })),
    )
    .select("id, name");
  if (error) throw error;

  const idOf = (name: string) => (goals as { id: string; name: string }[]).find((g) => g.name === name)!.id;

  const actions = GOALS.flatMap((g) =>
    g.actions.map((a, i) => ({
      goal_id: idOf(g.name),
      name: a.name,
      per_week: a.per_week ?? null,
      hours_per_week: a.hours_per_week ?? null,
      track_by: a.track_by,
      unit: a.unit ?? "",
      sort_order: i,
    })),
  );
  const { error: actionsError } = await db.from("goal_actions").insert(actions);
  if (actionsError) throw actionsError;

  const checkpoints = GOALS.flatMap((g) =>
    g.checkpoints.map(([due, title, how], i) => ({
      goal_id: idOf(g.name),
      due_date: due,
      title,
      how_youll_know: how ?? "",
      status: i === 0 ? "active" : "upcoming",
    })),
  );
  const { error: checkpointsError } = await db.from("checkpoints").insert(checkpoints);
  if (checkpointsError) throw checkpointsError;
}
