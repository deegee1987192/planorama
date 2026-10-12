/** One calendar event occurrence, already converted to Toronto time. */
export interface CalendarEvent {
  id: string;
  calendar: string; // e.g. "Seneca", "Work"
  date: string; // YYYY-MM-DD (Toronto)
  allDay: boolean;
  start: string | null; // HH:MM (Toronto), null when all-day
  end: string | null;
  title: string;
}

export interface CalendarResponse {
  calendars: string[];
  events: CalendarEvent[];
  errors: string[]; // names of calendars that failed to load
}
