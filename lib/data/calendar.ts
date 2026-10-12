import type { CalendarResponse } from "@/lib/calendar/types";

/** Events from the calendar feeds (Seneca, Work, …) for a date range. Read-only. */
export async function fetchCalendarEvents(start: string, end: string): Promise<CalendarResponse> {
  const res = await fetch(`/api/calendar?start=${start}&end=${end}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Calendar request failed (${res.status})`);
  return res.json();
}
