import { getSupabase } from "@/lib/supabase/client";
import { todayISO } from "@/lib/dates";
import { purgeOldDoneTasks } from "@/lib/data/tasks";

/**
 * Runs on app load (and when the app comes back to the foreground).
 * Rollover: unfinished tasks (including partly-done ones) from earlier days move
 * to today, marked carried over. Deadlines are never changed here.
 * Overnight clear: crossed-off tasks from earlier days move to Done.
 * Cleanup: tasks in Done are deleted 7 days after they were removed.
 * (Repeating tasks are handled when they're marked done; see setTaskDone.)
 */
export async function runDailyRules(): Promise<void> {
  const today = todayISO();
  const db = getSupabase();

  const { error } = await db
    .from("tasks")
    .update({ do_on: today, carried_over: true })
    .eq("done", false)
    .lt("do_on", today);
  if (error) throw error;

  const { error: clearError } = await db
    .from("tasks")
    .update({ cleared_at: new Date().toISOString() })
    .eq("done", true)
    .is("cleared_at", null)
    .lt("do_on", today);
  if (clearError) throw clearError;

  await purgeOldDoneTasks();
}
