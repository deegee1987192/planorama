"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { createTask, listTasksBetween, reorderTasks, setTaskDone, setTaskPartial } from "@/lib/data/tasks";
import { fetchCalendarEvents } from "@/lib/data/calendar";
import type { CalendarEvent, CalendarResponse } from "@/lib/calendar/types";
import type { TaskSummary } from "@/lib/types";

/** How long a crossed-off task stays visible before moving to Done. */
const HIDE_DONE_AFTER_MS = 3000;

/** Unfinished tasks for a date range, plus all the actions a day card needs. */
export function useDayTasks(start: string, end: string) {
  const toast = useToast();
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const hideTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const load = useCallback(async () => {
    try {
      setTasks(await listTasksBetween(start, end));
    } catch (e) {
      toast.error("Couldn't load tasks", e);
    }
  }, [start, end, toast]);

  useSyncedLoad(load, [load]);

  useEffect(() => {
    const timers = hideTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskSummary[]>();
    for (const t of tasks ?? []) {
      if (!t.do_on) continue;
      map.set(t.do_on, [...(map.get(t.do_on) ?? []), t]);
    }
    return map;
  }, [tasks]);

  async function toggle(task: TaskSummary) {
    const done = !task.done;
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, done, partial: done ? false : t.partial } : t)) ?? null);
    clearTimeout(hideTimers.current.get(task.id));
    try {
      await setTaskDone(task, done);
    } catch (e) {
      toast.error("Couldn't update task", e);
      void load();
      return;
    }
    if (!done) return;
    toast.show({
      message: task.repeat !== "none" ? "Done. Next one scheduled." : "Done. Moved to Done.",
      actionLabel: "Undo",
      onAction: async () => {
        clearTimeout(hideTimers.current.get(task.id));
        try {
          await setTaskDone({ ...task, repeat: "none" }, false);
        } catch (e) {
          toast.error("Couldn't undo", e);
        }
        void load();
      },
    });
    // Leave it crossed out for a moment, then move it out of the day.
    hideTimers.current.set(
      task.id,
      setTimeout(() => {
        hideTimers.current.delete(task.id);
        setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? null);
        if (task.repeat !== "none") void load();
      }, HIDE_DONE_AFTER_MS),
    );
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

  async function reorder(date: string, orderedIds: string[]) {
    setTasks((prev) => {
      if (!prev) return prev;
      const others = prev.filter((t) => t.do_on !== date);
      const dayTasks = orderedIds
        .map((id, i) => {
          const t = prev.find((x) => x.id === id);
          return t ? { ...t, sort_order: i } : undefined;
        })
        .filter((t): t is TaskSummary => Boolean(t));
      return [...others, ...dayTasks];
    });
    try {
      await reorderTasks(orderedIds);
    } catch (e) {
      toast.error("Couldn't save the new order", e);
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

  return { tasks, byDay, load, toggle, togglePartial, reorder, add };
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
