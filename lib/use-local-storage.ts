"use client";

import { useCallback, useEffect, useState } from "react";

/** A boolean remembered in localStorage (per device). */
export function useStoredBoolean(key: string, initial: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(stored === "true");
    } catch {
      // Storage unavailable (private mode); keep the default.
    }
  }, [key]);

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // Ignore.
      }
    },
    [key],
  );

  return [value, update];
}
