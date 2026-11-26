import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { calendarSources, loadCalendar, type CalendarSource } from "@/lib/calendar/ics";
import type { CalendarResponse } from "@/lib/calendar/types";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD -> events from the ICS feeds.
 * Feeds come from Vercel env vars (*_ICS_URL) and from links added in the app
 * (Account > Calendars, table calendar_feeds; only those switched on).
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const start = request.nextUrl.searchParams.get("start") ?? "";
  const end = request.nextUrl.searchParams.get("end") ?? "";
  if (!DATE.test(start) || !DATE.test(end) || end < start) {
    return NextResponse.json({ error: "Bad date range" }, { status: 400 });
  }

  const sources: CalendarSource[] = calendarSources();
  const { data: feeds, error: feedsError } = await supabase
    .from("calendar_feeds")
    .select("name, ics_url")
    .eq("visible", true)
    .order("sort_order")
    .order("created_at");
  if (feedsError) console.error("Couldn't read calendar_feeds:", feedsError.message);
  for (const f of feeds ?? []) {
    const url = String(f.ics_url).trim().replace(/^webcal:\/\//i, "https://");
    if (!/^https?:\/\//i.test(url)) continue;
    let name = String(f.name).trim() || "Calendar";
    while (sources.some((s) => s.name === name)) name = `${name} 2`;
    sources.push({ name, url });
  }

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
