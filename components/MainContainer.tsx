"use client";

import { usePathname } from "next/navigation";

/** Centred page column; the To-Do screen gets the full width on desktop for its 7-day row. */
export function MainContainer({ children }: { children: React.ReactNode }) {
  const wide = usePathname() === "/";
  return (
    <main
      className={`mx-auto px-4 pb-[calc(152px+env(safe-area-inset-bottom))] ${
        wide ? "max-w-2xl lg:max-w-[1600px] lg:px-6" : "max-w-2xl"
      }`}
    >
      {children}
    </main>
  );
}
