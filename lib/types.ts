export type Priority = "low" | "normal" | "high";
export type Repeat = "none" | "daily" | "weekly" | "monthly";
export type ResearchStatus = "to_look_into" | "in_progress" | "done";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  do_on: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM:SS
  deadline: string | null; // YYYY-MM-DD
  priority: Priority;
  repeat: Repeat;
  done: boolean;
  done_at: string | null;
  sort_order: number;
  carried_over: boolean;
  created_at: string;
}

export interface Subtask {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

/** A task as shown in lists: with just enough subtask info for the "x of y" tag. */
export interface TaskSummary extends Task {
  subtasks: Pick<Subtask, "id" | "done">[];
}

export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
}

export interface BuyList {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface BuyItem {
  id: string;
  list_id: string;
  title: string;
  note: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

export interface ResearchItem {
  id: string;
  title: string;
  notes: string;
  status: ResearchStatus;
  sort_order: number;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface InboxItem {
  id: string;
  text: string;
  created_at: string;
}
