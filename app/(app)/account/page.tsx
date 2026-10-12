"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LogOut } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSupabase()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters");
    if (password !== confirm) return toast.error("The two passwords don't match");
    setSaving(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setSaving(false);
    if (error) toast.error(error.message, error);
    else {
      setPassword("");
      setConfirm("");
      toast.show({ message: "Password saved. You can now sign in with it." });
    }
  }

  async function signOut() {
    await getSupabase().auth.signOut();
    window.location.assign("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-2 py-3">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          className="icon-btn -ml-2 text-ink hover:bg-black/5"
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold">Account</h1>
      </header>

      <div className="space-y-3">
        <div className="card p-4">
          <span className="label">Signed in as</span>
          <p className="text-[15px]">{email || "…"}</p>
        </div>

        <form onSubmit={savePassword} className="card space-y-3 p-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-todo" />
            <h2 className="text-lg font-bold">Password</h2>
          </div>
          <p className="text-sm text-ink-soft">
            Set a password to sign in without waiting for an email. Your phone can save it for you.
          </p>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (8+ characters)"
            aria-label="New password"
            className="field"
          />
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            aria-label="Confirm new password"
            className="field"
          />
          <button type="submit" className="btn w-full bg-todo text-white" disabled={saving || !password}>
            {saving ? "Saving…" : "Save password"}
          </button>
        </form>

        <button type="button" onClick={signOut} className="btn w-full bg-white text-danger-text shadow-card">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </main>
  );
}
