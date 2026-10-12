import { getSupabase } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";

const db = () => getSupabase();

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await db().from("notes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Note[];
}

export async function createNote(input: { title: string; body?: string }): Promise<Note> {
  const { data, error } = await db().from("notes").insert(input).select().single();
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
