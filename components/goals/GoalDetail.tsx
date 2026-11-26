"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Pause, Plus } from "lucide-react";
import { useApp, useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { LoadingCards, Sheet } from "@/components/ui";
import {
  activeCheckpoint,
  checkpointsToShift,
  createAction,
  createCheckpoint,
  deleteAction,
  deleteCheckpoint,
  getGoal,
  rescheduleCheckpoint,
  setCheckpointReached,
  updateAction,
  updateCheckpoint,
  updateGoal,
} from "@/lib/data/goals";
import { addDays, dateOfTimestamp, daysBetween, monthDay } from "@/lib/dates";
import type { Checkpoint, GoalAction, GoalWithParts } from "@/lib/types";
import { ActionForm, CheckpointForm, GoalForm, actionSummary, tierLabel } from "./GoalForms";
import { GoalStatusControls } from "./GoalStatusControls";

type SheetState =
  | { kind: "edit" }
  | { kind: "checkpoint"; checkpoint?: Checkpoint }
  | { kind: "action"; action?: GoalAction }
  | { kind: "reschedule"; checkpoint: Checkpoint }
  | null;

/** Goal detail: name, December result, checkpoints (with Reschedule) and actions. */
export function GoalDetail({ id }: { id: string }) {
  const toast = useToast();
  const { today } = useApp();
  const [goal, setGoal] = useState<GoalWithParts | null | undefined>(undefined);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setGoal(await getGoal(id));
    } catch (e) {
      toast.error("Couldn't load the goal", e);
    }
  }, [id, toast]);

  useSyncedLoad(load, [load]);

  async function act(work: () => Promise<unknown>, message?: string, close = true) {
    if (close) setSheet(null);
    try {
      await work();
      if (message) toast.show({ message });
    } catch (e) {
      toast.error(e instanceof Error && e.message.includes("logged history") ? e.message : "Couldn't save", e);
    }
    await load();
  }

  if (goal === undefined) return <LoadingCards count={3} />;
  if (goal === null)
    return (
      <div className="card mt-6 p-6 text-center">
        <p className="font-bold">This goal doesn&rsquo;t exist any more.</p>
        <Link href="/goals" className="mt-3 inline-block font-bold text-goals-text">
          Back to Goals
        </Link>
      </div>
    );

  const g = goal;
  const active = activeCheckpoint(g.checkpoints);
  const reached = g.checkpoints.filter((c) => c.status === "done").length;
  const activeIndex = active ? g.checkpoints.indexOf(active) : -1;
  const later = activeIndex >= 0 ? g.checkpoints.slice(activeIndex + 1) : [];
  const visibleLater = showAll ? later : later.slice(0, 1);
  const hiddenCount = later.length - visibleLater.length;

  async function markReached(c: Checkpoint) {
    await act(() => setCheckpointReached(c, true), undefined, false);
    toast.show({
      message: "Checkpoint reached. Nice work!",
      actionLabel: "Undo",
      onAction: () => void act(() => setCheckpointReached(c, false), undefined, false),
    });
  }

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Link href="/goals" className="-ml-1 inline-flex min-h-[44px] items-center gap-1 pt-3 text-sm font-extrabold text-ink-soft">
        <ChevronLeft size={18} /> Goals
      </Link>

      <header className="flex items-start justify-between gap-3 pb-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[26px] font-extrabold leading-tight">
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: g.colour }} aria-hidden="true" />
            {g.name}
          </h1>
          {g.result && <p className="mt-0.5 text-sm font-semibold text-ink-soft">{g.result}</p>}
          <p className="mt-1 text-xs font-semibold text-ink-faint">
            {tierLabel(g.tier)}
            {g.status === "paused" && (
              <span className="ml-2 inline-flex items-center gap-1 text-ink-soft">
                <Pause size={12} /> Paused{g.paused_until ? ` until ${monthDay(g.paused_until)}` : ""}
              </span>
            )}
            {g.status === "archived" && <span className="ml-2 text-ink-soft">Archived</span>}
          </p>
        </div>
        <button type="button" onClick={() => setSheet({ kind: "edit" })} className="btn shrink-0 bg-white px-4 text-ink shadow-card">
          Edit
        </button>
      </header>

      {/* Checkpoints */}
      <section className="card p-4" aria-label="Checkpoints">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-[15px] font-extrabold">Checkpoints</h2>
          {g.checkpoints.length > 0 && (
            <span className="text-xs font-bold text-ink-soft">
              {reached} of {g.checkpoints.length} reached
            </span>
          )}
        </div>

        {g.checkpoints.length === 0 && <p className="py-1 text-sm text-ink-soft">No checkpoints. That&rsquo;s fine for a habit.</p>}

        <ul>
          {(activeIndex < 0 ? g.checkpoints : g.checkpoints.slice(0, activeIndex)).map((c) => (
            <DoneRow key={c.id} checkpoint={c} onOpen={() => setSheet({ kind: "checkpoint", checkpoint: c })} />
          ))}
          {active && (
            <ActiveRow
              checkpoint={active}
              goal={g}
              today={today}
              previous={activeIndex > 0 ? g.checkpoints[activeIndex - 1] : undefined}
              onOpen={() => setSheet({ kind: "checkpoint", checkpoint: active })}
              onReached={() => markReached(active)}
              onReschedule={() => setSheet({ kind: "reschedule", checkpoint: active })}
            />
          )}
          {visibleLater.map((c) => (
            c.status === "done" ? (
              <DoneRow key={c.id} checkpoint={c} onOpen={() => setSheet({ kind: "checkpoint", checkpoint: c })} />
            ) : (
              <LaterRow key={c.id} checkpoint={c} onOpen={() => setSheet({ kind: "checkpoint", checkpoint: c })} />
            )
          ))}
        </ul>

        {hiddenCount > 0 && (
          <button type="button" onClick={() => setShowAll(true)} className="min-h-[44px] pl-[34px] text-left text-xs font-bold text-ink-soft">
            + {hiddenCount} later checkpoint{hiddenCount === 1 ? "" : "s"}
          </button>
        )}
        {showAll && later.length > 1 && (
          <button type="button" onClick={() => setShowAll(false)} className="min-h-[44px] pl-[34px] text-left text-xs font-bold text-ink-soft">
            Show fewer
          </button>
        )}
      </section>

      {/* Actions */}
      <section className="card mt-3 p-4" aria-label="Actions">
        <h2 className="pb-1 text-[15px] font-extrabold">Weekly actions</h2>
        {g.goal_actions.length === 0 && <p className="py-1 text-sm text-ink-soft">No actions yet. Add what you&rsquo;ll do each week.</p>}
        <ul className="divide-y divide-line">
          {g.goal_actions.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => setSheet({ kind: "action", action: a })} className="flex min-h-[52px] w-full flex-col justify-center py-2 text-left">
                <span className="text-[15px] font-bold">{a.name}</span>
                <span className="text-xs text-ink-soft">{actionSummary(a)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSheet({ kind: "checkpoint" })} className="btn bg-white text-ink shadow-card">
          <Plus size={18} /> Add checkpoint
        </button>
        <button type="button" onClick={() => setSheet({ kind: "action" })} className="btn bg-white text-ink shadow-card">
          <Plus size={18} /> Add action
        </button>
      </div>

      {/* Sheets */}
      <Sheet open={sheet?.kind === "edit"} onClose={() => setSheet(null)} title="Edit goal">
        {sheet?.kind === "edit" && (
          <div className="space-y-5">
            <GoalForm initial={g} submitLabel="Save" onSave={(values) => act(() => updateGoal(g.id, values), "Saved")} />
            <div className="border-t border-line pt-4">
              <GoalStatusControls
                goal={g}
                onChanged={() => {
                  setSheet(null);
                  void load();
                }}
              />
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={sheet?.kind === "checkpoint"}
        onClose={() => setSheet(null)}
        title={sheet?.kind === "checkpoint" && sheet.checkpoint ? "Edit checkpoint" : "New checkpoint"}
      >
        {sheet?.kind === "checkpoint" && (
          <>
            <CheckpointForm
              checkpoint={sheet.checkpoint}
              onSave={(values) =>
                act(
                  () => (sheet.checkpoint ? updateCheckpoint(sheet.checkpoint, values) : createCheckpoint(g.id, values)),
                  sheet.checkpoint ? "Saved" : "Checkpoint added",
                )
              }
              onDelete={
                sheet.checkpoint
                  ? () => {
                      if (window.confirm(`Delete the checkpoint "${sheet.checkpoint!.title}"?`))
                        void act(() => deleteCheckpoint(sheet.checkpoint!), "Checkpoint deleted");
                    }
                  : undefined
              }
            />
            {sheet.checkpoint?.status === "done" && (
              <button
                type="button"
                onClick={() => act(() => setCheckpointReached(sheet.checkpoint!, false), "Marked not reached")}
                className="btn mt-2 w-full text-ink-soft"
              >
                Mark as not reached
              </button>
            )}
          </>
        )}
      </Sheet>

      <Sheet open={sheet?.kind === "action"} onClose={() => setSheet(null)} title={sheet?.kind === "action" && sheet.action ? "Edit action" : "New action"}>
        {sheet?.kind === "action" && (
          <ActionForm
            action={sheet.action}
            onSave={(values) =>
              act(
                () => (sheet.action ? updateAction(sheet.action.id, values) : createAction(g.id, values, g.goal_actions.length)),
                sheet.action ? "Saved" : "Action added",
              )
            }
            onDelete={
              sheet.action
                ? () => {
                    if (window.confirm(`Delete the action "${sheet.action!.name}"?`)) void act(() => deleteAction(sheet.action!.id), "Action deleted");
                  }
                : undefined
            }
          />
        )}
      </Sheet>

      <Sheet open={sheet?.kind === "reschedule"} onClose={() => setSheet(null)} title="Reschedule">
        {sheet?.kind === "reschedule" && (
          <RescheduleForm
            goal={g}
            checkpoint={sheet.checkpoint}
            onSave={(date) =>
              act(async () => {
                const days = await rescheduleCheckpoint(g, sheet.checkpoint, date);
                toast.show({ message: days ? `Moved ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ${days > 0 ? "later" : "earlier"}` : "No change" });
              })
            }
          />
        )}
      </Sheet>
    </div>
  );
}

function Circle({ state, colour }: { state: "done" | "active" | "later"; colour: string }) {
  if (state === "done")
    return (
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#0F7C74]" aria-hidden="true">
        <Check size={12} strokeWidth={3.5} className="text-white" />
      </span>
    );
  if (state === "active")
    return <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[3px] bg-white" style={{ borderColor: colour }} aria-hidden="true" />;
  return <span className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-[#D9C8B7]" aria-hidden="true" />;
}

function DoneRow({ checkpoint, onOpen }: { checkpoint: Checkpoint; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-[44px] w-full items-center gap-3 text-left">
        <Circle state="done" colour="" />
        <span className="flex-1 text-sm font-semibold text-ink-soft">
          {checkpoint.title}
          <span className="sr-only"> (reached)</span>
        </span>
        <span className="text-xs font-bold text-ink-soft">{monthDay(checkpoint.due_date)}</span>
      </button>
    </li>
  );
}

function LaterRow({ checkpoint, onOpen }: { checkpoint: Checkpoint; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-[44px] w-full items-center gap-3 text-left">
        <Circle state="later" colour="" />
        <span className="flex-1 text-sm font-semibold text-ink-soft">{checkpoint.title}</span>
        <span className="text-xs font-bold text-ink-soft">{monthDay(checkpoint.due_date)}</span>
      </button>
    </li>
  );
}

function ActiveRow({
  checkpoint,
  goal,
  previous,
  today,
  onOpen,
  onReached,
  onReschedule,
}: {
  checkpoint: Checkpoint;
  goal: GoalWithParts;
  previous?: Checkpoint;
  today: string;
  onOpen: () => void;
  onReached: () => void;
  onReschedule: () => void;
}) {
  // Progress = how much of the time up to the due date has passed.
  const from = previous?.due_date ?? goal.start_date ?? dateOfTimestamp(goal.created_at);
  const total = Math.max(1, daysBetween(from, checkpoint.due_date));
  const pct = Math.min(100, Math.max(0, Math.round((daysBetween(from, today) / total) * 100)));
  const left = daysBetween(today, checkpoint.due_date);

  return (
    <li className="-mx-1 my-1 rounded-2xl px-3 py-2.5" style={{ backgroundColor: `${goal.colour}1F` }}>
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 text-left">
        <Circle state="active" colour={goal.colour} />
        <span className="flex-1">
          <span className="block text-[15px] font-extrabold leading-snug">{checkpoint.title}</span>
          {checkpoint.how_youll_know && <span className="mt-0.5 block text-xs text-ink-soft">{checkpoint.how_youll_know}</span>}
        </span>
        <span className="text-right text-xs font-extrabold">
          {monthDay(checkpoint.due_date)}
          <span className="block font-semibold text-ink-soft">
            {left > 0 ? `${left} day${left === 1 ? "" : "s"} left` : left === 0 ? "Due today" : `${-left} day${left === -1 ? "" : "s"} over`}
          </span>
        </span>
      </button>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-label="Time used until the due date"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: goal.colour }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-h-[36px] text-left text-xs font-bold text-ink-soft">
          {checkpoint.best_result ? `Best so far: ${checkpoint.best_result}` : "+ Add best so far"}
        </button>
        <span className="flex gap-2">
          <button type="button" onClick={onReschedule} className="btn min-h-[36px] bg-white px-3 text-xs text-ink">
            Reschedule
          </button>
          <button type="button" onClick={onReached} className="btn min-h-[36px] bg-ink px-3 text-xs text-white">
            <Check size={14} /> Mark reached
          </button>
        </span>
      </div>
    </li>
  );
}

function RescheduleForm({ goal, checkpoint, onSave }: { goal: GoalWithParts; checkpoint: Checkpoint; onSave: (date: string) => void }) {
  const [date, setDate] = useState(checkpoint.due_date);
  const moving = useMemo(() => checkpointsToShift(goal.checkpoints, checkpoint), [goal, checkpoint]);
  const days = date ? daysBetween(checkpoint.due_date, date) : 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (date && days) onSave(date);
      }}
      className="space-y-3"
    >
      <p className="text-sm text-ink-soft">
        <span className="font-bold text-ink">{checkpoint.title}</span> is due {monthDay(checkpoint.due_date)}. Pick a new date and every later checkpoint moves
        by the same number of days.
      </p>
      <label className="label" htmlFor="resched-date">
        New date
      </label>
      <input id="resched-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
      {days !== 0 && (
        <div className="rounded-2xl bg-cream p-3 text-sm">
          <p className="font-bold">
            Moves {moving.length} checkpoint{moving.length === 1 ? "" : "s"} {Math.abs(days)} day{Math.abs(days) === 1 ? "" : "s"} {days > 0 ? "later" : "earlier"}:
          </p>
          <ul className="mt-1 space-y-0.5 text-ink-soft">
            {moving.map((c) => (
              <li key={c.id}>
                {c.title}: {monthDay(c.due_date)} → <span className="font-semibold text-ink">{monthDay(addDays(c.due_date, days))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="submit" className="btn w-full bg-ink text-white" disabled={!date || days === 0}>
        Reschedule
      </button>
    </form>
  );
}

