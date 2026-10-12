"use client";

import { useRef } from "react";
import { Check } from "lucide-react";

const LONG_PRESS_MS = 450;

/**
 * Round checkbox with a 44px touch target.
 * Tap = done / not done. Long-press (or right-click) = partly done, when `onPartial` is given.
 */
export function TaskCheckbox({
  checked,
  partial = false,
  onChange,
  onPartial,
  label,
}: {
  checked: boolean;
  partial?: boolean;
  onChange: () => void;
  onPartial?: () => void;
  label: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const longPressed = useRef(false);

  const startPress = () => {
    if (!onPartial) return;
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(15);
      onPartial();
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => clearTimeout(timer.current);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked ? true : partial ? "mixed" : false}
      aria-label={onPartial ? `${label}. Press and hold for partly done.` : label}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => {
        if (!onPartial) return;
        e.preventDefault();
        cancelPress();
        if (!longPressed.current) {
          longPressed.current = true;
          onPartial();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onChange();
      }}
      className="flex h-11 w-11 shrink-0 select-none items-center justify-center [-webkit-touch-callout:none] lg:w-8"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
          checked
            ? "border-todo bg-todo text-white"
            : partial
              ? "border-partial bg-[linear-gradient(90deg,#C08A1E_50%,#fff_50%)]"
              : "border-ink-faint/60 bg-white"
        }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}
