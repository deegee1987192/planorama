import { getSupabase } from "@/lib/supabase/client";
import type { InboxItem } from "@/lib/types";
import { createTask } from "./tasks";
import { createBuyItem } from "./buy";
import { createResearch } from "./research";
import { createNote } from "./notes";

const db = () => getSupabase();

export async function listInbox(): Promise<InboxItem[]> {
  const { data, error } = await db().from("inbox_items").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as InboxItem[];
}

export async function countInbox(): Promise<number> {
  const { count, error } = await db().from("inbox_items").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function createInboxItem(text: string): Promise<InboxItem> {
  const { data, error } = await db().from("inbox_items").insert({ text }).select().single();
  if (error) throw error;
  return data as InboxItem;
}

export async function deleteInboxItem(id: string): Promise<void> {
  const { error } = await db().from("inbox_items").delete().eq("id", id);
  if (error) throw error;
}

/** Where an inbox item can be sent. Step 2's AI sorter produces the same shape. */
export type InboxDestination =
  | { kind: "todo"; doOn: string }
  | { kind: "buy"; listId: string }
  | { kind: "research" }
  | { kind: "note" };

export async function moveInboxItem(item: InboxItem, to: InboxDestination): Promise<void> {
  const text = item.text.trim();
  switch (to.kind) {
    case "todo":
      await createTask({ title: text, do_on: to.doOn });
      break;
    case "buy":
      await createBuyItem(to.listId, text);
      break;
    case "research":
      await createResearch({ title: text });
      break;
    case "note":
      await createNote({ title: text });
      break;
  }
  await deleteInboxItem(item.id);
}
