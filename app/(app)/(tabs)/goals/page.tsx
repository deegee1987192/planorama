"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronRight, Pause, Target } from "lucide-react";
import { useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, LoadingCards, PageHeader } from "@/components/ui";
import { tierLabel } from "@/components/goals/GoalForms";
import { activeCheckpoint, listGoals } from "@/lib/data/goals";
import { monthDay } from "@/lib/dates";
import type { GoalWithParts } from "@/lib/types";

export default function GoalsPage() {
  const toast = useToast();
  const [goals, setGoals] = useState<GoalWithParts[] | null>(null);

  const load = useCallback(async () => {
    try {
      setGoals((await listGoals()).filter((g) => g.status !== "archived"));
    } catch (e) {
      toast.error("Couldn't load goals", e);
    }
  }, [toast]);

  useSyncedLoad(load, [load]);

  return (
    <>
      <PageHeader title="Goals" colorClass="text-goals-text">
        <Link href="/goals/edit" className="btn bg-white px-4 text-ink shadow-card">
          Edit goals
        </Link>
      </PageHeader>

      {goals === null ? (
        <LoadingCards count={4} />
      ) : goals.length === 0 ? (
        <EmptyState icon={<Target size={32} />} title="No goals yet" hint='Tap "Edit goals" to add one.' />
      ) : (
        <ul className="space-y-2.5">
          {goals.map((g) => (
            <li key={g.id}>
              <GoalCard goal={g} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 px-1 text-center text-xs text-ink-faint">Weekly score, heat map and timers arrive in the next update.</p>
    </>
  );
}

function GoalCard({ goal }: { goal: GoalWithParts }) {
  const paused = goal.status === "paused";
  const next = activeCheckpoint(goal.checkpoints);
  const reached = goal.checkpoints.filter((c) => c.status === "done").length;

  return (
    <Link href={`/goals/${goal.id}`} className={`card flex items-stretch gap-3 overflow-hidden p-0 ${paused ? "opacity-70" : ""}`}>
      <span className="w-2 shrink-0" style={{ backgroundColor: goal.colour }} aria-hidden="true" />
      <span className="min-w-0 flex-1 py-3">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[16px] font-extrabold leading-snug">{goal.name}</span>
          <span className="text-xs font-semibold text-ink-soft">{tierLabel(goal.tier)}</span>
        </span>
        {goal.result && <span className="mt-0.5 block text-[13px] text-ink-soft">{goal.result}</span>}
        <span className="mt-1.5 block text-[13px] font-semibold">
          {paused ? (
            <span className="inline-flex items-center gap-1 text-ink-soft">
              <Pause size={13} /> Paused{goal.paused_until ? ` until ${monthDay(goal.paused_until)}` : ""}
            </span>
          ) : next ? (
            <>
              <span style={{ color: goal.colour }}>Next:</span> {next.title} · {monthDay(next.due_date)}
            </>
          ) : goal.checkpoints.length ? (
            <span className="text-ink-soft">All {goal.checkpoints.length} checkpoints reached</span>
          ) : (
            <span className="text-ink-soft">Habit · no checkpoints</span>
          )}
        </span>
        {goal.checkpoints.length > 0 && !paused && (
          <span className="mt-0.5 block text-xs text-ink-faint">
            {reached} of {goal.checkpoints.length} checkpoints reached
          </span>
        )}
      </span>
      <ChevronRight size={18} className="mr-3 self-center text-ink-faint" aria-hidden="true" />
    </Link>
  );
}
