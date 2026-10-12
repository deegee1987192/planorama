"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, ListTodo, NotebookPen, ShoppingBasket, Telescope } from "lucide-react";
import { useApp } from "@/components/providers/AppProviders";

const TABS = [
  { href: "/", label: "To-Do", Icon: ListTodo, active: "text-todo-text", dot: "bg-todo" },
  { href: "/buy", label: "To Buy", Icon: ShoppingBasket, active: "text-buy", dot: "bg-buy" },
  { href: "/research", label: "Research", Icon: Telescope, active: "text-research", dot: "bg-research" },
  { href: "/notes", label: "Notes", Icon: NotebookPen, active: "text-notes", dot: "bg-notes" },
  { href: "/inbox", label: "Inbox", Icon: Inbox, active: "text-inbox", dot: "bg-inbox" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const { inboxCount } = useApp();

  return (
    <nav className="border-t border-line bg-white/95 backdrop-blur pb-safe">
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map(({ href, label, Icon, active, dot }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  isActive ? active : "text-ink-faint"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                  {href === "/inbox" && inboxCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-todo px-1 text-[10px] font-bold text-white">
                      {inboxCount > 99 ? "99+" : inboxCount}
                    </span>
                  )}
                </span>
                {label}
                {isActive && <span className={`absolute top-0 h-[3px] w-8 rounded-b-full ${dot}`} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
