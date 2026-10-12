"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { runDailyRules } from "@/lib/daily-rules";
import { countInbox } from "@/lib/data/inbox";
import { todayISO } from "@/lib/dates";
import { ToastProvider } from "./ToastProvider";

interface AppState {
  /** True once the daily rules have run; screens wait for this before loading tasks. */
  ready: boolean;
  /** Bumps whenever data should be re-fetched (app load, app back in foreground). */
  syncTick: number;
  today: string;
  inboxCount: number;
  refreshInbox: () => void;
  /** Re-fetch the current screen and the inbox count (e.g. after the capture bar files something). */
  refreshData: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProviders");
  return ctx;
}

/** Re-runs `load` on first ready and every time the app syncs. */
export function useSyncedLoad(load: () => void | Promise<void>, deps: unknown[] = []) {
  const { ready, syncTick } = useApp();
  useEffect(() => {
    if (ready) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, syncTick, ...deps]);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const [today, setToday] = useState(todayISO);
  const [inboxCount, setInboxCount] = useState(0);
  const lastSync = useRef(0);

  const refreshInbox = useCallback(() => {
    countInbox()
      .then(setInboxCount)
      .catch((e) => console.error("Inbox count failed", e));
  }, []);

  const sync = useCallback(async () => {
    const now = Date.now();
    if (now - lastSync.current < 2000) return;
    lastSync.current = now;
    try {
      await runDailyRules();
    } catch (e) {
      console.error("Daily rules failed", e);
    }
    setToday(todayISO());
    setReady(true);
    setSyncTick((t) => t + 1);
    refreshInbox();
  }, [refreshInbox]);

  const refreshData = useCallback(() => {
    setSyncTick((t) => t + 1);
    refreshInbox();
  }, [refreshInbox]);

  useEffect(() => {
    void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [sync]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <AppContext.Provider value={{ ready, syncTick, today, inboxCount, refreshInbox, refreshData }}>
      <ToastProvider>{children}</ToastProvider>
    </AppContext.Provider>
  );
}
