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
  /** Started but not finished: still rolls over, shown with a tint. */
  partial: boolean;
  /** Set when a crossed-off task is removed from its day (it then lives under Done). */
  cleared_at: string | null;
  sort_order: number;
  carried_over: boolean;
  /** The day it was first planned for, before it rolled over (null if it never rolled over). */
  rolled_from: string | null;
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

/** A task as shown in lists, with its subtasks (shown small under the title). */
export interface TaskSummary extends Task {
  subtasks: Pick<Subtask, "id" | "done" | "title" | "sort_order">[];
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
  sort_order: number;
  created_at: string;
}

export interface InboxItem {
  id: string;
  text: string;
  created_at: string;
}

/** A read-only calendar subscription link added in the app (Account > Calendars). */
export interface CalendarFeed {
  id: string;
  name: string;
  ics_url: string;
  colour: string;
  visible: boolean;
  sort_order: number;
  created_at: string;
}

export type GoalTier = "big_goal" | "give_back" | "social" | "foundation";
export type GoalStatus = "active" | "paused" | "archived";
export type CheckpointStatus = "upcoming" | "active" | "done";
export type TrackBy = "check" | "timer" | "number";

export interface Goal {
  id: string;
  name: string;
  /** What "done" looks like in December. */
  result: string;
  tier: GoalTier;
  colour: string;
  status: GoalStatus;
  paused_until: string | null;
  /** Day the pause started in the app (null for goals loaded already paused). */
  paused_at: string | null;
  start_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface Checkpoint {
  id: string;
  goal_id: string;
  due_date: string;
  title: string;
  how_youll_know: string;
  status: CheckpointStatus;
  done_at: string | null;
  best_result: string;
  created_at: string;
}

export interface GoalAction {
  id: string;
  goal_id: string;
  name: string;
  per_week: number | null;
  hours_per_week: number | null;
  track_by: TrackBy;
  unit: string;
  /** 1 = Monday … 7 = Sunday */
  preferred_days: number[];
  preferred_time: string | null;
  sort_order: number;
  created_at: string;
}

export interface GoalWithParts extends Goal {
  checkpoints: Checkpoint[];
  goal_actions: GoalAction[];
}
