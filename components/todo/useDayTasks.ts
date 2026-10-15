"use client";

import { useCallback, useMemo, useState } from "react";
import { useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import {
  clearTasks,
  createTask,
  listTasksBetween,
  moveTaskToDay,
  reorderTasks,
  setTaskDone,
  setTaskPartial,
  unclearTasks,
} from "@/lib/data/tasks";
import { relativeDayLabel } from "@/lib/dates";
import { fetchCalendarEvents } from "@/lib/data/calendar";
import type { CalendarEvent, CalendarResponse } from "@/lib/calendar/types";
import type { TaskSummary } from "@/lib/types";

/** Tasks for a date range (crossed-off ones stay until removed), plus every action a day card needs. */
export function useDayTasks(start: string, end: string) {
  const toast = useToast();
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);

  const load = useCallback(async () => {
    try {
      setTasks(await listTasksBetween(start, end));
    } catch (e) {
      toast.error("Couldn't load tasks", e);
    }
  }, [start, end, toast]);

  useSyncedLoad(load, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskSummary[]>();
    for (const t of tasks ?? []) {
      if (!t.do_on) continue;
      map.set(t.do_on, [...(map.get(t.do_on) ?? []), t]);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [tasks]);

  const crossedOff = useMemo(() => (tasks ?? []).filter((t) => t.done), [tasks]);

  async function toggle(task: TaskSummary) {
    const done = !task.done;
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, done, partial: done ? false : t.partial } : t)) ?? null);
    try {
      await setTaskDone(task, done);
      if (done && task.repeat !== "none") {
        toast.show({ message: "Done. Next one scheduled." });
        void load();
      }
    } catch (e) {
      toast.error("Couldn't update task", e);
      void load();
    }
  }

  async function togglePartial(task: TaskSummary) {
    const partial = !task.partial;
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, partial, done: false } : t)) ?? null);
    try {
      if (task.done) await setTaskDone(task, false);
      await setTaskPartial(task.id, partial);
      toast.show({ message: partial ? "Marked partly done" : "No longer partly done" });
    } catch (e) {
      toast.error("Couldn't update task", e);
      void load();
    }
  }

  /** Removes crossed-off tasks from their days; they move to Done (deleted after 7 days). */
  async function clear(list: TaskSummary[]) {
    const ids = list.filter((t) => t.done).map((t) => t.id);
    if (!ids.length) return;
    setTasks((prev) => prev?.filter((t) => !ids.includes(t.id)) ?? null);
    try {
      await clearTasks(ids);
      toast.show({
        message: ids.length === 1 ? "Removed. It's under Done for 7 days." : `Removed ${ids.length} tasks. They're under Done for 7 days.`,
        actionLabel: "Undo",
        onAction: async () => {
          try {
            await unclearTasks(ids);
          } catch (e) {
            toast.error("Couldn't undo", e);
          }
          void load();
        },
      });
    } catch (e) {
      toast.error("Couldn't remove", e);
      void load();
    }
  }

  /**
   * Removes one task from its day, finished or not (swipe > Remove, or the x).
   * It's marked done and moves to Done (a repeating task schedules its next one).
   */
  async function remove(task: TaskSummary) {
    setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? null);
    try {
      if (!task.done) await setTaskDone(task, true);
      await clearTasks([task.id]);
      toast.show({
        message: "Removed. It's under Done for 7 days.",
        actionLabel: "Undo",
        onAction: async () => {
          try {
            if (task.done) await unclearTasks([task.id]);
            else await setTaskDone({ ...task, repeat: "none" }, false);
          } catch (e) {
            toast.error("Couldn't undo", e);
          }
          void load();
        },
      });
      if (!task.done && task.repeat !== "none") void load();
    } catch (e) {
      toast.error("Couldn't remove", e);
      void load();
    }
  }

  async function reorder(date: string, orderedIds: string[]) {
    setTasks((prev) => prev?.map((t) => (t.do_on === date && orderedIds.includes(t.id) ? { ...t, sort_order: orderedIds.indexOf(t.id) } : t)) ?? null);
    try {
      await reorderTasks(orderedIds);
    } catch (e) {
      toast.error("Couldn't save the new order", e);
      void load();
    }
  }

  /** Moves a task to another day (dropped there), keeping the order it was dropped in. */
  async function move(task: TaskSummary, toDate: string, orderedIds: string[]) {
    setTasks((prev) => {
      if (!prev) return prev;
      const inRange = prev.some((t) => t.do_on === toDate) || (toDate >= start && toDate <= end);
      return prev
        .filter((t) => inRange || t.id !== task.id)
        .map((t) => {
          if (t.id === task.id) return { ...t, do_on: toDate, carried_over: false, sort_order: orderedIds.indexOf(t.id) };
          if (t.do_on === toDate && orderedIds.includes(t.id)) return { ...t, sort_order: orderedIds.indexOf(t.id) };
          return t;
        });
    });
    try {
      await moveTaskToDay(task.id, toDate, orderedIds);
      toast.show({ message: `Moved to ${relativeDayLabel(toDate)}` });
    } catch (e) {
      toast.error("Couldn't move task", e);
      void load();
    }
  }

  async function add(date: string, title: string) {
    try {
      await createTask({ title, do_on: date });
      await load();
    } catch (e) {
      toast.error("Couldn't add task", e);
    }
  }

  return { tasks, byDay, crossedOff, load, toggle, togglePartial, clear, remove, reorder, move, add };
}

/** Read-only calendar feed events for a date range, when the calendar is switched on. */
export function useCalendarEvents(calendarOn: boolean, start: string, end: string) {
  const toast = useToast();
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);

  const load = useCallback(async () => {
    if (!calendarOn) return;
    try {
      const res = await fetchCalendarEvents(start, end);
      setCalendar(res);
      if (res.errors.length) toast.error(`Couldn't load ${res.errors.join(" and ")} calendar`);
    } catch (e) {
      toast.error("Couldn't load your calendar", e);
    }
  }, [calendarOn, start, end, toast]);

  useSyncedLoad(load, [load]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    if (!calendarOn) return map;
    for (const e of calendar?.events ?? []) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [calendar, calendarOn]);

  return { calendars: calendarOn ? calendar?.calendars ?? [] : [], eventsByDay, ready: !calendarOn || calendar !== null };
}
