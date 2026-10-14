"use client";

import { createContext, useContext, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { TaskSummary } from "@/lib/types";

/** Droppable id for a whole day (a day card, or a square in the month grid). */
export const dayDropId = (date: string) => `day:${date}`;

const DropTargetContext = createContext<string | null>(null);

/** The day currently being dragged over, so it can highlight itself. */
export function useDropTargetDate(): string | null {
  return useContext(DropTargetContext);
}

// Prefer the task or day directly under the finger; otherwise whatever overlaps most.
const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  if (within.length) {
    const task = within.find((c) => !String(c.id).startsWith("day:"));
    return [task ?? within[0]];
  }
  return rectIntersection(args);
};

/**
 * Drag-and-drop for tasks across days: reorder within a day, or drop on another
 * day (a task in it, its card, or its month square) to move it there.
 */
export function TaskBoard({
  byDay,
  onReorder,
  onMove,
  children,
}: {
  byDay: Map<string, TaskSummary[]>;
  onReorder: (date: string, orderedIds: string[]) => void;
  onMove: (task: TaskSummary, toDate: string, orderedIds: string[]) => void;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<TaskSummary | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const find = (id: string) => {
    for (const list of byDay.values()) {
      const t = list.find((x) => x.id === id);
      if (t) return t;
    }
    return undefined;
  };

  const dateOf = (overId: string): string | null =>
    overId.startsWith("day:") ? overId.slice(4) : find(overId)?.do_on ?? null;

  function handleStart({ active }: DragStartEvent) {
    setActive(find(String(active.id)) ?? null);
  }

  function handleOver({ over }: DragOverEvent) {
    setOverDate(over ? dateOf(String(over.id)) : null);
  }

  function handleEnd({ active: a, over }: DragEndEvent) {
    setActive(null);
    setOverDate(null);
    const task = find(String(a.id));
    if (!task || !over) return;
    const overId = String(over.id);
    const toDate = dateOf(overId);
    if (!toDate) return;
    const overTaskId = overId.startsWith("day:") ? null : overId;

    if (task.do_on === toDate) {
      if (!overTaskId || overTaskId === task.id) return;
      const ids = (byDay.get(toDate) ?? []).map((t) => t.id);
      onReorder(toDate, arrayMove(ids, ids.indexOf(task.id), ids.indexOf(overTaskId)));
      return;
    }

    const target = (byDay.get(toDate) ?? []).map((t) => t.id).filter((id) => id !== task.id);
    const at = overTaskId ? target.indexOf(overTaskId) : -1;
    target.splice(at < 0 ? target.length : at, 0, task.id);
    onMove(task, toDate, target);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={handleStart}
      onDragOver={handleOver}
      onDragEnd={handleEnd}
      onDragCancel={() => {
        setActive(null);
        setOverDate(null);
      }}
    >
      <DropTargetContext.Provider value={overDate}>{children}</DropTargetContext.Provider>
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="max-w-[320px] rotate-1 rounded-2xl bg-white px-4 py-3 text-[15px] font-medium text-ink shadow-xl ring-2 ring-todo/40">
            <span className={active.done ? "text-ink-faint line-through" : ""}>{active.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
