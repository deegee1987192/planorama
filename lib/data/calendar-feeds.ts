import { getSupabase } from "@/lib/supabase/client";
import type { CalendarFeed } from "@/lib/types";

const db = () => getSupabase();

/** A calendar subscription link must be an https:// (or webcal://) address. */
export function normaliseIcsUrl(url: string): string | null {
  const v = url.trim().replace(/^webcal:\/\//i, "https://");
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function listCalendarFeeds(): Promise<CalendarFeed[]> {
  const { data, error } = await db().from("calendar_feeds").select("*").order("sort_order").order("created_at");
  if (error) throw error;
  return data as CalendarFeed[];
}

export async function createCalendarFeed(name: string, icsUrl: string): Promise<CalendarFeed> {
  const { data, error } = await db()
    .from("calendar_feeds")
    .insert({ name, ics_url: icsUrl, sort_order: Date.now() })
    .select()
    .single();
  if (error) throw error;
  return data as CalendarFeed;
}

export async function updateCalendarFeed(id: string, patch: Partial<Pick<CalendarFeed, "name" | "visible">>): Promise<void> {
  const { error } = await db().from("calendar_feeds").update(patch).eq("id", id);
  if (error) throw error;
}

/** Removes the link from Planorama only; nothing changes in the calendar itself. */
export async function deleteCalendarFeed(id: string): Promise<void> {
  const { error } = await db().from("calendar_feeds").delete().eq("id", id);
  if (error) throw error;
}
