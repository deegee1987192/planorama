import { CalendarDays } from "lucide-react";
import { formatTime } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/calendar/types";

// One colour per calendar, assigned in the order the calendars are listed.
const PALETTE = [
  { bar: "bg-[#B42318]", soft: "bg-[#FEF0EE]", text: "text-[#912018]" },
  { bar: "bg-notes", soft: "bg-notes-soft/70", text: "text-notes" },
  { bar: "bg-buy", soft: "bg-buy-soft/70", text: "text-buy" },
  { bar: "bg-research", soft: "bg-research-soft/70", text: "text-research" },
];

export function calendarColor(calendars: string[], name: string) {
  const i = calendars.indexOf(name);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
}

/** Read-only calendar events shown at the top of a day card. */
export function DayEvents({ events, calendars }: { events: CalendarEvent[]; calendars: string[] }) {
  if (!events.length) return null;
  return (
    <ul className="mx-1 mb-1 mt-1 space-y-1" aria-label="Calendar events">
      {events.map((e) => {
        const c = calendarColor(calendars, e.calendar);
        return (
          <li key={e.id} className={`flex items-center gap-2 overflow-hidden rounded-xl py-1.5 pl-0 pr-3 ${c.soft}`}>
            <span className={`h-6 w-1 shrink-0 rounded-r-full ${c.bar}`} aria-hidden="true" />
            <CalendarDays size={14} className={`shrink-0 ${c.text}`} aria-hidden="true" />
            <span className={`shrink-0 text-xs font-semibold ${c.text}`}>
              {e.allDay ? "All day" : `${formatTime(e.start!)}${e.end ? ` – ${formatTime(e.end)}` : ""}`}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{e.title}</span>
            {calendars.length > 1 && (
              <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-wide ${c.text}`}>{e.calendar}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
