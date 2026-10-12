"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LogOut } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";
import { hasPin, rememberEmail, setPin } from "@/lib/pin";

const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSupabase()
      .auth.getUser()
      .then(({ data }) => {
        const address = data.user?.email ?? "";
        setEmail(address);
        rememberEmail(address);
      });
    hasPin()
      .then(setPinSet)
      .catch(() => setPinSet(false));
  }, []);

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return toast.error("The PIN needs 4 digits");
    if (pin !== confirm) return toast.error("The two PINs don't match");
    setSaving(true);
    try {
      await setPin(pin);
      setPinValue("");
      setConfirm("");
      setPinSet(true);
      toast.show({ message: "PIN saved. Use it to sign in on any device." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the PIN", err);
    } finally {
      setSaving(false);
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

        <form onSubmit={savePin} className="card space-y-3 p-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-todo" />
            <h2 className="text-lg font-bold">{pinSet ? "Change your PIN" : "Set a PIN"}</h2>
          </div>
          <p className="text-sm text-ink-soft">
            {pinSet
              ? "You have a PIN. Enter a new one below to replace it."
              : "Sign in with 4 digits instead of waiting for an email."}{" "}
            After 5 wrong tries, PIN sign-in locks until you use an email link and set a new PIN.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(e) => setPinValue(onlyDigits(e.target.value))}
              placeholder="New PIN"
              aria-label="New PIN"
              className="field text-center text-xl tracking-[0.4em] placeholder:text-base placeholder:tracking-normal"
            />
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={confirm}
              onChange={(e) => setConfirm(onlyDigits(e.target.value))}
              placeholder="Again"
              aria-label="Confirm new PIN"
              className="field text-center text-xl tracking-[0.4em] placeholder:text-base placeholder:tracking-normal"
            />
          </div>
          <button type="submit" className="btn w-full bg-todo text-white" disabled={saving || pin.length !== 4 || confirm.length !== 4}>
            {saving ? "Saving…" : "Save PIN"}
          </button>
        </form>

        <button type="button" onClick={signOut} className="btn w-full bg-white text-danger-text shadow-card">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </main>
  );
}
