"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useApp } from "@/components/providers/AppProviders";
import { LoadingCards } from "@/components/ui";
import { addDays, dateRange, longDate, monthDay, weekStart, weekdayShort } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { TaskSummary } from "@/lib/types";
import { AddTaskRow, TaskExtras } from "./DayCard";
import { CalendarBadge, calendarColor, eventTime } from "./DayEvents";
import { TaskBoard } from "./TaskBoard";
import { TaskRow } from "./TaskRow";
import { useCalendarEvents, useDayTasks } from "./useDayTasks";

type Item = { kind: "event"; event: CalendarEvent } | { kind: "task"; task: TaskSummary };

/**
 * Today: a Monday-to-Sunday week strip (tap a day; dots mark days with calendar events),
 * then that day's calendar events and tasks in time order. Tasks with no time come last.
 */
export function DayView({ calendarOn }: { calendarOn: boolean }) {
  const { today } = useApp();
  const [selected, setSelected] = useState(today);
  const start = weekStart(selected);
  const end = addDays(start, 6);
  const days = useMemo(() => dateRange(start, 7), [start]);

  const { tasks, byDay, toggle, togglePartial, clear, remove, reorder, move, add } = useDayTasks(start, end);
  const { calendars, eventsByDay } = useCalendarEvents(calendarOn, start, end);

  const dayTasks = byDay.get(selected) ?? [];
  const dayEvents = eventsByDay.get(selected) ?? [];
  const crossedOff = dayTasks.filter((t) => t.done);

  const items = useMemo<Item[]>(() => {
    const allDay: Item[] = dayEvents.filter((e) => e.allDay).map((event) => ({ kind: "event", event }));
    const timed: { at: string; order: number; item: Item }[] = [
      ...dayEvents.filter((e) => !e.allDay).map((event) => ({ at: event.start ?? "", order: 0, item: { kind: "event", event } as Item })),
      ...dayTasks.filter((t) => t.time).map((task) => ({ at: task.time!.slice(0, 5), order: 1, item: { kind: "task", task } as Item })),
    ];
    timed.sort((a, b) => a.at.localeCompare(b.at) || a.order - b.order);
    const untimed: Item[] = dayTasks.filter((t) => !t.time).map((task) => ({ kind: "task", task }));
    return [...allDay, ...timed.map((t) => t.item), ...untimed];
  }, [dayEvents, dayTasks]);

  const goWeek = (weeks: number) => setSelected(addDays(selected, weeks * 7));

  return (
    <div className="mx-auto max-w-2xl">
      {/* Week strip */}
      <div className="mb-1 flex items-center justify-between">
        <button type="button" onClick={() => goWeek(-1)} aria-label="Previous week" className="icon-btn text-ink-soft hover:bg-black/5">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-bold text-ink-soft">
          {monthDay(start)} – {monthDay(end)}
        </span>
        <button type="button" onClick={() => goWeek(1)} aria-label="Next week" className="icon-btn text-ink-soft hover:bg-black/5">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Pick a day">
        {days.map((d) => {
          const isSelected = d === selected;
          const isToday = d === today;
          const hasEvents = (eventsByDay.get(d)?.length ?? 0) > 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelected(d)}
              aria-pressed={isSelected}
              aria-label={`${longDate(d)}${isToday ? ", today" : ""}${hasEvents ? ", has events" : ""}`}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl transition ${
                isSelected
                  ? "bg-ink text-white"
                  : `bg-white text-ink shadow-card ${isToday ? "ring-2 ring-todo" : ""}`
              }`}
            >
              <span className="text-[11px] font-bold">{weekdayShort(d).charAt(0)}</span>
              <span className="text-base font-extrabold leading-none">{Number(d.slice(8))}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${hasEvents ? (isSelected ? "bg-[#F2A541]" : "bg-todo") : "bg-transparent"}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {/* Chosen day */}
      <div className="mb-2 mt-5 flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-extrabold">
          {longDate(selected)}
          {selected === today && <span className="ml-2 align-middle text-xs font-bold uppercase tracking-wide text-todo-text">Today</span>}
        </h2>
        {selected !== today && (
          <button type="button" onClick={() => setSelected(today)} className="btn min-h-[36px] bg-white px-3 text-todo-text shadow-card">
            Back to today
          </button>
        )}
      </div>

      {tasks === null ? (
        <LoadingCards count={3} />
      ) : (
        <section className="card px-2 pb-2 pt-2" aria-label="Schedule and to-dos">
          <TaskBoard byDay={new Map([[selected, dayTasks]])} onReorder={reorder} onMove={move}>
            <SortableContext items={dayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="min-h-[8px]">
                {items.map((item) =>
                  item.kind === "event" ? (
                    <EventRow key={item.event.id} event={item.event} calendars={calendars} />
                  ) : (
                    <TaskRow
                      key={item.task.id}
                      task={item.task}
                      today={today}
                      onToggle={toggle}
                      onPartial={togglePartial}
                      onRemove={remove}
                      extras={<TaskExtras task={item.task} />}
                    />
                  ),
                )}
              </ul>
            </SortableContext>
          </TaskBoard>

          {items.length === 0 && (
            <p className="px-3 py-3 text-sm text-ink-soft">
              {calendarOn ? "Nothing planned. Enjoy it, or add a task." : "No tasks yet. Calendar events are hidden."}
            </p>
          )}

          <div className="flex flex-wrap items-center">
            <div className="min-w-0 flex-1">
              <AddTaskRow date={selected} onAdd={add} />
            </div>
            {crossedOff.length > 0 && (
              <button
                type="button"
                onClick={() => clear(crossedOff)}
                className="flex min-h-[44px] items-center gap-1 rounded-2xl px-3 text-xs font-semibold text-ink-soft hover:bg-black/5"
              >
                <X size={14} /> Clear crossed off{crossedOff.length > 1 ? ` (${crossedOff.length})` : ""}
              </button>
            )}
          </div>
        </section>
      )}

      <p className="mt-4 px-1 text-center text-xs text-ink-faint">
        Tip: swipe a task left (or hover on a laptop) for Partly done and Remove. Tap Week to drag tasks between days.
      </p>
    </div>
  );
}

/** A read-only calendar event, in the same list as the tasks. */
function EventRow({ event, calendars }: { event: CalendarEvent; calendars: string[] }) {
  const c = calendarColor(calendars, event.calendar);
  return (
    <li className={`my-1 flex items-start gap-3 rounded-2xl px-3 py-2.5 ${c.soft}`}>
      <span className={`w-[68px] shrink-0 pt-px text-xs font-extrabold ${c.text}`}>
        {event.allDay ? "All day" : eventTime(event).split(" – ")[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[15px] font-bold leading-snug">{event.title}</span>
        <span className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${c.text}`}>
          {calendars.length > 1 ? <CalendarBadge calendars={calendars} name={event.calendar} /> : <CalendarDays size={12} aria-hidden="true" />}
          {event.calendar} calendar
          {!event.allDay && event.end ? ` · until ${eventTime(event).split(" – ")[1]}` : ""}
        </span>
      </span>
    </li>
  );
}
