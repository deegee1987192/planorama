// Keyword rules for the capture bar. Runs on the device: no AI, no API calls.
//
//   "Buy milk"                          -> To Buy (General list)
//   "Buy firewood for fireplace"        -> To Buy, "Fireplace" list (if it exists)
//   "To do call the dentist tomorrow"   -> To-Do, tomorrow
//   "Task pay rent Friday"              -> To-Do, the coming Friday
//   "Research heat pumps"               -> Research
//   "Note gate code is 4421"            -> Notes
//   anything else                       -> Inbox

import { addDays, todayISO } from "@/lib/dates";

export type CaptureIntent =
  | { kind: "todo"; title: string; doOn: string }
  | { kind: "buy"; title: string; listName: string | null }
  | { kind: "research"; title: string }
  | { kind: "note"; title: string }
  | { kind: "inbox"; text: string };

/** Fallback To Buy list when no list name is said. */
export const DEFAULT_BUY_LIST = "General";

const KEYWORDS: { pattern: RegExp; kind: "todo" | "buy" | "research" | "note" }[] = [
  { pattern: /^(?:to[\s-]?do|task)\b/i, kind: "todo" },
  { pattern: /^buy\b/i, kind: "buy" },
  { pattern: /^research\b/i, kind: "research" },
  { pattern: /^notes?\b/i, kind: "note" },
];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_WORD = "(today|tonight|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)";
const DATE_AT_END = new RegExp(`[\\s,]+(?:on\\s+|this\\s+|next\\s+)?${DAY_WORD}$`, "i");
const DATE_AT_START = new RegExp(`^(?:on\\s+|this\\s+|next\\s+)?${DAY_WORD}[\\s,]+`, "i");

function clean(text: string): string {
  return text
    .trim()
    .replace(/^[\s:,.\-–—]+/, "")
    .replace(/[\s.,!?;:]+$/, "")
    .trim();
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Date for a spoken day word, using Toronto "today". Weekdays mean the next one (today counts). */
export function resolveDayWord(word: string, today = todayISO()): string {
  const w = word.toLowerCase();
  if (w === "today" || w === "tonight") return today;
  if (w === "tomorrow") return addDays(today, 1);
  const target = WEEKDAYS.indexOf(w);
  const [y, m, d] = today.split("-").map(Number);
  const current = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(today, (target - current + 7) % 7);
}

/**
 * Works out where captured text should go.
 * `buyListNames` lets "for <list>" at the end pick an existing To Buy list.
 */
export function parseCapture(raw: string, buyListNames: string[] = [], today = todayISO()): CaptureIntent {
  const text = clean(raw);
  const match = KEYWORDS.find((k) => k.pattern.test(text));
  if (!match) return { kind: "inbox", text: raw.trim() };

  let rest = clean(text.replace(match.pattern, ""));
  if (!rest) return { kind: "inbox", text: raw.trim() };

  switch (match.kind) {
    case "todo": {
      let doOn = today;
      const end = rest.match(DATE_AT_END);
      const start = rest.match(DATE_AT_START);
      if (end) {
        doOn = resolveDayWord(end[1], today);
        rest = clean(rest.slice(0, end.index));
      } else if (start) {
        doOn = resolveDayWord(start[1], today);
        rest = clean(rest.slice(start[0].length));
      }
      if (!rest) return { kind: "inbox", text: raw.trim() };
      return { kind: "todo", title: capitalize(rest), doOn };
    }
    case "buy": {
      // Longest names first so "Fireplace tools" wins over "Fireplace".
      const names = [...buyListNames].sort((a, b) => b.length - a.length);
      for (const name of names) {
        const suffix = new RegExp(
          `\\s+(?:for|to|on|in)\\s+(?:the\\s+|my\\s+)?${escapeRegExp(name)}(?:\\s+list)?$`,
          "i",
        );
        const m = rest.match(suffix);
        if (m && m.index) {
          const title = clean(rest.slice(0, m.index));
          if (title) return { kind: "buy", title: capitalize(title), listName: name };
        }
      }
      return { kind: "buy", title: capitalize(rest), listName: null };
    }
    case "research":
      return { kind: "research", title: capitalize(rest) };
    case "note":
      return { kind: "note", title: capitalize(rest) };
  }
}
