"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Contrast, GripVertical, Trash2, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskSummary } from "@/lib/types";
import { TaskCheckbox } from "./TaskCheckbox";
import { TaskTags } from "./TaskTags";

const ACTION_W = 76; // width of each swipe action

/**
 * One task in a day card.
 * Tap the checkbox to cross it off. Swipe left (phone) or hover (laptop) for
 * Partly done and Remove. Drag the dotted handle to reorder or move days.
 */
export function TaskRow({
  task,
  today,
  onToggle,
  onPartial,
  onRemove,
  extras,
}: {
  task: TaskSummary;
  today: string;
  onToggle: (task: TaskSummary) => void;
  onPartial: (task: TaskSummary) => void;
  onRemove: (task: TaskSummary) => void;
  extras?: React.ReactNode;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  // Swipe-to-reveal state.
  const actionsWidth = task.done ? ACTION_W : ACTION_W * 2;
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const gesture = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null);
  const justSwiped = useRef(false);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const open = offset !== 0;

  // Close when tapping anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) setOffset(0);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "touch" || (e.target as HTMLElement).closest("[data-no-swipe]")) return;
    gesture.current = { x: e.clientX, y: e.clientY, base: offset, horizontal: null };
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.horizontal === null) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        g.horizontal = true;
        setSwiping(true);
      } else if (Math.abs(dy) > 8) {
        gesture.current = null; // vertical scroll; leave it to the browser
        return;
      } else return;
    }
    setOffset(Math.max(-actionsWidth - 24, Math.min(0, g.base + dx)));
  }

  function onPointerUp() {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.horizontal) return;
    setSwiping(false);
    justSwiped.current = true;
    setOffset((o) => (o < -actionsWidth / 2 ? -actionsWidth : 0));
  }

  function act(fn: () => void) {
    setOffset(0);
    fn();
  }

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        rowRef.current = el;
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative overflow-hidden rounded-2xl ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Swipe actions, revealed behind the row. */}
      {(open || swiping) && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: actionsWidth }}>
          {!task.done && (
            <button
              type="button"
              onClick={() => act(() => onPartial(task))}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-partial text-[11px] font-semibold text-white"
            >
              <Contrast size={18} />
              {task.partial ? "Not partly" : "Partly done"}
            </button>
          )}
          <button
            type="button"
            onClick={() => act(() => onRemove(task))}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-ink text-[11px] font-semibold text-white"
          >
            <Trash2 size={18} />
            Remove
          </button>
        </div>
      )}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // A swipe (or a tap that closes the actions) shouldn't open the task.
          if (justSwiped.current || open) {
            justSwiped.current = false;
            if (open && !(e.target as HTMLElement).closest("[data-no-swipe]")) setOffset(0);
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{ transform: `translateX(${offset}px)`, transition: swiping ? "none" : "transform 200ms ease" }}
        className={`relative flex touch-pan-y items-start ${task.partial && !task.done ? "bg-partial-soft" : "bg-white"}`}
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
          <span
            className={`block break-words text-[15px] leading-snug lg:text-sm ${
              task.done ? "text-ink-faint line-through" : "text-ink"
            }`}
          >
            {task.title}
          </span>
          <TaskTags task={task} today={today} />
          {extras}
        </button>

        {/* Laptop: the same actions appear on hover. */}
        <div className="pointer-events-none absolute right-8 top-1.5 z-10 hidden gap-1 rounded-full bg-white p-0.5 opacity-0 shadow-card transition [@media(hover:hover)]:flex [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100">
          {!task.done && (
            <button
              type="button"
              data-no-swipe
              onClick={() => onPartial(task)}
              title={task.partial ? "Not partly done" : "Partly done"}
              aria-label={task.partial ? `"${task.title}" is partly done. Undo.` : `Mark "${task.title}" partly done`}
              className={`flex h-8 w-8 items-center justify-center rounded-full hover:bg-partial-soft ${task.partial ? "text-partial" : "text-ink-soft"}`}
            >
              <Contrast size={16} />
            </button>
          )}
          <button
            type="button"
            data-no-swipe
            onClick={() => onRemove(task)}
            title="Remove (moves to Done)"
            aria-label={`Remove "${task.title}"`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-black/5"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {task.done ? (
          // Crossed off: an x to remove it straight away (it moves to Done).
          <button
            type="button"
            data-no-swipe
            onClick={() => onRemove(task)}
            aria-label={`Remove "${task.title}"`}
            title="Remove (moves to Done)"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-black/5 lg:w-6"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            type="button"
            data-no-swipe
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag "${task.title}" to reorder or move to another day`}
            className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-ink-faint/70 active:cursor-grabbing lg:w-6"
          >
            <GripVertical size={18} />
          </button>
        )}
      </div>
    </li>
  );
}
