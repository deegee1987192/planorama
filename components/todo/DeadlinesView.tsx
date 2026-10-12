"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Flag } from "lucide-react";
import { useApp, useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, LoadingCards, Sheet } from "@/components/ui";
import { addDays, dayLabel, relativeDayLabel } from "@/lib/dates";
import { listDeadlineTasks, moveTaskTo, setTaskDone } from "@/lib/data/tasks";
import type { TaskSummary } from "@/lib/types";
import { TaskCheckbox } from "./TaskCheckbox";
import { DeadlineChip, TaskTags } from "./TaskTags";

export function DeadlinesView() {
  const { today } = useApp();
  const toast = useToast();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [picking, setPicking] = useState<TaskSummary | null>(null);

  const load = useCallback(async () => {
    try {
      setTasks(await listDeadlineTasks());
    } catch (e) {
      toast.error("Couldn't load deadlines", e);
    }
  }, [toast]);

  useSyncedLoad(load, [load]);

  const groups = useMemo(() => {
    const result: { key: string; title: string; danger: boolean; tasks: TaskSummary[] }[] = [];
    const push = (key: string, title: string, danger: boolean, t: TaskSummary) => {
      let g = result.find((x) => x.key === key);
      if (!g) {
        g = { key, title, danger, tasks: [] };
        result.push(g);
      }
      g.tasks.push(t);
    };
    for (const t of tasks ?? []) {
      const d = t.deadline!;
      if (d < today) push("overdue", "Overdue", true, t);
      else if (d === today) push("today", "Due today", true, t);
      else push(d, `Due ${dayLabel(d)}`, false, t);
    }
    return result;
  }, [tasks, today]);

  async function complete(task: TaskSummary) {
    setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? null);
    try {
      await setTaskDone(task, true);
      toast.show({
        message: "Marked done",
        actionLabel: "Undo",
        onAction: async () => {
          await setTaskDone(task, false).catch((e) => toast.error("Couldn't undo", e));
          void load();
        },
      });
      void load();
    } catch (e) {
      toast.error("Couldn't update task", e);
      void load();
    }
  }

  async function pickDay(task: TaskSummary, date: string) {
    setPicking(null);
    try {
      await moveTaskTo(task.id, date);
      void load();
    } catch (e) {
      toast.error("Couldn't set the day", e);
    }
  }

  if (tasks === null) return <LoadingCards />;
  if (!tasks.length)
    return <EmptyState icon={<Flag size={32} />} title="No deadlines" hint="Tasks with a deadline show up here." />;

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className={`mb-2 px-1 text-sm font-bold uppercase tracking-wide ${g.danger ? "text-danger-text" : "text-ink-soft"}`}>
            {g.title}
          </h2>
          <ul className="card divide-y divide-line px-2">
            {g.tasks.map((t) => (
              <li key={t.id} className="flex items-start py-1">
                <TaskCheckbox checked={false} onChange={() => complete(t)} label={`Mark "${t.title}" done`} />
                <div className="min-w-0 flex-1 py-1.5">
                  <button type="button" onClick={() => router.push(`/task/${t.id}`)} className="block min-h-[32px] w-full text-left">
                    <span className="block text-[15px] leading-snug">{t.title}</span>
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <DeadlineChip deadline={t.deadline!} today={today} />
                    {t.do_on ? (
                      <span className="inline-flex items-center rounded-full bg-todo-soft px-2 py-0.5 text-xs font-semibold text-todo-text">
                        Do on {relativeDayLabel(t.do_on, today)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPicking(t)}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-todo px-3 text-xs font-bold text-white"
                      >
                        <CalendarPlus size={14} /> Pick a day
                      </button>
                    )}
                  </div>
                  <TaskTags task={t} today={today} hideDeadline />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Sheet open={picking !== null} onClose={() => setPicking(null)} title="Pick a day">
        {picking && <DayPicker today={today} deadline={picking.deadline} onPick={(d) => pickDay(picking, d)} />}
      </Sheet>
    </div>
  );
}

export function DayPicker({
  today,
  deadline,
  onPick,
}: {
  today: string;
  deadline?: string | null;
  onPick: (date: string) => void;
}) {
  const [custom, setCustom] = useState(today);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn bg-todo-soft text-todo-text" onClick={() => onPick(today)}>
          Today
        </button>
        <button type="button" className="btn bg-todo-soft text-todo-text" onClick={() => onPick(addDays(today, 1))}>
          Tomorrow
        </button>
      </div>
      {deadline && deadline > addDays(today, 1) && (
        <button type="button" className="btn w-full bg-danger-soft text-danger-text" onClick={() => onPick(deadline)}>
          On the deadline ({dayLabel(deadline)})
        </button>
      )}
      <div className="flex gap-2">
        <input type="date" value={custom} onChange={(e) => setCustom(e.target.value)} className="field" aria-label="Choose a date" />
        <button type="button" className="btn bg-todo text-white" onClick={() => custom && onPick(custom)}>
          Set
        </button>
      </div>
    </div>
  );
}
