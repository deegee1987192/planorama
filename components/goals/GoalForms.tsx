"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Segmented } from "@/components/ui";
import { GOAL_COLOURS } from "@/lib/goal-colours";
import type { ActionInput, CheckpointInput, GoalInput } from "@/lib/data/goals";
import type { Checkpoint, GoalAction, GoalTier, TrackBy } from "@/lib/types";

export const TIERS: { value: GoalTier; label: string }[] = [
  { value: "big_goal", label: "Big goal" },
  { value: "give_back", label: "Give back" },
  { value: "social", label: "Social" },
  { value: "foundation", label: "Foundation" },
];

export const tierLabel = (tier: GoalTier) => TIERS.find((t) => t.value === tier)?.label ?? tier;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "3x a week · timer · km", "4 h a week · timer" */
export function actionSummary(a: Pick<GoalAction, "per_week" | "hours_per_week" | "track_by" | "unit" | "preferred_days" | "preferred_time">): string {
  const parts: string[] = [];
  if (a.hours_per_week) parts.push(`${a.hours_per_week} h a week`);
  else if (a.per_week) parts.push(`${a.per_week}x a week`);
  parts.push(a.track_by === "check" ? "check off" : a.track_by === "timer" ? "timer" : "number");
  if (a.unit) parts.push(a.unit);
  if (a.preferred_days.length) parts.push([...a.preferred_days].sort().map((d) => DAYS[d - 1]).join(", "));
  if (a.preferred_time) parts.push(a.preferred_time.slice(0, 5));
  return parts.join(" · ");
}

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/** Row of colour dots; the chosen one is ticked. */
export function ColourChoice({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
      {GOAL_COLOURS.map((c) => {
        const on = c.hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.hex)}
            className={`flex h-11 w-11 items-center justify-center rounded-full ${on ? "ring-2 ring-ink ring-offset-2" : ""}`}
            style={{ backgroundColor: c.hex }}
          >
            {on && <Check size={18} strokeWidth={3} className="text-white" />}
          </button>
        );
      })}
    </div>
  );
}

export function GoalForm({
  initial,
  submitLabel,
  onSave,
}: {
  initial?: Partial<GoalInput>;
  submitLabel: string;
  onSave: (values: GoalInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [result, setResult] = useState(initial?.result ?? "");
  const [colour, setColour] = useState(initial?.colour ?? GOAL_COLOURS[0].hex);
  const [tier, setTier] = useState<GoalTier>(initial?.tier ?? "big_goal");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave({ name: name.trim(), result: result.trim(), colour, tier, start_date: startDate || null });
      }}
      className="space-y-4"
    >
      <Field label="Name" htmlFor="goal-name">
        <input id="goal-name" autoFocus={!initial?.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Half marathon" className="field" />
      </Field>
      <Field label="December result" htmlFor="goal-result" hint="What done looks like by the end of the year.">
        <input id="goal-result" value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. Finish 21.1 km" className="field" />
      </Field>
      <Field label="Colour">
        <ColourChoice value={colour} onChange={setColour} />
      </Field>
      <Field label="Tier">
        <Segmented<GoalTier> label="Tier" options={TIERS} value={tier} onChange={setTier} activeClass="bg-ink text-white shadow-card" />
      </Field>
      <Field label="Start date" htmlFor="goal-start">
        <input id="goal-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field" />
      </Field>
      <button type="submit" className="btn w-full bg-ink text-white" disabled={!name.trim()}>
        {submitLabel}
      </button>
    </form>
  );
}

export function CheckpointForm({
  checkpoint,
  onSave,
  onDelete,
}: {
  checkpoint?: Checkpoint;
  onSave: (values: CheckpointInput & { best_result?: string }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(checkpoint?.title ?? "");
  const [due, setDue] = useState(checkpoint?.due_date ?? "");
  const [how, setHow] = useState(checkpoint?.how_youll_know ?? "");
  const [best, setBest] = useState(checkpoint?.best_result ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim() && due)
          onSave({ title: title.trim(), due_date: due, how_youll_know: how.trim(), ...(checkpoint ? { best_result: best.trim() } : {}) });
      }}
      className="space-y-4"
    >
      <Field label="Due date" htmlFor="cp-due">
        <input id="cp-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field" required />
      </Field>
      <Field label="Checkpoint" htmlFor="cp-title">
        <input id="cp-title" autoFocus={!checkpoint} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run 30 minutes non-stop" className="field" />
      </Field>
      <Field label="How you'll know" htmlFor="cp-how">
        <input id="cp-how" value={how} onChange={(e) => setHow(e.target.value)} placeholder="Optional" className="field" />
      </Field>
      {checkpoint && (
        <Field label="Best so far" htmlFor="cp-best">
          <input id="cp-best" value={best} onChange={(e) => setBest(e.target.value)} placeholder="e.g. 24 min" className="field" />
        </Field>
      )}
      <button type="submit" className="btn w-full bg-ink text-white" disabled={!title.trim() || !due}>
        Save
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="btn w-full text-danger-text">
          <Trash2 size={18} /> Delete checkpoint
        </button>
      )}
    </form>
  );
}

type Amount = "times" | "hours";

export function ActionForm({
  action,
  onSave,
  onDelete,
}: {
  action?: GoalAction;
  onSave: (values: ActionInput) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(action?.name ?? "");
  const [amount, setAmount] = useState<Amount>(action?.hours_per_week ? "hours" : "times");
  const [count, setCount] = useState(String(action?.hours_per_week ?? action?.per_week ?? 1));
  const [trackBy, setTrackBy] = useState<TrackBy>(action?.track_by ?? "check");
  const [unit, setUnit] = useState(action?.unit ?? "");
  const [days, setDays] = useState<number[]>(action?.preferred_days ?? []);
  const [time, setTime] = useState(action?.preferred_time?.slice(0, 5) ?? "");

  const n = Number(count);
  const valid = name.trim() && Number.isFinite(n) && n > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave({
          name: name.trim(),
          per_week: amount === "times" ? Math.round(n) : null,
          hours_per_week: amount === "hours" ? n : null,
          track_by: trackBy,
          unit: unit.trim(),
          preferred_days: [...days].sort(),
          preferred_time: time || null,
        });
      }}
      className="space-y-4"
    >
      <Field label="Action" htmlFor="act-name">
        <input id="act-name" autoFocus={!action} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Run" className="field" />
      </Field>
      <Field label="How much each week">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={amount === "times" ? 1 : 0.25}
            step={amount === "times" ? 1 : 0.25}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="field w-24 text-center"
            aria-label={amount === "times" ? "Times per week" : "Hours per week"}
          />
          <Segmented<Amount>
            label="Unit"
            options={[
              { value: "times", label: "times a week" },
              { value: "hours", label: "hours a week" },
            ]}
            value={amount}
            onChange={setAmount}
            activeClass="bg-ink text-white shadow-card"
            className="flex-1"
          />
        </div>
      </Field>
      <Field label="Tracked by">
        <Segmented<TrackBy>
          label="Tracked by"
          options={[
            { value: "check", label: "Check" },
            { value: "timer", label: "Timer" },
            { value: "number", label: "Number" },
          ]}
          value={trackBy}
          onChange={setTrackBy}
          activeClass="bg-ink text-white shadow-card"
        />
      </Field>
      {trackBy !== "check" && (
        <Field label={trackBy === "timer" ? "Also log a number (optional)" : "Unit"} htmlFor="act-unit">
          <input id="act-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. km, pages" className="field" />
        </Field>
      )}
      <Field label="Preferred days (optional)">
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => {
            const day = i + 1;
            const on = days.includes(day);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => setDays(on ? days.filter((x) => x !== day) : [...days, day])}
                className={`min-h-[44px] min-w-[44px] rounded-full px-2 text-sm font-bold ${on ? "bg-ink text-white" : "bg-cream text-ink-soft"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Preferred time (optional)" htmlFor="act-time">
        <input id="act-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field" />
      </Field>
      <button type="submit" className="btn w-full bg-ink text-white" disabled={!valid}>
        Save
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="btn w-full text-danger-text">
          <Trash2 size={18} /> Delete action
        </button>
      )}
    </form>
  );
}
