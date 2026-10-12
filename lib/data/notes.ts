import { getSupabase } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";

const db = () => getSupabase();

/** Notes in your chosen order (new notes go on top). */
export async function listNotes(): Promise<Note[]> {
  const { data, error } = await db()
    .from("notes")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Note[];
}

export async function createNote(input: { title: string; body?: string }): Promise<Note> {
  const { data: first } = await db().from("notes").select("sort_order").order("sort_order").limit(1);
  const sort_order = first && first.length ? Number(first[0].sort_order) - 1 : 0;
  const { data, error } = await db()
    .from("notes")
    .insert({ ...input, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<void> {
  const { error } = await db().from("notes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await db().from("notes").delete().eq("id", id);
  if (error) throw error;
}

/** Saves the given order (note ids, top to bottom). */
export async function reorderNotes(ids: string[]): Promise<void> {
  const results = await Promise.all(
    ids.map((id, index) => db().from("notes").update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
