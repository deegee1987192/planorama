"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [error, setError] = useState(params.get("error") ? "That link didn't work or has expired. Send a new one." : "");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("sending");
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Only existing accounts can sign in; new sign-ups are refused.
        shouldCreateUser: false,
      },
    });
    if (error) {
      setStatus("idle");
      setError(
        error.message.toLowerCase().includes("signups not allowed")
          ? "That email doesn't have an account."
          : error.message,
      );
    } else {
      setStatus("sent");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("verifying");
    const { error } = await getSupabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setStatus("sent");
      setError(error.message);
    } else {
      window.location.assign("/");
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-todo text-white shadow-card">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-todo-text">Planorama</h1>
        <p className="mt-2 text-ink-soft">Your lists, your week, all in one place.</p>
      </div>

      <div className="card p-6">
        {status === "sent" || status === "verifying" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 shrink-0 text-todo" size={22} />
              <div>
                <p className="font-display text-lg font-semibold">Check your email</p>
                <p className="text-sm text-ink-soft">
                  We sent a sign-in link to <strong>{email}</strong>. Open it on this device.
                </p>
              </div>
            </div>
            <form onSubmit={verifyCode} className="space-y-2 border-t border-line pt-4">
              <label htmlFor="code" className="label">
                Or enter the code from the email
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="field tracking-widest"
                />
                <button type="submit" className="btn bg-todo text-white" disabled={!code.trim() || status === "verifying"}>
                  Sign in
                </button>
              </div>
            </form>
            <button type="button" className="btn w-full text-ink-soft" onClick={() => setStatus("idle")}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-3">
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field"
            />
            <button type="submit" className="btn w-full bg-todo text-white" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
        {error && <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-text">{error}</p>}
      </div>
    </main>
  );
}
