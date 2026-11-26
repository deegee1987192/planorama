"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, GripVertical, Pause, Plus } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { LoadingCards, Sheet } from "@/components/ui";
import { ColourChoice, GoalForm, tierLabel } from "@/components/goals/GoalForms";
import { GoalStatusControls } from "@/components/goals/GoalStatusControls";
import { createGoal, listGoals, reorderGoals, updateGoal } from "@/lib/data/goals";
import { monthDay } from "@/lib/dates";
import type { GoalWithParts } from "@/lib/types";

type SheetState = { kind: "new" } | { kind: "edit"; goal: GoalWithParts } | { kind: "colour"; goal: GoalWithParts } | null;

/** Edit goals: new goal, change fields, drag to reorder, tap a dot to recolour, pause, archive. */
export default function EditGoalsPage() {
  const toast = useToast();
  const router = useRouter();
  const [goals, setGoals] = useState<GoalWithParts[] | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    try {
      setGoals(await listGoals());
    } catch (e) {
      toast.error("Couldn't load goals", e);
    }
  }, [toast]);

  useSyncedLoad(load, [load]);

  const current = (goals ?? []).filter((g) => g.status !== "archived");
  const archived = (goals ?? []).filter((g) => g.status === "archived");

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = current.findIndex((g) => g.id === active.id);
    const to = current.findIndex((g) => g.id === over.id);
    const ordered = arrayMove(current, from, to);
    setGoals([...ordered.map((g, i) => ({ ...g, sort_order: i })), ...archived]);
    try {
      await reorderGoals(ordered.map((g) => g.id));
    } catch (e) {
      toast.error("Couldn't save the new order", e);
      void load();
    }
  }

  async function save(work: () => Promise<unknown>, message: string) {
    setSheet(null);
    try {
      await work();
      toast.show({ message });
    } catch (e) {
      toast.error("Couldn't save", e);
    }
    void load();
  }

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Link href="/goals" className="-ml-1 inline-flex min-h-[44px] items-center gap-1 pt-3 text-sm font-extrabold text-ink-soft">
        <ChevronLeft size={18} /> Goals
      </Link>
      <header className="flex items-center justify-between gap-3 pb-3">
        <h1 className="text-[26px] font-extrabold">Edit goals</h1>
        <button type="button" onClick={() => setSheet({ kind: "new" })} className="btn bg-ink px-4 text-white">
          <Plus size={18} /> New goal
        </button>
      </header>

      {goals === null ? (
        <LoadingCards count={4} />
      ) : (
        <>
          <p className="mb-2 px-1 text-xs text-ink-soft">Drag the dotted handle to reorder. Tap a colour dot to recolour, or a goal to edit it.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={current.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {current.map((g) => (
                  <SortableGoal
                    key={g.id}
                    goal={g}
                    onEdit={() => setSheet({ kind: "edit", goal: g })}
                    onColour={() => setSheet({ kind: "colour", goal: g })}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {archived.length > 0 && (
            <section className="mt-6">
              <h2 className="px-1 pb-2 text-[15px] font-extrabold text-ink-soft">Archived</h2>
              <ul className="space-y-2">
                {archived.map((g) => (
                  <li key={g.id} className="card flex items-center gap-3 p-3 opacity-80">
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: g.colour }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 font-bold">{g.name}</span>
                    <button type="button" onClick={() => setSheet({ kind: "edit", goal: g })} className="btn min-h-[40px] bg-white px-3 text-ink shadow-card">
                      Unarchive…
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Sheet open={sheet?.kind === "new"} onClose={() => setSheet(null)} title="New goal">
        {sheet?.kind === "new" && (
          <GoalForm
            submitLabel="Create goal, then add checkpoints"
            onSave={async (values) => {
              setSheet(null);
              try {
                const goal = await createGoal(values, current.length);
                toast.show({ message: "Goal created. Now add its actions and checkpoints." });
                router.push(`/goals/${goal.id}`);
              } catch (e) {
                toast.error("Couldn't create the goal", e);
              }
            }}
          />
        )}
      </Sheet>

      <Sheet open={sheet?.kind === "edit"} onClose={() => setSheet(null)} title={sheet?.kind === "edit" ? sheet.goal.name : "Edit goal"}>
        {sheet?.kind === "edit" && (
          <div className="space-y-5">
            {sheet.goal.status !== "archived" && (
              <GoalForm initial={sheet.goal} submitLabel="Save" onSave={(values) => save(() => updateGoal(sheet.goal.id, values), "Saved")} />
            )}
            <Link href={`/goals/${sheet.goal.id}`} className="btn w-full bg-cream text-ink">
              Open checkpoints and actions
            </Link>
            <div className="border-t border-line pt-4">
              <GoalStatusControls
                goal={sheet.goal}
                onChanged={() => {
                  setSheet(null);
                  void load();
                }}
              />
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={sheet?.kind === "colour"} onClose={() => setSheet(null)} title="Colour">
        {sheet?.kind === "colour" && (
          <ColourChoice value={sheet.goal.colour} onChange={(hex) => save(() => updateGoal(sheet.goal.id, { colour: hex }), "Colour changed")} />
        )}
      </Sheet>
    </div>
  );
}

function SortableGoal({ goal, onEdit, onColour }: { goal: GoalWithParts; onEdit: () => void; onColour: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`card flex items-center gap-1 py-1 pl-1 pr-2 ${isDragging ? "relative z-10 shadow-xl" : ""}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${goal.name}`}
        className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-ink-faint"
      >
        <GripVertical size={18} />
      </button>
      <button type="button" onClick={onColour} aria-label={`Change colour of ${goal.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center">
        <span className="h-6 w-6 rounded-full" style={{ backgroundColor: goal.colour }} />
      </button>
      <button type="button" onClick={onEdit} className="min-h-[52px] min-w-0 flex-1 py-1.5 text-left">
        <span className="block truncate font-extrabold">{goal.name}</span>
        <span className="flex items-center gap-1 text-xs text-ink-soft">
          {tierLabel(goal.tier)}
          {goal.status === "paused" && (
            <>
              {" · "}
              <Pause size={11} /> until {goal.paused_until ? monthDay(goal.paused_until) : "?"}
            </>
          )}
        </span>
      </button>
    </li>
  );
}
