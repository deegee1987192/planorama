import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { calendarSources, loadCalendar } from "@/lib/calendar/ics";
import type { CalendarResponse } from "@/lib/calendar/types";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD -> events from the ICS feeds. */
export async function GET(request: NextRequest) {
  const {
    data: { user },
  } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const start = request.nextUrl.searchParams.get("start") ?? "";
  const end = request.nextUrl.searchParams.get("end") ?? "";
  if (!DATE.test(start) || !DATE.test(end) || end < start) {
    return NextResponse.json({ error: "Bad date range" }, { status: 400 });
  }

  const sources = calendarSources();
  const results = await Promise.allSettled(sources.map((s) => loadCalendar(s, start, end)));

  const body: CalendarResponse = { calendars: sources.map((s) => s.name), events: [], errors: [] };
  results.forEach((r, i) => {
    if (r.status === "fulfilled") body.events.push(...r.value);
    else {
      console.error(`Calendar "${sources[i].name}" failed:`, r.reason);
      body.errors.push(sources[i].name);
    }
  });
  body.events.sort((a, b) => a.date.localeCompare(b.date) || Number(b.allDay) - Number(a.allDay) || (a.start ?? "").localeCompare(b.start ?? ""));

  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
