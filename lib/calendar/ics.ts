import "server-only";
import ICAL from "ical.js";
import { addDays, TIME_ZONE } from "@/lib/dates";
import type { CalendarEvent } from "./types";

export interface CalendarSource {
  name: string;
  url: string;
}

/**
 * Calendar subscription links come from Vercel environment variables whose
 * names end in _ICS_URL or _ICS, e.g. SENECA_ICS_URL -> "Seneca", WORK_ICS -> "Work".
 */
export function calendarSources(): CalendarSource[] {
  return Object.entries(process.env)
    .filter(([key, value]) => /_ICS(_URL)?$/i.test(key) && value && /^(https?|webcal):\/\//i.test(value.trim()))
    .map(([key, value]) => ({
      name: key
        .replace(/_ICS(_URL)?$/i, "")
        .split("_")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" "),
      url: value!.trim().replace(/^webcal:\/\//i, "https://"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Small in-memory cache so flipping weeks doesn't re-download every feed.
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; text: string }>();

async function fetchIcs(url: string): Promise<string> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.text;
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "text/calendar" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Not a calendar file");
  cache.set(url, { at: Date.now(), text });
  return text;
}

const torontoParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const pad = (n: number) => String(n).padStart(2, "0");

/** Toronto wall-clock date and time for an ICAL time. */
function toToronto(t: ICAL.Time): { date: string; time: string } {
  const tzid = t.zone?.tzid;
  // Floating times (no known zone) are treated as Toronto wall-clock time.
  if (!tzid || tzid === "floating") {
    return { date: `${t.year}-${pad(t.month)}-${pad(t.day)}`, time: `${pad(t.hour)}:${pad(t.minute)}` };
  }
  const parts = torontoParts.formatToParts(t.toJSDate());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function dateOnly(t: ICAL.Time): string {
  return `${t.year}-${pad(t.month)}-${pad(t.day)}`;
}

/** All event occurrences between start and end (Toronto dates, inclusive). */
export function parseIcs(text: string, calendar: string, start: string, end: string): CalendarEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(tz);
  }

  const vevents = root.getAllSubcomponents("vevent");
  const masters = new Map<string, ICAL.Event>();
  const singles: ICAL.Event[] = [];
  for (const v of vevents) {
    if (v.hasProperty("recurrence-id")) continue;
    const ev = new ICAL.Event(v);
    if (ev.isRecurring()) masters.set(ev.uid, ev);
    else singles.push(ev);
  }
  // Moved or edited single occurrences of a repeating event.
  for (const v of vevents) {
    if (!v.hasProperty("recurrence-id")) continue;
    const ex = new ICAL.Event(v);
    const master = masters.get(ex.uid);
    if (master) master.relateException(ex);
    else singles.push(ex);
  }

  // Search a little wider than asked, then filter on the Toronto date.
  const windowStart = new Date(`${addDays(start, -1)}T00:00:00Z`).getTime();
  const windowEnd = new Date(`${addDays(end, 2)}T00:00:00Z`).getTime();
  const out: CalendarEvent[] = [];

  const push = (item: ICAL.Event, s: ICAL.Time, e: ICAL.Time | null) => {
    const title = (item.summary || "Busy").trim();
    if (/^free$/i.test(title)) return;
    if (s.isDate) {
      // All-day: show on every day it covers (DTEND is exclusive).
      const first = dateOnly(s);
      const last = e ? addDays(dateOnly(e), -1) : first;
      for (let d = first, i = 0; d <= last && i < 60; d = addDays(d, 1), i++) {
        if (d >= start && d <= end) {
          out.push({ id: `${calendar}:${item.uid}:${d}`, calendar, date: d, allDay: true, start: null, end: null, title });
        }
      }
      return;
    }
    const from = toToronto(s);
    if (from.date < start || from.date > end) return;
    const to = e ? toToronto(e) : null;
    out.push({
      id: `${calendar}:${item.uid}:${from.date}T${from.time}`,
      calendar,
      date: from.date,
      allDay: false,
      start: from.time,
      end: to ? (to.date === from.date ? to.time : "23:59") : null,
      title,
    });
  };

  for (const ev of singles) {
    const t = ev.startDate.toJSDate().getTime();
    if (t < windowStart || t > windowEnd) continue;
    push(ev, ev.startDate, ev.endDate);
  }

  for (const ev of masters.values()) {
    const it = ev.iterator();
    let next: ICAL.Time | null;
    let guard = 0;
    while ((next = it.next()) && guard++ < 5000) {
      const t = next.toJSDate().getTime();
      if (t > windowEnd) break;
      if (t < windowStart) continue;
      const details = ev.getOccurrenceDetails(next);
      push(details.item, details.startDate, details.endDate);
    }
  }

  return out;
}

export async function loadCalendar(source: CalendarSource, start: string, end: string): Promise<CalendarEvent[]> {
  const text = await fetchIcs(source.url);
  return parseIcs(text, source.name, start, end);
}
