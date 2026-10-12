import { getSupabase } from "@/lib/supabase/client";

const EMAIL_KEY = "planorama.email";

/** The email last used on this device, so the PIN screen only asks for 4 digits. */
export function rememberedEmail(): string {
  try {
    return window.localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberEmail(email: string) {
  try {
    if (email) window.localStorage.setItem(EMAIL_KEY, email.trim());
    else window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    // Storage unavailable; the email box just won't be pre-filled.
  }
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!);
}

/**
 * Sets a 4-digit PIN for the signed-in account. The account gets a long random
 * password that only the PIN can unlock (see supabase/migrations/003_pin_login.sql).
 */
export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");
  const secret = randomSecret();
  const db = getSupabase();
  const { error: pwError } = await db.auth.updateUser({ password: secret });
  if (pwError) throw pwError;
  const { error } = await db.rpc("set_pin", { p_pin: pin, p_secret: secret });
  if (error) throw error;
}

export async function hasPin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("has_pin");
  if (error) throw error;
  return Boolean(data);
}

export type PinResult = { ok: true } | { ok: false; message: string };

export async function signInWithPin(email: string, pin: string): Promise<PinResult> {
  const db = getSupabase();
  const { data, error } = await db.rpc("pin_login", { p_email: email.trim(), p_pin: pin });
  if (error) return { ok: false, message: error.message };
  const res = data as { status: "ok" | "wrong" | "locked"; secret?: string; tries_left?: number };
  if (res.status === "locked") {
    return { ok: false, message: "Too many wrong PINs, so PIN sign-in is locked. Use an email link, then set a new PIN under Account." };
  }
  if (res.status === "wrong" || !res.secret) {
    return {
      ok: false,
      message: `Wrong PIN or email.${res.tries_left !== undefined ? ` ${res.tries_left} ${res.tries_left === 1 ? "try" : "tries"} left.` : ""}`,
    };
  }
  const { error: signInError } = await db.auth.signInWithPassword({ email: email.trim(), password: res.secret });
  if (signInError) return { ok: false, message: "Your PIN needs to be set again. Use an email link, then set a new PIN under Account." };
  rememberEmail(email);
  return { ok: true };
}
