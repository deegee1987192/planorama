import { Check } from "lucide-react";

/** Round checkbox with a 44px touch target. */
export function TaskCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
          checked ? "border-todo bg-todo text-white" : "border-ink-faint/60 bg-white"
        }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}
