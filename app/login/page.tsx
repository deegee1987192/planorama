"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Segmented } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

type Method = "password" | "link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState(params.get("error") ? "That link didn't work or has expired. Try your password, or send a new link." : "");

  function friendly(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("rate limit")) return "Too many emails were sent. Wait about an hour, or sign in with your password.";
    if (m.includes("signups not allowed")) return "That email doesn't have an account.";
    if (m.includes("invalid login credentials")) return "Wrong email or password. If you haven't set a password yet, use an email link, then set one under Account.";
    return message;
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("busy");
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setStatus("idle");
      setError(friendly(error.message));
    } else {
      window.location.assign("/");
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("busy");
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
      setError(friendly(error.message));
    } else {
      setStatus("sent");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await getSupabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) setError(friendly(error.message));
    else window.location.assign("/");
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-todo text-cream shadow-card">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-todo-text">Planorama</h1>
        <p className="mt-2 text-ink-soft">Your lists, your week, all in one place.</p>
      </div>

      <div className="card p-6">
        {status === "sent" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 shrink-0 text-todo" size={22} />
              <div>
                <p className="font-display text-lg font-semibold">Check your email</p>
                <p className="text-sm text-ink-soft">
                  We sent a sign-in link to <strong>{email}</strong>.
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
                <button type="submit" className="btn bg-todo text-white" disabled={!code.trim()}>
                  Sign in
                </button>
              </div>
            </form>
            <button type="button" className="btn w-full text-ink-soft" onClick={() => setStatus("idle")}>
              Back
            </button>
          </div>
        ) : (
          <>
            <Segmented<Method>
              label="Sign-in method"
              options={[
                { value: "password", label: "Password" },
                { value: "link", label: "Email link" },
              ]}
              value={method}
              onChange={(m) => {
                setMethod(m);
                setError("");
              }}
              activeClass="bg-todo text-white shadow-card"
              className="mb-4"
            />
            <form onSubmit={method === "password" ? signInWithPassword : sendLink} className="space-y-3">
              <div>
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
              </div>
              {method === "password" && (
                <div>
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                  />
                </div>
              )}
              <button type="submit" className="btn w-full bg-todo text-white" disabled={status === "busy"}>
                {status === "busy" ? "One moment…" : method === "password" ? "Sign in" : "Send magic link"}
              </button>
            </form>
          </>
        )}
        {error && <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-text">{error}</p>}
      </div>
    </main>
  );
}
