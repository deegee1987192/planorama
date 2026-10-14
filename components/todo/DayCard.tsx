"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, GripVertical, Plus, X } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { dayDropId, useDropTargetDate } from "./TaskBoard";
import { monthDay, weekdayShort } from "@/lib/dates";
import type { TaskSummary } from "@/lib/types";
import { TaskCheckbox } from "./TaskCheckbox";
import { TaskTags } from "./TaskTags";

interface DayCardProps {
  date: string;
  today: string;
  tasks: TaskSummary[];
  onToggle: (task: TaskSummary) => void;
  onPartial: (task: TaskSummary) => void;
  /** Removes crossed-off tasks from the day (they move to Done). */
  onClear: (tasks: TaskSummary[]) => void;
  onAdd: (date: string, title: string) => Promise<void>;
  /** Calendar events for this day, shown above the tasks when the calendar is on. */
  calendarSlot?: React.ReactNode;
}

/** One day's tasks. Must be inside a <TaskBoard> (drag and drop across days). */
export function DayCard({ date, today, tasks, onToggle, onPartial, onClear, onAdd, calendarSlot }: DayCardProps) {
  const isToday = date === today;
  const { setNodeRef } = useDroppable({ id: dayDropId(date) });
  const isDropTarget = useDropTargetDate() === date;
  const crossedOff = tasks.filter((t) => t.done);

  return (
    <section
      ref={setNodeRef}
      className={`card flex min-w-0 flex-col px-2 pb-2 pt-3 transition lg:px-1.5 ${isToday ? "ring-2 ring-todo" : ""} ${
        isDropTarget ? "bg-todo-soft/60 ring-2 ring-todo/50" : ""
      }`}
      aria-label={`${weekdayShort(date)} ${monthDay(date)}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pb-1 lg:px-2">
        <h2 className={`text-lg font-bold ${isToday ? "text-todo-text" : "text-ink"}`}>{weekdayShort(date)}</h2>
        <span className="text-sm font-medium text-ink-soft">{monthDay(date)}</span>
        {isToday && (
          <span className="rounded-full bg-todo px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            Today
          </span>
        )}
        {date < today && <span className="text-xs text-ink-faint">Past</span>}
      </div>

      {calendarSlot}

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="min-h-[8px]">
          {tasks.map((task) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              today={today}
              onToggle={onToggle}
              onPartial={onPartial}
              onRemove={() => onClear([task])}
            />
          ))}
        </ul>
      </SortableContext>

      <div className="flex flex-wrap items-center">
        <div className="min-w-0 flex-1">
          <AddTaskRow date={date} onAdd={onAdd} />
        </div>
        {crossedOff.length > 0 && (
          <button
            type="button"
            onClick={() => onClear(crossedOff)}
            className="flex min-h-[44px] items-center gap-1 rounded-2xl px-3 text-xs font-semibold text-ink-soft hover:bg-black/5"
          >
            <X size={14} /> Clear crossed off{crossedOff.length > 1 ? ` (${crossedOff.length})` : ""}
          </button>
        )}
      </div>
    </section>
  );
}

function SortableTaskRow({
  task,
  today,
  onToggle,
  onPartial,
  onRemove,
}: {
  task: TaskSummary;
  today: string;
  onToggle: (task: TaskSummary) => void;
  onPartial: (task: TaskSummary) => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-start rounded-2xl transition-opacity duration-500 ${isDragging ? "opacity-40" : ""} ${task.partial && !task.done ? "bg-partial-soft" : ""} ${task.done && !isDragging ? "opacity-70" : ""}`}
    >
      <TaskCheckbox
        checked={task.done}
        partial={task.partial}
        onChange={() => onToggle(task)}
        onPartial={() => onPartial(task)}
        label={`Mark "${task.title}" done`}
      />
      <button
        type="button"
        onClick={() => router.push(`/task/${task.id}`)}
        className="min-h-[44px] min-w-0 flex-1 py-2.5 text-left"
      >
        <span className={`block break-words text-[15px] leading-snug lg:text-sm ${task.done ? "text-ink-faint line-through" : "text-ink"}`}>
          {task.title}
        </span>
        <TaskTags task={task} today={today} />
        <TaskExtras task={task} />
      </button>
      {task.done ? (
        // Crossed off: an x to remove it from the day (it moves to Done).
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove "${task.title}"`}
          title="Remove (moves to Done)"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-black/5 lg:w-6"
        >
          <X size={18} />
        </button>
      ) : (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag "${task.title}" to reorder or move to another day`}
          className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-ink-faint/70 active:cursor-grabbing lg:w-6"
        >
          <GripVertical size={18} />
        </button>
      )}
    </li>
  );
}

/** Subtasks and notes, in small print under the task title. */
function TaskExtras({ task }: { task: TaskSummary }) {
  if (!task.subtasks.length && !task.notes.trim()) return null;
  return (
    <div className="mt-1.5 space-y-0.5">
      {task.subtasks.length > 0 && (
        <ul className="space-y-0.5">
          {task.subtasks.map((s) => (
            <li key={s.id} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-soft">
              <span
                className={`mt-[3px] flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${
                  s.done ? "border-ink-faint bg-ink-faint text-white" : "border-ink-faint"
                }`}
                aria-hidden="true"
              >
                {s.done && <Check size={8} strokeWidth={4} />}
              </span>
              <span className={s.done ? "text-ink-faint line-through" : ""}>{s.title}</span>
            </li>
          ))}
        </ul>
      )}
      {task.notes.trim() && (
        <p className="line-clamp-2 whitespace-pre-line break-words text-[12.5px] italic md:line-clamp-none leading-snug text-ink-faint">{task.notes.trim()}</p>
      )}
    </div>
  );
}

function AddTaskRow({ date, onAdd }: { date: string; onAdd: (date: string, title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onAdd(date, value);
      setTitle("");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-todo-text hover:bg-todo-soft/50"
      >
        <Plus size={18} /> Add task
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-1 pt-1">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title.trim() && setOpen(false)}
        placeholder="New task"
        enterKeyHint="done"
        className="field"
        disabled={saving}
      />
      <button type="submit" className="btn bg-todo text-white" disabled={saving}>
        Add
      </button>
    </form>
  );
}
