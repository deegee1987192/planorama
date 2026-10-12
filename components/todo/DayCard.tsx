"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { monthDay, weekdayShort } from "@/lib/dates";
import type { TaskSummary } from "@/lib/types";
import { TaskCheckbox } from "./TaskCheckbox";
import { TaskTags } from "./TaskTags";

interface DayCardProps {
  date: string;
  today: string;
  tasks: TaskSummary[];
  onToggle: (task: TaskSummary) => void;
  onReorder: (date: string, orderedIds: string[]) => void;
  onAdd: (date: string, title: string) => Promise<void>;
  /** Calendar events for this day, shown above the tasks when the calendar is on. */
  calendarSlot?: React.ReactNode;
}

export function DayCard({ date, today, tasks, onToggle, onReorder, onAdd, calendarSlot }: DayCardProps) {
  const isToday = date === today;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = tasks.map((t) => t.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(date, arrayMove(ids, from, to));
  }

  return (
    <section
      className={`card px-2 pb-2 pt-3 ${isToday ? "ring-2 ring-todo" : ""}`}
      aria-label={`${weekdayShort(date)} ${monthDay(date)}`}
    >
      <div className="flex items-center gap-2 px-3 pb-1">
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul>
            {tasks.map((task) => (
              <SortableTaskRow key={task.id} task={task} today={today} onToggle={onToggle} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <AddTaskRow date={date} onAdd={onAdd} />
    </section>
  );
}

function SortableTaskRow({
  task,
  today,
  onToggle,
}: {
  task: TaskSummary;
  today: string;
  onToggle: (task: TaskSummary) => void;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-start rounded-2xl ${isDragging ? "z-10 bg-white shadow-lg" : ""}`}
    >
      <TaskCheckbox checked={task.done} onChange={() => onToggle(task)} label={`Mark "${task.title}" done`} />
      <button
        type="button"
        onClick={() => router.push(`/task/${task.id}`)}
        className="min-h-[44px] flex-1 py-2.5 text-left"
      >
        <span className={`block text-[15px] leading-snug ${task.done ? "text-ink-faint line-through" : "text-ink"}`}>
          {task.title}
        </span>
        <TaskTags task={task} today={today} />
      </button>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder "${task.title}"`}
        className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-ink-faint/70 active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
    </li>
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
