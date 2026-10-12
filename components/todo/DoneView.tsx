"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useApp, useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, LoadingCards } from "@/components/ui";
import { addDays, dateOfTimestamp, relativeDayLabel } from "@/lib/dates";
import { DONE_KEEP_DAYS, listDoneTasks, setTaskDone, updateTask } from "@/lib/data/tasks";
import type { TaskSummary } from "@/lib/types";
import { TaskCheckbox } from "./TaskCheckbox";

/** Finished tasks from the last 7 days. Untick one to bring it back. */
export function DoneView() {
  const { today } = useApp();
  const toast = useToast();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);

  const load = useCallback(async () => {
    try {
      setTasks(await listDoneTasks());
    } catch (e) {
      toast.error("Couldn't load finished tasks", e);
    }
  }, [toast]);

  useSyncedLoad(load, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, TaskSummary[]>();
    for (const t of tasks ?? []) {
      const d = t.done_at ? dateOfTimestamp(t.done_at) : today;
      map.set(d, [...(map.get(d) ?? []), t]);
    }
    return [...map.entries()];
  }, [tasks, today]);

  async function restore(task: TaskSummary) {
    setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? null);
    try {
      await setTaskDone(task, false);
      // Bring it back onto today if its day has passed.
      if (!task.do_on || task.do_on < today) await updateTask(task.id, { do_on: today, carried_over: Boolean(task.do_on) });
      toast.show({ message: "Moved back to To-Do" });
    } catch (e) {
      toast.error("Couldn't restore task", e);
      void load();
    }
  }

  if (tasks === null) return <LoadingCards />;

  return (
    <>
      <p className="mb-3 px-1 text-sm text-ink-soft">
        Finished tasks stay here for {DONE_KEEP_DAYS} days, then they&apos;re deleted automatically. Untick one to bring it back.
      </p>
      {!tasks.length ? (
        <EmptyState icon={<CheckCircle2 size={32} />} title="Nothing finished yet" hint="Crossed-off tasks land here." />
      ) : (
        <div className="space-y-4">
          {groups.map(([date, list]) => {
            const daysLeft = Math.max(0, DONE_KEEP_DAYS - Math.round((Date.parse(today) - Date.parse(date)) / 86400000));
            return (
              <section key={date}>
                <h2 className="mb-2 flex items-baseline justify-between px-1">
                  <span className="text-sm font-bold uppercase tracking-wide text-ink-soft">
                    {relativeDayLabel(date, today)}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {daysLeft <= 1 ? "Deleted tomorrow" : `Deleted on ${relativeDayLabel(addDays(date, DONE_KEEP_DAYS), today)}`}
                  </span>
                </h2>
                <ul className="card divide-y divide-line px-2">
                  {list.map((t) => (
                    <li key={t.id} className="flex items-start">
                      <TaskCheckbox checked onChange={() => restore(t)} label={`Bring back "${t.title}"`} />
                      <button
                        type="button"
                        onClick={() => router.push(`/task/${t.id}`)}
                        className="min-h-[44px] min-w-0 flex-1 py-2.5 text-left text-[15px] text-ink-faint line-through"
                      >
                        {t.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
