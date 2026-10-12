import { getSupabase } from "@/lib/supabase/client";
import type { ResearchItem } from "@/lib/types";

const db = () => getSupabase();

export async function listResearch(): Promise<ResearchItem[]> {
  const { data, error } = await db()
    .from("research_items")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ResearchItem[];
}

export async function createResearch(input: Partial<ResearchItem> & { title: string }): Promise<ResearchItem> {
  const { data, error } = await db().from("research_items").insert(input).select().single();
  if (error) throw error;
  return data as ResearchItem;
}

export async function updateResearch(id: string, patch: Partial<ResearchItem>): Promise<void> {
  const { error } = await db().from("research_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteResearch(id: string): Promise<void> {
  const { error } = await db().from("research_items").delete().eq("id", id);
  if (error) throw error;
}
