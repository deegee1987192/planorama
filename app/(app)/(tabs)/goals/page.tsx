import { Target } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { GOAL_COLOURS } from "@/lib/goal-colours";

export default function GoalsPage() {
  return (
    <>
      <PageHeader title="Goals" colorClass="text-goals-text" />
      <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
        <Target size={32} className="text-goals-text" />
        <p className="font-display text-lg font-bold">Your 2027 goals live here</p>
        <p className="text-sm text-ink-soft">Goals, checkpoints and timers are coming in the next updates.</p>
        <ul className="mt-2 flex flex-wrap justify-center gap-2" aria-label="Goal colours">
          {GOAL_COLOURS.map((c) => (
            <li key={c.hex} title={c.name} className="h-6 w-6 rounded-full" style={{ backgroundColor: c.hex }} />
          ))}
        </ul>
      </div>
    </>
  );
}
