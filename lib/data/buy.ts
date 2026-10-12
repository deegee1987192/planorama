import { getSupabase } from "@/lib/supabase/client";
import type { BuyItem, BuyList } from "@/lib/types";

const db = () => getSupabase();

export async function listBuyLists(): Promise<BuyList[]> {
  const { data, error } = await db().from("buy_lists").select("*").order("sort_order").order("created_at");
  if (error) throw error;
  return data as BuyList[];
}

export async function listBuyItems(): Promise<BuyItem[]> {
  const { data, error } = await db().from("buy_items").select("*").order("sort_order").order("created_at");
  if (error) throw error;
  return data as BuyItem[];
}

export async function createBuyList(name: string): Promise<BuyList> {
  const { data: last } = await db()
    .from("buy_lists")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = last && last.length ? Number(last[0].sort_order) + 1 : 0;
  const { data, error } = await db().from("buy_lists").insert({ name, sort_order }).select().single();
  if (error) throw error;
  return data as BuyList;
}

export async function renameBuyList(id: string, name: string): Promise<void> {
  const { error } = await db().from("buy_lists").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteBuyList(id: string): Promise<void> {
  const { error } = await db().from("buy_lists").delete().eq("id", id);
  if (error) throw error;
}

export async function createBuyItem(listId: string, title: string, note = ""): Promise<BuyItem> {
  const { data: last } = await db()
    .from("buy_items")
    .select("sort_order")
    .eq("list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = last && last.length ? Number(last[0].sort_order) + 1 : 0;
  const { data, error } = await db()
    .from("buy_items")
    .insert({ list_id: listId, title, note, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data as BuyItem;
}

export async function updateBuyItem(id: string, patch: Partial<BuyItem>): Promise<void> {
  const { error } = await db().from("buy_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBuyItem(id: string): Promise<void> {
  const { error } = await db().from("buy_items").delete().eq("id", id);
  if (error) throw error;
}
