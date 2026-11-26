import { getSupabase } from "@/lib/supabase/client";
import { addDays, daysBetween, todayISO } from "@/lib/dates";
import type { Checkpoint, CheckpointStatus, Goal, GoalAction, GoalWithParts } from "@/lib/types";

const db = () => getSupabase();

const WITH_PARTS = "*, checkpoints(*), goal_actions(*)";

function tidy(goal: GoalWithParts): GoalWithParts {
  goal.checkpoints.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.created_at.localeCompare(b.created_at));
  goal.goal_actions.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  return goal;
}

// ---- Goals ------------------------------------------------------------------

/** Every goal (archived ones too), in your order, with checkpoints and actions. */
export async function listGoals(): Promise<GoalWithParts[]> {
  const { data, error } = await db().from("goals").select(WITH_PARTS).order("sort_order").order("created_at");
  if (error) throw error;
  return (data as GoalWithParts[]).map(tidy);
}

export async function getGoal(id: string): Promise<GoalWithParts | null> {
  const { data, error } = await db().from("goals").select(WITH_PARTS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? tidy(data as GoalWithParts) : null;
}

export type GoalInput = Pick<Goal, "name" | "result" | "tier" | "colour" | "start_date">;

export async function createGoal(input: GoalInput, sortOrder: number): Promise<Goal> {
  const { data, error } = await db()
    .from("goals")
    .insert({ ...input, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(id: string, patch: Partial<Goal>): Promise<void> {
  const { error } = await db().from("goals").update(patch).eq("id", id);
  if (error) throw error;
}

export async function reorderGoals(ids: string[]): Promise<void> {
  const results = await Promise.all(ids.map((id, i) => db().from("goals").update({ sort_order: i }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/**
 * Archive: off Today, Goals and future weeks. Only its future *planned* scheduled
 * actions are deleted; logs and history stay.
 */
export async function archiveGoal(goal: GoalWithParts): Promise<void> {
  const actionIds = goal.goal_actions.map((a) => a.id);
  if (actionIds.length) {
    const { error } = await db()
      .from("scheduled_actions")
      .delete()
      .in("goal_action_id", actionIds)
      .eq("status", "planned")
      .gte("date", todayISO());
    if (error) throw error;
  }
  await updateGoal(goal.id, { status: "archived", paused_until: null, paused_at: null });
}

export async function unarchiveGoal(id: string): Promise<void> {
  await updateGoal(id, { status: "active" });
}

/** Pause until a date. Checkpoints move when it resumes (see resumeGoal). */
export async function pauseGoal(id: string, until: string): Promise<void> {
  await updateGoal(id, { status: "paused", paused_until: until, paused_at: todayISO() });
}

/**
 * Resume a paused goal (by hand, or automatically on its paused-until day).
 * Its not-done checkpoints move later by the real pause length. Goals that were
 * loaded already paused have no pause start, so theirs stay put.
 * Returns how many days they moved.
 */
export async function resumeGoal(goal: GoalWithParts, on = todayISO()): Promise<number> {
  const shift = goal.paused_at ? Math.max(0, daysBetween(goal.paused_at, on)) : 0;
  if (shift > 0) await shiftCheckpoints(goal.checkpoints.filter((c) => c.status !== "done"), shift);
  await updateGoal(goal.id, { status: "active", paused_until: null, paused_at: null });
  return shift;
}

/** Runs on app load: goals whose pause has ended become active again. */
export async function resumeEndedPauses(today = todayISO()): Promise<void> {
  const { data, error } = await db()
    .from("goals")
    .select(WITH_PARTS)
    .eq("status", "paused")
    .lte("paused_until", today);
  if (error) throw error;
  for (const g of (data as GoalWithParts[]).map(tidy)) await resumeGoal(g, g.paused_until ?? today);
}

// ---- Checkpoints ------------------------------------------------------------

/** First not-done checkpoint in date order (the one you're working on). */
export function activeCheckpoint(checkpoints: Checkpoint[]): Checkpoint | undefined {
  return checkpoints.find((c) => c.status !== "done");
}

async function shiftCheckpoints(list: Checkpoint[], days: number): Promise<void> {
  if (!days || !list.length) return;
  const results = await Promise.all(
    list.map((c) => db().from("checkpoints").update({ due_date: addDays(c.due_date, days) }).eq("id", c.id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Keeps the stored status in step: done stays done, first not-done = active, the rest upcoming. */
export async function syncCheckpointStatuses(goalId: string): Promise<void> {
  const { data, error } = await db().from("checkpoints").select("*").eq("goal_id", goalId).order("due_date").order("created_at");
  if (error) throw error;
  let activeSet = false;
  const updates: { id: string; status: CheckpointStatus }[] = [];
  for (const c of data as Checkpoint[]) {
    let want: CheckpointStatus = "done";
    if (c.status !== "done") {
      want = activeSet ? "upcoming" : "active";
      activeSet = true;
    }
    if (want !== c.status) updates.push({ id: c.id, status: want });
  }
  const results = await Promise.all(updates.map((u) => db().from("checkpoints").update({ status: u.status }).eq("id", u.id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Checkpoints that move when this one is rescheduled: it and every later not-done one. */
export function checkpointsToShift(checkpoints: Checkpoint[], from: Checkpoint): Checkpoint[] {
  return checkpoints.filter((c) => c.status !== "done" && (c.id === from.id || c.due_date >= from.due_date));
}

/** Reschedule: this checkpoint and all later ones move by the same number of days. */
export async function rescheduleCheckpoint(goal: GoalWithParts, checkpoint: Checkpoint, newDate: string): Promise<number> {
  const days = daysBetween(checkpoint.due_date, newDate);
  await shiftCheckpoints(checkpointsToShift(goal.checkpoints, checkpoint), days);
  await syncCheckpointStatuses(goal.id);
  return days;
}

export type CheckpointInput = Pick<Checkpoint, "due_date" | "title" | "how_youll_know">;

export async function createCheckpoint(goalId: string, input: CheckpointInput): Promise<void> {
  const { error } = await db().from("checkpoints").insert({ goal_id: goalId, ...input });
  if (error) throw error;
  await syncCheckpointStatuses(goalId);
}

export async function updateCheckpoint(checkpoint: Checkpoint, patch: Partial<Checkpoint>): Promise<void> {
  const { error } = await db().from("checkpoints").update(patch).eq("id", checkpoint.id);
  if (error) throw error;
  if (patch.due_date !== undefined || patch.status !== undefined) await syncCheckpointStatuses(checkpoint.goal_id);
}

export async function setCheckpointReached(checkpoint: Checkpoint, reached: boolean): Promise<void> {
  await updateCheckpoint(checkpoint, reached ? { status: "done", done_at: new Date().toISOString() } : { status: "upcoming", done_at: null });
}

export async function deleteCheckpoint(checkpoint: Checkpoint): Promise<void> {
  const { error } = await db().from("checkpoints").delete().eq("id", checkpoint.id);
  if (error) throw error;
  await syncCheckpointStatuses(checkpoint.goal_id);
}

// ---- Actions ----------------------------------------------------------------

export type ActionInput = Pick<GoalAction, "name" | "per_week" | "hours_per_week" | "track_by" | "unit" | "preferred_days" | "preferred_time">;

export async function createAction(goalId: string, input: ActionInput, sortOrder: number): Promise<void> {
  const { error } = await db().from("goal_actions").insert({ goal_id: goalId, ...input, sort_order: sortOrder });
  if (error) throw error;
}

export async function updateAction(id: string, patch: Partial<GoalAction>): Promise<void> {
  const { error } = await db().from("goal_actions").update(patch).eq("id", id);
  if (error) throw error;
}

/** Deletes an action that has no logged history. Throws a friendly error if it has some. */
export async function deleteAction(id: string): Promise<void> {
  const { error } = await db().from("goal_actions").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") throw new Error("This action has logged history, so it can't be deleted. Archive the goal instead.");
    throw error;
  }
}
