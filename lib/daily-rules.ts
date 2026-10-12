import { getSupabase } from "@/lib/supabase/client";
import { todayISO } from "@/lib/dates";
import { purgeOldDoneTasks } from "@/lib/data/tasks";

/**
 * Runs on app load (and when the app comes back to the foreground).
 * Rollover: unfinished tasks (including partly-done ones) from earlier days move
 * to today, marked carried over. Deadlines are never changed here.
 * Cleanup: finished tasks are deleted 7 days after they were completed.
 * (Repeating tasks are handled when they're marked done; see setTaskDone.)
 */
export async function runDailyRules(): Promise<void> {
  const today = todayISO();
  const { error } = await getSupabase()
    .from("tasks")
    .update({ do_on: today, carried_over: true })
    .eq("done", false)
    .lt("do_on", today);
  if (error) throw error;
  await purgeOldDoneTasks();
}
