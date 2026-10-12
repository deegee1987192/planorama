"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Segmented } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import { rememberEmail, rememberedEmail, signInWithPin } from "@/lib/pin";

type Method = "pin" | "link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [method, setMethod] = useState<Method>("pin");
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState(params.get("error") ? "That link didn't work or has expired. Send a new one." : "");

  useEffect(() => {
    const saved = rememberedEmail();
    setSavedEmail(saved);
    setEmail(saved);
  }, []);

  function friendly(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("rate limit")) return "Too many emails were sent. Wait about an hour and try again.";
    if (m.includes("signups not allowed")) return "That email doesn't have an account.";
    return message;
  }

  async function submitPin(value: string) {
    if (!/^\d{4}$/.test(value) || !email.trim() || status === "busy") return;
    setError("");
    setStatus("busy");
    const result = await signInWithPin(email, value);
    if (result.ok) {
      window.location.assign("/");
      return;
    }
    setStatus("idle");
    setPin("");
    setError(result.message);
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("busy");
    rememberEmail(email);
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
                { value: "pin", label: "PIN" },
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

            {method === "pin" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitPin(pin);
                }}
                className="space-y-4"
              >
                {savedEmail ? (
                  <p className="text-center text-sm text-ink-soft">
                    Signing in as <strong className="text-ink">{savedEmail}</strong>
                    <br />
                    <button
                      type="button"
                      className="min-h-[44px] font-semibold text-todo-text"
                      onClick={() => {
                        setSavedEmail("");
                        setEmail("");
                      }}
                    >
                      Not you?
                    </button>
                  </p>
                ) : (
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
                )}
                <div>
                  <label htmlFor="pin" className="label text-center">
                    PIN
                  </label>
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus={Boolean(savedEmail)}
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setPin(value);
                      if (value.length === 4) void submitPin(value);
                    }}
                    placeholder="••••"
                    className="field h-16 text-center text-3xl tracking-[0.6em]"
                    disabled={status === "busy"}
                  />
                </div>
                <button type="submit" className="btn w-full bg-todo text-white" disabled={status === "busy" || pin.length !== 4 || !email.trim()}>
                  {status === "busy" ? "Signing in…" : "Sign in"}
                </button>
                <p className="text-center text-xs text-ink-faint">No PIN yet? Sign in with an email link, then set one under Account.</p>
              </form>
            ) : (
              <form onSubmit={sendLink} className="space-y-3">
                <div>
                  <label htmlFor="link-email" className="label">
                    Email
                  </label>
                  <input
                    id="link-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="field"
                  />
                </div>
                <button type="submit" className="btn w-full bg-todo text-white" disabled={status === "busy"}>
                  {status === "busy" ? "Sending…" : "Send magic link"}
                </button>
              </form>
            )}
          </>
        )}
        {error && <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-text">{error}</p>}
      </div>
    </main>
  );
}
