"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { fetchCalendarEvents } from "@/lib/data/calendar";
import { todayISO } from "@/lib/dates";
import {
  createCalendarFeed,
  deleteCalendarFeed,
  listCalendarFeeds,
  normaliseIcsUrl,
  updateCalendarFeed,
} from "@/lib/data/calendar-feeds";
import type { CalendarFeed } from "@/lib/types";

/**
 * Account > Calendars: paste a calendar's subscription (ICS) link to show its events
 * on Today. Read-only: Planorama never changes anything in the calendar.
 */
export function CalendarFeedsSection() {
  const toast = useToast();
  const { refreshData } = useApp();
  const [feeds, setFeeds] = useState<CalendarFeed[] | null>(null);
  const [fixed, setFixed] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await listCalendarFeeds();
      setFeeds(list);
      // Calendars set up in Vercel (e.g. Seneca, Work) are listed by the calendar API.
      const today = todayISO();
      const res = await fetchCalendarEvents(today, today).catch(() => null);
      const own = new Set(list.map((f) => f.name.trim()));
      setFixed((res?.calendars ?? []).filter((c) => !own.has(c)));
    } catch (e) {
      toast.error("Couldn't load your calendars", e);
      setFeeds([]);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const link = normaliseIcsUrl(url);
    if (!name.trim()) return toast.error("Give the calendar a name, like Google");
    if (!link) return toast.error("That doesn't look like a calendar link (it should start with https://)");
    setSaving(true);
    try {
      await createCalendarFeed(name.trim(), link);
      setName("");
      setUrl("");
      toast.show({ message: "Calendar added. Its events show on Today when the calendar is on." });
      await load();
      refreshData();
    } catch (err) {
      toast.error("Couldn't add the calendar", err);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(feed: CalendarFeed) {
    setFeeds((prev) => prev?.map((f) => (f.id === feed.id ? { ...f, visible: !f.visible } : f)) ?? null);
    try {
      await updateCalendarFeed(feed.id, { visible: !feed.visible });
      refreshData();
    } catch (err) {
      toast.error("Couldn't update the calendar", err);
      void load();
    }
  }

  async function remove(feed: CalendarFeed) {
    if (!window.confirm(`Remove "${feed.name}" from Planorama? Nothing changes in the calendar itself.`)) return;
    try {
      await deleteCalendarFeed(feed.id);
      await load();
      refreshData();
    } catch (err) {
      toast.error("Couldn't remove the calendar", err);
    }
  }

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-todo" />
        <h2 className="text-lg font-bold">Calendars</h2>
      </div>
      <p className="text-sm text-ink-soft">
        Events show on Today when the calendar is switched on. Planorama only reads them and never changes your calendar.
      </p>

      {fixed.length > 0 && (
        <p className="text-sm text-ink-soft">
          Already connected: <span className="font-semibold text-ink">{fixed.join(", ")}</span>
        </p>
      )}

      {feeds && feeds.length > 0 && (
        <ul className="divide-y divide-line">
          {feeds.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-1">
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{f.name}</span>
              <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink-soft">
                <input
                  type="checkbox"
                  checked={f.visible}
                  onChange={() => toggle(f)}
                  className="h-5 w-5 accent-[#8E2C22]"
                />
                Show
              </label>
              <button
                type="button"
                onClick={() => remove(f)}
                className="icon-btn text-ink-faint hover:text-danger-text"
                aria-label={`Remove ${f.name}`}
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="space-y-2 border-t border-line pt-3">
        <span className="label">Add a calendar</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Google" className="field" aria-label="Calendar name" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Calendar link (https://… .ics)"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="field"
          aria-label="Calendar link"
        />
        <p className="text-xs text-ink-soft">
          Google Calendar: on a computer, open Settings, pick your calendar, then copy &ldquo;Secret address in iCal format&rdquo;.
        </p>
        <button type="submit" className="btn w-full bg-todo text-white" disabled={saving}>
          <Plus size={18} /> {saving ? "Adding…" : "Add calendar"}
        </button>
      </form>
    </section>
  );
}
