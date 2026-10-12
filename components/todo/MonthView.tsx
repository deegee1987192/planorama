"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp, useSyncedLoad } from "@/components/providers/AppProviders";
import { LoadingCards } from "@/components/ui";
import { addDays, dateRange, monthName } from "@/lib/dates";
import { listDeadlineTasks } from "@/lib/data/tasks";
import { DayCard } from "./DayCard";
import { CalendarBadge, DayEvents, eventTime } from "./DayEvents";
import { useCalendarEvents, useDayTasks } from "./useDayTasks";

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

/** First day of the month `offset` months from today's month, as YYYY-MM-01. */
function monthStart(today: string, offset: number): string {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().slice(0, 10);
}

/** Month grid (Sunday first). Tap a day to see and edit its tasks below. */
export function MonthView({ calendarOn }: { calendarOn: boolean }) {
  const { today } = useApp();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(today);

  const first = monthStart(today, offset);
  const month = first.slice(0, 7);
  const gridStart = addDays(first, -new Date(`${first}T00:00:00Z`).getUTCDay());
  const cells = useMemo(() => dateRange(gridStart, 42), [gridStart]);
  const gridEnd = cells[41];

  const { tasks, byDay, toggle, togglePartial, reorder, add } = useDayTasks(gridStart, gridEnd);
  const { calendars, eventsByDay } = useCalendarEvents(calendarOn, gridStart, gridEnd);

  // Deadline flags on the grid.
  const [deadlines, setDeadlines] = useState<Set<string>>(new Set());
  const loadDeadlines = useCallback(async () => {
    try {
      const list = await listDeadlineTasks();
      setDeadlines(new Set(list.map((t) => t.deadline!)));
    } catch {
      // Flags are a nice-to-have; tasks still load.
    }
  }, []);
  useSyncedLoad(loadDeadlines, [loadDeadlines]);

  function changeMonth(delta: number) {
    const next = offset + delta;
    setOffset(next);
    setSelected(next === 0 ? today : monthStart(today, next));
  }

  return (
    <div className="mx-auto max-w-2xl md:max-w-none lg:grid lg:max-w-[1400px] lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
      <section className="card mb-3 p-3 lg:mb-0">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="icon-btn text-ink-soft hover:bg-black/5">
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              setOffset(0);
              setSelected(today);
            }}
            className="min-h-[44px] px-3"
          >
            <span className="font-display text-lg font-bold">{monthName(first)}</span>
          </button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="icon-btn text-ink-soft hover:bg-black/5">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase text-ink-faint">
          {WEEKDAY_HEADERS.map((d, i) => (
            <div key={i} className="pb-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 [&>*]:min-w-0">
          {cells.map((d) => {
            const dayTasks = byDay.get(d) ?? [];
            const events = eventsByDay.get(d) ?? [];
            const inMonth = d.slice(0, 7) === month;
            const isToday = d === today;
            const isSelected = d === selected;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelected(d)}
                aria-pressed={isSelected}
                aria-label={`${d}: ${dayTasks.length} tasks${events.length ? `, ${events.length} events` : ""}${deadlines.has(d) ? ", deadline" : ""}`}
                className={`flex min-h-[52px] min-w-0 flex-col items-center rounded-xl px-0.5 pb-1 pt-1 text-left transition md:min-h-[96px] md:items-stretch md:px-1.5 ${
                  isSelected ? "bg-todo-soft" : "hover:bg-black/[0.03]"
                } ${isToday ? "ring-2 ring-todo" : ""}`}
              >
                <span
                  className={`text-sm font-semibold md:text-xs ${
                    isToday ? "text-todo-text" : inMonth ? "text-ink" : "text-ink-faint/60"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                {/* Phones: dots. Tablet and desktop: everything, written out and wrapped. */}
                <span className="mt-1 flex flex-wrap justify-center gap-0.5 md:hidden">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${t.partial ? "bg-partial" : "bg-todo"}`} />
                  ))}
                  {events.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#35607F]" />}
                  {deadlines.has(d) && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
                </span>
                <span className="mt-0.5 hidden min-w-0 space-y-1 md:block">
                  {deadlines.has(d) && (
                    <span className="block break-words text-[11px] font-semibold leading-tight text-danger-text">Deadline</span>
                  )}
                  {events.map((e) => (
                    <span key={e.id} className="flex items-start gap-1 text-[11px] leading-tight">
                      <CalendarBadge calendars={calendars} name={e.calendar} />
                      <span className="min-w-0 break-words text-ink-soft">
                        {eventTime(e)}
                        {e.title && !/^busy$/i.test(e.title) ? ` ${e.title}` : ""}
                      </span>
                    </span>
                  ))}
                  {dayTasks.map((t) => (
                    <span
                      key={t.id}
                      className={`block break-words rounded px-0.5 text-[11px] leading-tight text-ink ${t.partial ? "bg-partial-soft" : ""}`}
                    >
                      {t.title}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {tasks === null ? (
        <LoadingCards count={1} />
      ) : (
        <DayCard
          date={selected}
          today={today}
          tasks={byDay.get(selected) ?? []}
          onToggle={toggle}
          onPartial={togglePartial}
          onReorder={reorder}
          onAdd={add}
          calendarSlot={calendarOn ? <DayEvents events={eventsByDay.get(selected) ?? []} calendars={calendars} /> : null}
        />
      )}
    </div>
  );
}
