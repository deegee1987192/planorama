import { getSupabase } from "@/lib/supabase/client";
import { addDays, addMonths, todayISO } from "@/lib/dates";
import type { Repeat, Subtask, Task, TaskSummary, TaskWithSubtasks } from "@/lib/types";

const db = () => getSupabase();

export type NewTask = Partial<Omit<Task, "id" | "user_id" | "created_at">> & { title: string };

const SUMMARY = "*, subtasks(id, done, title, sort_order)";

function sortSubtasks(tasks: TaskSummary[]): TaskSummary[] {
  for (const t of tasks) t.subtasks.sort((a, b) => a.sort_order - b.sort_order);
  return tasks;
}

/** Tasks planned between two dates, including crossed-off ones you haven't removed yet. */
export async function listTasksBetween(start: string, end: string): Promise<TaskSummary[]> {
  const { data, error } = await db()
    .from("tasks")
    .select(SUMMARY)
    .is("cleared_at", null)
    .gte("do_on", start)
    .lte("do_on", end)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return sortSubtasks(data as TaskSummary[]);
}

/** Crossed-off tasks you've removed from their day, most recently removed first. */
export async function listDoneTasks(): Promise<TaskSummary[]> {
  const { data, error } = await db()
    .from("tasks")
    .select(SUMMARY)
    .eq("done", true)
    .not("cleared_at", "is", null)
    .order("cleared_at", { ascending: false });
  if (error) throw error;
  return sortSubtasks(data as TaskSummary[]);
}

/** Removed tasks are kept this long under Done, then deleted. */
export const DONE_KEEP_DAYS = 7;

export async function purgeOldDoneTasks(): Promise<void> {
  const cutoff = new Date(Date.now() - DONE_KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await db().from("tasks").delete().eq("done", true).lt("cleared_at", cutoff);
  if (error) throw error;
}

/** Removes crossed-off tasks from their days (they move to Done). */
export async function clearTasks(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await db().from("tasks").update({ cleared_at: new Date().toISOString() }).in("id", ids).eq("done", true);
  if (error) throw error;
}

/** Puts removed tasks back on their days (still crossed off). */
export async function unclearTasks(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await db().from("tasks").update({ cleared_at: null }).in("id", ids);
  if (error) throw error;
}

/** Moves a task to another day, saving the new order of that day. */
export async function moveTaskToDay(id: string, doOn: string, orderedIds: string[]): Promise<void> {
  await updateTask(id, { do_on: doOn, carried_over: false });
  await reorderTasks(orderedIds);
}

/** Every unfinished task with a deadline, soonest first. */
export async function listDeadlineTasks(): Promise<TaskSummary[]> {
  const { data, error } = await db()
    .from("tasks")
    .select(SUMMARY)
    .eq("done", false)
    .not("deadline", "is", null)
    .order("deadline")
    .order("sort_order");
  if (error) throw error;
  return sortSubtasks(data as TaskSummary[]);
}

export async function getTask(id: string): Promise<TaskWithSubtasks | null> {
  const { data, error } = await db()
    .from("tasks")
    .select("*, subtasks(*)")
    .eq("id", id)
    .order("sort_order", { referencedTable: "subtasks" })
    .order("created_at", { referencedTable: "subtasks" })
    .maybeSingle();
  if (error) throw error;
  return data as TaskWithSubtasks | null;
}

async function nextSortOrder(doOn: string | null | undefined): Promise<number> {
  let query = db().from("tasks").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  query = doOn ? query.eq("do_on", doOn) : query.is("do_on", null);
  const { data } = await query;
  return data && data.length ? Number(data[0].sort_order) + 1 : 0;
}

export async function createTask(input: NewTask): Promise<Task> {
  const sort_order = input.sort_order ?? (await nextSortOrder(input.do_on));
  const { data, error } = await db()
    .from("tasks")
    .insert({ ...input, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const { error } = await db().from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db().from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function moveTaskTo(id: string, doOn: string): Promise<void> {
  const sort_order = await nextSortOrder(doOn);
  await updateTask(id, { do_on: doOn, sort_order, carried_over: false });
}

export async function moveTaskToTomorrow(id: string): Promise<void> {
  await moveTaskTo(id, addDays(todayISO(), 1));
}

/** Saves the given order (task ids, top to bottom) for one day. */
export async function reorderTasks(ids: string[]): Promise<void> {
  const results = await Promise.all(
    ids.map((id, index) => db().from("tasks").update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/**
 * Marks a task done or not done. When a repeating task is completed, the next
 * occurrence is created (with its subtasks unchecked).
 */
export async function setTaskDone(task: Task, done: boolean): Promise<void> {
  await updateTask(task.id, {
    done,
    done_at: done ? new Date().toISOString() : null,
    ...(done ? { partial: false } : { cleared_at: null }),
  });
  if (done && task.repeat !== "none") await createNextRepeat(task);
}

/** Started but not finished. Partly-done tasks still roll over to today. */
export async function setTaskPartial(id: string, partial: boolean): Promise<void> {
  await updateTask(id, { partial });
}

export function nextRepeatDate(iso: string, repeat: Repeat): string {
  switch (repeat) {
    case "daily":
      return addDays(iso, 1);
    case "weekly":
      return addDays(iso, 7);
    case "monthly":
      return addMonths(iso, 1);
    default:
      return iso;
  }
}

async function createNextRepeat(task: Task): Promise<void> {
  const nextDoOn = nextRepeatDate(task.do_on ?? todayISO(), task.repeat);

  // Don't create a duplicate if this task was un-checked and checked again.
  const { data: existing } = await db()
    .from("tasks")
    .select("id")
    .eq("title", task.title)
    .eq("repeat", task.repeat)
    .eq("do_on", nextDoOn)
    .limit(1);
  if (existing && existing.length) return;

  const next = await createTask({
    title: task.title,
    notes: task.notes,
    do_on: nextDoOn,
    time: task.time,
    deadline: task.deadline ? nextRepeatDate(task.deadline, task.repeat) : null,
    priority: task.priority,
    repeat: task.repeat,
  });

  const { data: subs, error } = await db()
    .from("subtasks")
    .select("title, sort_order")
    .eq("task_id", task.id)
    .order("sort_order");
  if (error) throw error;
  if (subs && subs.length) {
    const { error: insertError } = await db()
      .from("subtasks")
      .insert(subs.map((s) => ({ task_id: next.id, title: s.title, sort_order: s.sort_order, done: false })));
    if (insertError) throw insertError;
  }
}

// ---- Subtasks ---------------------------------------------------------------

export async function addSubtask(taskId: string, title: string, sortOrder: number): Promise<Subtask> {
  const { data, error } = await db()
    .from("subtasks")
    .insert({ task_id: taskId, title, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as Subtask;
}

export async function updateSubtask(id: string, patch: Partial<Subtask>): Promise<void> {
  const { error } = await db().from("subtasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await db().from("subtasks").delete().eq("id", id);
  if (error) throw error;
}
