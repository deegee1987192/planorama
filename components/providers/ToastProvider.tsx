"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "error";
}

interface ToastApi {
  show: (opts: ToastOptions) => void;
  error: (message: string, err?: unknown) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pathname = usePathname();
  // Main tab screens have the capture bar + tab bar at the bottom; sit above them.
  const hasBars = !pathname.startsWith("/task/");

  const show = useCallback((opts: ToastOptions) => {
    clearTimeout(timer.current);
    setToast({ ...opts, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), opts.actionLabel ? 5000 : 3000);
  }, []);

  const error = useCallback(
    (message: string, err?: unknown) => {
      if (err) console.error(message, err);
      show({ message, tone: "error" });
    },
    [show],
  );

  return (
    <ToastContext.Provider value={{ show, error }}>
      {children}
      {toast && (
        <div
          className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${
            hasBars ? "bottom-[calc(144px+env(safe-area-inset-bottom))]" : "bottom-[calc(24px+env(safe-area-inset-bottom))]"
          }`}
        >
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex min-h-[48px] w-full max-w-md items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-lg ${
              toast.tone === "error" ? "bg-danger" : "bg-ink"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                className="min-h-[44px] rounded-full px-3 font-semibold text-[#FFB59E]"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
