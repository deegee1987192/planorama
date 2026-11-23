"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Inbox, Sparkles, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProviders";

/** Opens the Inbox (captured items waiting to be sorted), with a count badge. */
export function InboxButton() {
  const { inboxCount } = useApp();
  return (
    <Link
      href="/inbox"
      aria-label={inboxCount > 0 ? `Inbox, ${inboxCount} waiting` : "Inbox"}
      className="icon-btn relative bg-white text-ink-soft shadow-card"
    >
      <Inbox size={18} />
      {inboxCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-todo px-1 text-[10px] font-bold text-white">
          {inboxCount > 99 ? "99+" : inboxCount}
        </span>
      )}
    </Link>
  );
}

/** Placeholder for the v3 Ask button. */
export function AskSoonButton() {
  return (
    <button
      type="button"
      disabled
      title="Ask is coming soon"
      aria-label="Ask (coming soon)"
      className="btn cursor-default bg-white px-3 text-ink-faint/70 shadow-card disabled:opacity-60"
    >
      <Sparkles size={16} />
      <span className="hidden sm:inline">
        Ask <span className="text-[11px] font-semibold">soon</span>
      </span>
    </button>
  );
}

/** Screen title row used by every tab. */
export function PageHeader({
  title,
  colorClass,
  children,
}: {
  title: string;
  colorClass: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 pb-3 pt-5">
      <h1 className={`text-[28px] font-bold leading-tight tracking-tight ${colorClass}`}>{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** Pill-shaped segmented control. `activeClass` sets the selected colour. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  activeClass = "bg-white text-ink shadow-card",
  className = "",
  label,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  activeClass?: string;
  className?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex rounded-full bg-black/[0.05] p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[40px] flex-1 whitespace-nowrap rounded-full px-2 text-[13px] font-semibold transition sm:px-3 sm:text-sm ${
            value === o.value ? activeClass : "text-ink-soft"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet on phones, centred dialog on wider screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 shadow-xl sm:rounded-[28px] sm:pb-5">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-black/10 sm:hidden" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 text-ink-soft hover:bg-black/5" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-ink-faint">{icon}</div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card h-24 animate-pulse bg-white/70" />
      ))}
    </div>
  );
}
