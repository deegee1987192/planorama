"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Pencil, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, LoadingCards, PageHeader, Sheet } from "@/components/ui";
import {
  createBuyItem,
  createBuyList,
  deleteBuyItem,
  deleteBuyList,
  listBuyItems,
  listBuyLists,
  renameBuyList,
  updateBuyItem,
} from "@/lib/data/buy";
import type { BuyItem, BuyList } from "@/lib/types";

export default function BuyPage() {
  const toast = useToast();
  const [lists, setLists] = useState<BuyList[] | null>(null);
  const [items, setItems] = useState<BuyItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [listSheet, setListSheet] = useState<{ list?: BuyList } | null>(null);
  const [editing, setEditing] = useState<BuyItem | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, i] = await Promise.all([listBuyLists(), listBuyItems()]);
      setLists(l);
      setItems(i);
    } catch (e) {
      toast.error("Couldn't load lists", e);
    }
  }, [toast]);

  useSyncedLoad(load, [load]);

  const openCount = useCallback((listId?: string) => items.filter((i) => !i.done && (!listId || i.list_id === listId)).length, [items]);
  const visibleLists = useMemo(() => (lists ?? []).filter((l) => filter === "all" || l.id === filter), [lists, filter]);

  async function toggle(item: BuyItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    try {
      await updateBuyItem(item.id, { done: !item.done });
    } catch (e) {
      toast.error("Couldn't update item", e);
      void load();
    }
  }

  async function addItem(listId: string, title: string) {
    try {
      const item = await createBuyItem(listId, title);
      setItems((prev) => [...prev, item]);
    } catch (e) {
      toast.error("Couldn't add item", e);
    }
  }

  async function saveList(name: string, list?: BuyList) {
    setListSheet(null);
    try {
      if (list) await renameBuyList(list.id, name);
      else {
        const created = await createBuyList(name);
        setFilter(created.id);
      }
      void load();
    } catch (e) {
      toast.error("Couldn't save list", e);
    }
  }

  async function removeList(list: BuyList) {
    if (!window.confirm(`Delete the list "${list.name}" and all its items?`)) return;
    setListSheet(null);
    try {
      await deleteBuyList(list.id);
      setFilter("all");
      void load();
    } catch (e) {
      toast.error("Couldn't delete list", e);
    }
  }

  async function saveItem(item: BuyItem, patch: Partial<BuyItem>) {
    setEditing(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    try {
      await updateBuyItem(item.id, patch);
    } catch (e) {
      toast.error("Couldn't save item", e);
      void load();
    }
  }

  async function removeItem(item: BuyItem) {
    setEditing(null);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteBuyItem(item.id);
    } catch (e) {
      toast.error("Couldn't delete item", e);
      void load();
    }
  }

  return (
    <>
      <PageHeader title="To Buy" colorClass="text-buy">
        <button type="button" onClick={() => setListSheet({})} className="btn bg-buy text-white">
          <Plus size={18} /> List
        </button>
      </PageHeader>

      {lists === null ? (
        <LoadingCards />
      ) : lists.length === 0 ? (
        <EmptyState icon={<ShoppingBasket size={32} />} title="No lists yet" hint='Tap "+ List" to make one, like "Groceries" or "Fireplace".' />
      ) : (
        <>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={openCount()} />
            {lists.map((l) => (
              <FilterChip key={l.id} active={filter === l.id} onClick={() => setFilter(l.id)} label={l.name} count={openCount(l.id)} />
            ))}
          </div>

          <div className="space-y-3">
            {visibleLists.map((list) => {
              const listItems = items
                .filter((i) => i.list_id === list.id)
                .sort((a, b) => Number(a.done) - Number(b.done) || a.sort_order - b.sort_order);
              return (
                <section key={list.id} className="card px-2 pb-2 pt-3">
                  <div className="flex items-center justify-between pl-3">
                    <h2 className="text-lg font-bold text-buy">{list.name}</h2>
                    <button
                      type="button"
                      onClick={() => setListSheet({ list })}
                      className="icon-btn text-ink-faint hover:bg-black/5"
                      aria-label={`Edit list ${list.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                  <ul>
                    {listItems.map((item) => (
                      <li key={item.id} className="flex items-start">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={item.done}
                          aria-label={`Mark "${item.title}" bought`}
                          onClick={() => toggle(item)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center"
                        >
                          <span
                            className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-2 ${
                              item.done ? "border-buy bg-buy text-white" : "border-ink-faint/60 bg-white"
                            }`}
                          >
                            {item.done && <Check size={14} strokeWidth={3} />}
                          </span>
                        </button>
                        <button type="button" onClick={() => setEditing(item)} className="min-h-[44px] flex-1 py-2.5 pr-2 text-left">
                          <span className={`block text-[15px] leading-snug ${item.done ? "text-ink-faint line-through" : ""}`}>
                            {item.title}
                          </span>
                          {item.note && <span className="mt-0.5 block text-[13px] text-ink-soft">{item.note}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <QuickAdd placeholder="Add item" onAdd={(title) => addItem(list.id, title)} />
                </section>
              );
            })}
          </div>
        </>
      )}

      <Sheet open={listSheet !== null} onClose={() => setListSheet(null)} title={listSheet?.list ? "Edit list" : "New list"}>
        {listSheet && (
          <ListForm
            initial={listSheet.list?.name ?? ""}
            onSave={(name) => saveList(name, listSheet.list)}
            onDelete={listSheet.list ? () => removeList(listSheet.list!) : undefined}
          />
        )}
      </Sheet>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Edit item">
        {editing && <ItemForm item={editing} lists={lists ?? []} onSave={(p) => saveItem(editing, p)} onDelete={() => removeItem(editing)} />}
      </Sheet>
    </>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${
        active ? "bg-buy text-white" : "bg-white text-ink-soft shadow-card"
      }`}
    >
      {label}
      <span className={active ? "text-white/80" : "text-ink-faint"}>{count}</span>
    </button>
  );
}

function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (title: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    setValue("");
    await onAdd(v);
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1 pl-2.5 pt-1">
      <Plus size={18} className="shrink-0 text-buy" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="done"
        className="min-h-[44px] flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-ink-faint"
      />
    </form>
  );
}

function ListForm({ initial, onSave, onDelete }: { initial: string; onSave: (name: string) => void; onDelete?: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
      className="space-y-3"
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="List name, e.g. Fireplace" className="field" />
      <button type="submit" className="btn w-full bg-buy text-white" disabled={!name.trim()}>
        Save
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="btn w-full text-danger-text">
          <Trash2 size={18} /> Delete list
        </button>
      )}
    </form>
  );
}

function ItemForm({
  item,
  lists,
  onSave,
  onDelete,
}: {
  item: BuyItem;
  lists: BuyList[];
  onSave: (patch: Partial<BuyItem>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note);
  const [listId, setListId] = useState(item.list_id);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onSave({ title: title.trim(), note: note.trim(), list_id: listId });
      }}
      className="space-y-3"
    >
      <div>
        <label className="label" htmlFor="item-title">
          Item
        </label>
        <input id="item-title" value={title} onChange={(e) => setTitle(e.target.value)} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="item-note">
          Note
        </label>
        <input
          id="item-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Store, price, size…"
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="item-list">
          List
        </label>
        <select id="item-list" value={listId} onChange={(e) => setListId(e.target.value)} className="field">
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn w-full bg-buy text-white" disabled={!title.trim()}>
        Save
      </button>
      <button type="button" onClick={onDelete} className="btn w-full text-danger-text">
        <Trash2 size={18} /> Delete item
      </button>
    </form>
  );
}
