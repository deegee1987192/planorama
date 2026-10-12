import { Clock, Flag, Repeat, ListChecks, CornerDownRight } from "lucide-react";
import { formatTime, dayLabel, monthDay } from "@/lib/dates";
import type { TaskSummary } from "@/lib/types";

const chip = "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-left text-xs font-semibold [&>svg]:shrink-0";

export function DeadlineChip({ deadline, today, done }: { deadline: string; today: string; done?: boolean }) {
  if (done) {
    return (
      <span className={`${chip} bg-black/[0.05] text-ink-faint`}>
        <Flag size={12} /> Due {dayLabel(deadline)}
      </span>
    );
  }
  if (deadline < today) {
    return (
      <span className={`${chip} bg-danger text-white`}>
        <Flag size={12} fill="currentColor" /> Overdue · was due {monthDay(deadline)}
      </span>
    );
  }
  if (deadline === today) {
    return (
      <span className={`${chip} bg-danger text-white`}>
        <Flag size={12} fill="currentColor" /> Due today
      </span>
    );
  }
  return (
    <span className={`${chip} bg-danger-soft text-danger-text`}>
      <Flag size={12} /> Due {dayLabel(deadline)}
    </span>
  );
}

export function TaskTags({ task, today, hideDeadline }: { task: TaskSummary; today: string; hideDeadline?: boolean }) {
  const subsDone = task.subtasks.filter((s) => s.done).length;
  const tags: React.ReactNode[] = [];

  if (task.time)
    tags.push(
      <span key="time" className={`${chip} bg-black/[0.05] text-ink-soft`}>
        <Clock size={12} /> {formatTime(task.time)}
      </span>,
    );
  if (task.priority === "high")
    tags.push(
      <span key="prio" className={`${chip} bg-todo-soft text-todo-text`}>
        High
      </span>,
    );
  if (task.carried_over && !task.done)
    tags.push(
      <span key="carried" className={`${chip} bg-amber-100 text-amber-800`}>
        <CornerDownRight size={12} /> Carried over
      </span>,
    );
  if (task.repeat !== "none")
    tags.push(
      <span key="repeat" className={`${chip} bg-black/[0.05] text-ink-soft`} title={`Repeats ${task.repeat}`}>
        <Repeat size={12} aria-label={`Repeats ${task.repeat}`} />
      </span>,
    );
  if (task.subtasks.length)
    tags.push(
      <span key="subs" className={`${chip} bg-black/[0.05] text-ink-soft`}>
        <ListChecks size={12} /> {subsDone} of {task.subtasks.length} subtasks
      </span>,
    );
  if (task.deadline && !hideDeadline)
    tags.push(<DeadlineChip key="deadline" deadline={task.deadline} today={today} done={task.done} />);

  if (!tags.length) return null;
  return <div className="mt-1 flex flex-wrap gap-1.5">{tags}</div>;
}
