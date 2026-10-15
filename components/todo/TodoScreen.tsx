"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, UserRound, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProviders";
import { LoadingCards, PageHeader, Segmented } from "@/components/ui";
import { addDays, dateRange, monthDay } from "@/lib/dates";
import { useStoredBoolean } from "@/lib/use-local-storage";
import { DayCard } from "./DayCard";
import { DayEvents } from "./DayEvents";
import { TaskBoard } from "./TaskBoard";
import { DeadlinesView } from "./DeadlinesView";
import { DoneView } from "./DoneView";
import { MonthView } from "./MonthView";
import { useCalendarEvents, useDayTasks } from "./useDayTasks";

type Mode = "week" | "month" | "deadlines" | "done";

export function TodoScreen() {
  const [mode, setMode] = useState<Mode>("week");
  // Shows read-only events from the calendar feeds (see lib/calendar) in the day cards.
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
        <Link href="/account" aria-label="Account" className="icon-btn bg-white text-ink-soft shadow-card">
          <UserRound size={18} />
        </Link>
      </PageHeader>

      <Segmented<Mode>
        label="View"
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Calendar" },
          { value: "deadlines", label: "Deadlines" },
          { value: "done", label: "Done" },
        ]}
        value={mode}
        onChange={setMode}
        activeClass="bg-todo text-white shadow-card"
        className="mx-auto mb-4 max-w-2xl"
      />

      {mode === "week" && <WeekView calendarOn={calendarOn} />}
      {mode === "month" && <MonthView calendarOn={calendarOn} />}
      {mode === "deadlines" && (
        <div className="mx-auto max-w-2xl">
          <DeadlinesView />
        </div>
      )}
      {mode === "done" && (
        <div className="mx-auto max-w-2xl">
          <DoneView />
        </div>
      )}
    </>
  );
}

function WeekView({ calendarOn }: { calendarOn: boolean }) {
  const { today } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);

  const start = addDays(today, weekOffset * 7);
  const days = useMemo(() => dateRange(start, 7), [start]);
  const end = days[6];

  const { tasks, byDay, crossedOff, toggle, togglePartial, clear, reorder, move, add } = useDayTasks(start, end);
  const { calendars, eventsByDay } = useCalendarEvents(calendarOn, start, end);

  return (
    <>
      <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between">
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
        <>
          {crossedOff.length > 0 && (
            <div className="mx-auto mb-3 flex max-w-2xl justify-end lg:max-w-none">
              <button type="button" onClick={() => clear(crossedOff)} className="btn bg-white px-4 text-ink-soft shadow-card">
                <X size={16} /> Remove all crossed off ({crossedOff.length})
              </button>
            </div>
          )}
          <TaskBoard byDay={byDay} onReorder={reorder} onMove={move}>
            {/* Phones: one day per row. Desktop: all 7 days side by side. */}
            <div className="mx-auto grid max-w-2xl gap-3 lg:max-w-none lg:grid-cols-7 lg:items-start lg:gap-2">
              {days.map((d) => (
                <DayCard
                  key={d}
                  date={d}
                  today={today}
                  tasks={byDay.get(d) ?? []}
                  onToggle={toggle}
                  onPartial={togglePartial}
                  onClear={clear}
                  onAdd={add}
                  calendarSlot={
                    calendarOn ? <DayEvents events={eventsByDay.get(d) ?? []} calendars={calendars} /> : null
                  }
                />
              ))}
            </div>
          </TaskBoard>
        </>
      )}

      <p className="mx-auto mt-4 max-w-2xl px-1 text-center text-xs text-ink-faint">
        Tips: tap the half circle to mark a task partly done. Drag the dotted handle to move it to another day.
      </p>
    </>
  );
}
