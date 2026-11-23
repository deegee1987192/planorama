"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ListChecks, NotebookPen, Target, UtensilsCrossed } from "lucide-react";

const TABS = [
  { href: "/", label: "Today", Icon: CalendarCheck, active: "text-todo-text", dot: "bg-todo", match: ["/"] },
  { href: "/goals", label: "Goals", Icon: Target, active: "text-goals-text", dot: "bg-goals", match: ["/goals"] },
  // Lists covers the existing To Buy and Research screens until they're combined (Session 6).
  { href: "/lists", label: "Lists", Icon: ListChecks, active: "text-buy", dot: "bg-buy", match: ["/lists", "/buy", "/research"] },
  { href: "/notes", label: "Notes", Icon: NotebookPen, active: "text-notes", dot: "bg-notes", match: ["/notes"] },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-line bg-white/95 backdrop-blur pb-safe">
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map(({ href, label, Icon, active, dot, match }) => {
          const isActive = match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
                  isActive ? active : "text-ink-faint"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                {label}
                {isActive && <span className={`absolute top-0 h-[3px] w-8 rounded-b-full ${dot}`} />}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <span
            aria-disabled="true"
            title="Food is coming soon"
            className="flex min-h-[56px] cursor-default flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-ink-faint/50"
          >
            <UtensilsCrossed size={22} strokeWidth={1.75} />
            Food <span className="sr-only">(coming soon)</span>
          </span>
        </li>
      </ul>
    </nav>
  );
}
