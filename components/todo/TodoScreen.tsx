"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp, useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { LoadingCards, PageHeader, Segmented } from "@/components/ui";
import { addDays, dateRange, monthDay } from "@/lib/dates";
import { createTask, listTasksBetween, reorderTasks, setTaskDone } from "@/lib/data/tasks";
import { useStoredBoolean } from "@/lib/use-local-storage";
import type { TaskSummary } from "@/lib/types";
import { DayCard } from "./DayCard";
import { DeadlinesView } from "./DeadlinesView";

type Mode = "all" | "deadlines";

export function TodoScreen() {
  const [mode, setMode] = useState<Mode>("all");
  // Step 3 reads this to show calendar events in each day card.
  const [calendarOn, setCalendarOn] = useStoredBoolean("planorama.calendarOn", false);

  return (
    <>
      <PageHeader title="To-Do" colorClass="text-todo-text">
        <button
          type="button"
          onClick={() => setCalendarOn(!calendarOn)}
          aria-pressed={calendarOn}
          className={`btn px-3 ${calendarOn ? "bg-todo-soft text-todo-text" : "bg-white text-ink-soft shadow-card"}`}
        >
          {calendarOn ? <CalendarDays size={18} /> : <CalendarOff size={18} />}
          Calendar {calendarOn ? "on" : "off"}
        </button>
      </PageHeader>

      <Segmented<Mode>
        label="View"
        options={[
          { value: "all", label: "All tasks" },
          { value: "deadlines", label: "Deadlines" },
        ]}
        value={mode}
        onChange={setMode}
        activeClass="bg-todo text-white shadow-card"
        className="mb-4"
      />

      {mode === "all" ? <WeekView calendarOn={calendarOn} /> : <DeadlinesView />}
    </>
  );
}

function WeekView({ calendarOn }: { calendarOn: boolean }) {
  const { today } = useApp();
  const toast = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);

  const start = addDays(today, weekOffset * 7);
  const days = useMemo(() => dateRange(start, 7), [start]);
  const end = days[6];

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
    for (const d of days) map.set(d, []);
    for (const t of tasks ?? []) if (t.do_on) map.get(t.do_on)?.push(t);
    return map;
  }, [days, tasks]);

  async function toggle(task: TaskSummary) {
    const done = !task.done;
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, done } : t)) ?? null);
    try {
      await setTaskDone(task, done);
      if (done && task.repeat !== "none") await load();
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

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Previous week"
          className="icon-btn bg-white text-ink-soft shadow-card"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => setWeekOffset(0)}
          className="min-h-[44px] px-3 text-center"
          disabled={weekOffset === 0}
        >
          <span className="block font-display text-base font-semibold">
            {weekOffset === 0 ? "This week" : `${monthDay(start)} – ${monthDay(end)}`}
          </span>
          {weekOffset !== 0 && <span className="block text-xs font-medium text-todo-text">Back to today</span>}
        </button>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Next week"
          className="icon-btn bg-white text-ink-soft shadow-card"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {tasks === null ? (
        <LoadingCards count={4} />
      ) : (
        <div className="space-y-3">
          {days.map((d) => (
            <DayCard
              key={d}
              date={d}
              today={today}
              tasks={byDay.get(d) ?? []}
              onToggle={toggle}
              onReorder={reorder}
              onAdd={add}
              // Step 3: calendarSlot={calendarOn ? <DayEvents date={d} /> : null}
            />
          ))}
        </div>
      )}
    </>
  );
}
