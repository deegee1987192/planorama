"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Pause, Play } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { archiveGoal, pauseGoal, resumeGoal, unarchiveGoal } from "@/lib/data/goals";
import { addDays, monthDay, todayISO } from "@/lib/dates";
import type { GoalWithParts } from "@/lib/types";

/** Pause until a date / Resume, and Archive / Unarchive, for one goal. */
export function GoalStatusControls({ goal, onChanged }: { goal: GoalWithParts; onChanged: () => void }) {
  const toast = useToast();
  const [pausing, setPausing] = useState(false);
  const [until, setUntil] = useState(addDays(todayISO(), 14));
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<string>) {
    setBusy(true);
    try {
      toast.show({ message: await work() });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error && !("code" in e) ? e.message : "Couldn't update the goal", e);
    } finally {
      setBusy(false);
    }
  }

  if (goal.status === "archived") {
    return (
      <button type="button" disabled={busy} onClick={() => run(async () => (await unarchiveGoal(goal.id), "Goal is back"))} className="btn w-full bg-white text-ink shadow-card">
        <ArchiveRestore size={18} /> Unarchive
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {goal.status === "paused" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const moved = await resumeGoal(goal);
              return moved ? `Resumed. Checkpoints moved ${moved} day${moved === 1 ? "" : "s"} later.` : "Resumed";
            })
          }
          className="btn w-full bg-white text-ink shadow-card"
        >
          <Play size={18} /> Resume now{goal.paused_until ? ` (paused until ${monthDay(goal.paused_until)})` : ""}
        </button>
      ) : pausing ? (
        <div className="rounded-2xl bg-cream p-3">
          <label className="label" htmlFor="pause-until">
            Pause until
          </label>
          <input id="pause-until" type="date" min={addDays(todayISO(), 1)} value={until} onChange={(e) => setUntil(e.target.value)} className="field bg-white" />
          <p className="mt-1.5 text-xs text-ink-soft">When it resumes, its unfinished checkpoints move later by the length of the pause.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy || !until || until <= todayISO()}
              onClick={() => run(async () => (await pauseGoal(goal.id, until), `Paused until ${monthDay(until)}`))}
              className="btn flex-1 bg-ink text-white"
            >
              Pause
            </button>
            <button type="button" onClick={() => setPausing(false)} className="btn flex-1 bg-white text-ink">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPausing(true)} className="btn w-full bg-white text-ink shadow-card">
          <Pause size={18} /> Pause until a date
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!window.confirm(`Archive "${goal.name}"? It leaves Today, Goals and future weeks. Its history is kept and you can unarchive it.`)) return;
          void run(async () => (await archiveGoal(goal), "Archived. Find it under Edit goals > Archived."));
        }}
        className="btn w-full text-ink-soft"
      >
        <Archive size={18} /> Archive
      </button>
    </div>
  );
}
