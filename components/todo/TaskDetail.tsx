"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CalendarArrowUp, Plus, Trash2, X } from "lucide-react";
import { useApp, useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { LoadingCards, Segmented } from "@/components/ui";
import {
  addSubtask,
  deleteSubtask,
  deleteTask,
  getTask,
  moveTaskToTomorrow,
  setTaskDone,
  updateSubtask,
  updateTask,
} from "@/lib/data/tasks";
import type { Priority, Repeat, Subtask, Task, TaskWithSubtasks } from "@/lib/types";
import { DeadlineChip } from "./TaskTags";

export function TaskDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { today } = useApp();
  const [task, setTask] = useState<TaskWithSubtasks | null | undefined>(undefined);
  const [newSub, setNewSub] = useState("");

  const load = useCallback(async () => {
    try {
      setTask(await getTask(id));
    } catch (e) {
      toast.error("Couldn't load task", e);
    }
  }, [id, toast]);

  useSyncedLoad(load, [load]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  async function save(patch: Partial<Task>) {
    if (!task) return;
    setTask({ ...task, ...patch });
    try {
      await updateTask(task.id, patch);
    } catch (e) {
      toast.error("Couldn't save", e);
      void load();
    }
  }

  async function toggleDone() {
    if (!task) return;
    const done = !task.done;
    try {
      await setTaskDone(task, done);
      if (done) {
        toast.show({
          message: task.repeat !== "none" ? "Done. Next one scheduled." : "Marked done",
        });
        goBack();
      } else {
        setTask({ ...task, done, done_at: null });
      }
    } catch (e) {
      toast.error("Couldn't update task", e);
    }
  }

  async function tomorrow() {
    if (!task) return;
    try {
      await moveTaskToTomorrow(task.id);
      toast.show({ message: "Moved to tomorrow" });
      goBack();
    } catch (e) {
      toast.error("Couldn't move task", e);
    }
  }

  async function remove() {
    if (!task || !window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      toast.show({ message: "Task deleted" });
      goBack();
    } catch (e) {
      toast.error("Couldn't delete task", e);
    }
  }

  async function addSub(e: React.FormEvent) {
    e.preventDefault();
    const title = newSub.trim();
    if (!task || !title) return;
    setNewSub("");
    try {
      const last = task.subtasks[task.subtasks.length - 1];
      const sub = await addSubtask(task.id, title, last ? Number(last.sort_order) + 1 : 0);
      setTask((t) => (t ? { ...t, subtasks: [...t.subtasks, sub] } : t));
    } catch (err) {
      toast.error("Couldn't add subtask", err);
    }
  }

  async function toggleSub(sub: Subtask) {
    setTask((t) => (t ? { ...t, subtasks: t.subtasks.map((s) => (s.id === sub.id ? { ...s, done: !s.done } : s)) } : t));
    try {
      await updateSubtask(sub.id, { done: !sub.done });
    } catch (e) {
      toast.error("Couldn't update subtask", e);
      void load();
    }
  }

  async function removeSub(sub: Subtask) {
    setTask((t) => (t ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== sub.id) } : t));
    try {
      await deleteSubtask(sub.id);
    } catch (e) {
      toast.error("Couldn't delete subtask", e);
      void load();
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-2 py-3">
        <button type="button" onClick={goBack} className="icon-btn -ml-2 text-ink hover:bg-black/5" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <span className="font-display text-lg font-semibold text-todo-text">Task</span>
      </header>

      {task === undefined && <LoadingCards count={3} />}

      {task === null && (
        <div className="card p-6 text-center">
          <p className="font-display text-lg font-semibold">This task no longer exists.</p>
          <button type="button" className="btn mt-4 bg-todo text-white" onClick={() => router.push("/")}>
            Back to To-Do
          </button>
        </div>
      )}

      {task && (
        <div className="space-y-3">
          <div className="card p-4">
            <TitleField
              key={task.id}
              initial={task.title}
              done={task.done}
              onSave={(title) => title !== task.title && save({ title })}
            />
            {task.deadline && (
              <div className="mt-2">
                <DeadlineChip deadline={task.deadline} today={today} done={task.done} />
              </div>
            )}
          </div>

          <div className="card space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
              <DateField label="Do on" value={task.do_on} onChange={(do_on) => save({ do_on, carried_over: false })} />
              <div>
                <label className="label" htmlFor="time">
                  Time
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="time"
                    type="time"
                    className="field"
                    value={task.time?.slice(0, 5) ?? ""}
                    onChange={(e) => save({ time: e.target.value || null })}
                  />
                  {task.time && <ClearButton label="Clear time" onClick={() => save({ time: null })} />}
                </div>
              </div>
            </div>
            <DateField label="Deadline" value={task.deadline} onChange={(deadline) => save({ deadline })} />

            <div>
              <span className="label">Priority</span>
              <Segmented<Priority>
                label="Priority"
                options={[
                  { value: "low", label: "Low" },
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                ]}
                value={task.priority}
                onChange={(priority) => save({ priority })}
                activeClass="bg-todo text-white shadow-card"
              />
            </div>

            <div>
              <span className="label">Repeats</span>
              <Segmented<Repeat>
                label="Repeats"
                options={[
                  { value: "none", label: "Never" },
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
                value={task.repeat}
                onChange={(repeat) => save({ repeat })}
                activeClass="bg-todo text-white shadow-card"
              />
            </div>
          </div>

          <div className="card p-4">
            <span className="label">
              Subtasks
              {task.subtasks.length > 0 &&
                ` · ${task.subtasks.filter((s) => s.done).length} of ${task.subtasks.length}`}
            </span>
            <ul>
              {task.subtasks.map((s) => (
                <li key={s.id} className="flex items-center">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={s.done}
                    aria-label={`Mark "${s.title}" done`}
                    onClick={() => toggleSub(s)}
                    className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        s.done ? "border-todo bg-todo text-white" : "border-ink-faint/60"
                      }`}
                    >
                      {s.done && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                  <span className={`flex-1 text-[15px] ${s.done ? "text-ink-faint line-through" : ""}`}>{s.title}</span>
                  <button
                    type="button"
                    onClick={() => removeSub(s)}
                    aria-label={`Delete "${s.title}"`}
                    className="icon-btn -mr-2 text-ink-faint hover:bg-black/5"
                  >
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={addSub} className="mt-1 flex gap-2">
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                placeholder="Add a subtask"
                enterKeyHint="done"
                className="field"
              />
              <button type="submit" className="icon-btn bg-todo-soft text-todo-text" aria-label="Add subtask">
                <Plus size={20} />
              </button>
            </form>
          </div>

          <div className="card p-4">
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <NotesField key={task.id} initial={task.notes} onSave={(notes) => notes !== task.notes && save({ notes })} />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={toggleDone} className="btn col-span-2 bg-todo text-white">
              <Check size={18} /> {task.done ? "Mark not done" : "Mark done"}
            </button>
            <button type="button" onClick={tomorrow} className="btn bg-white text-ink shadow-card">
              <CalendarArrowUp size={18} /> Move to tomorrow
            </button>
            <button type="button" onClick={remove} className="btn bg-white text-danger-text shadow-card">
              <Trash2 size={18} /> Delete
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function TitleField({ initial, done, onSave }: { initial: string; done: boolean; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const v = value.trim();
        if (v) onSave(v);
        else setValue(initial);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      rows={1}
      aria-label="Title"
      className={`w-full resize-none bg-transparent font-display text-2xl font-bold leading-tight outline-none [field-sizing:content] ${
        done ? "text-ink-faint line-through" : ""
      }`}
    />
  );
}

function NotesField({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <textarea
      id="notes"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      rows={4}
      placeholder="Add notes"
      className="field min-h-[110px] resize-y"
    />
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="date"
          className="field"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
        {value && <ClearButton label={`Clear ${label.toLowerCase()}`} onClick={() => onChange(null)} />}
      </div>
    </div>
  );
}

function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="icon-btn text-ink-faint hover:bg-black/5">
      <X size={18} />
    </button>
  );
}
