"use client";

import { useCallback, useState } from "react";
import { ArrowRight, Inbox, ListTodo, NotebookPen, Plus, ShoppingBasket, Telescope, Trash2 } from "lucide-react";
import { useApp, useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, LoadingCards, PageHeader, Sheet } from "@/components/ui";
import { DayPicker } from "@/components/todo/DeadlinesView";
import { deleteInboxItem, listInbox, moveInboxItem, type InboxDestination } from "@/lib/data/inbox";
import { createBuyList, listBuyLists } from "@/lib/data/buy";
import { formatTimestamp } from "@/lib/dates";
import type { BuyList, InboxItem } from "@/lib/types";

const LABELS: Record<InboxDestination["kind"], string> = {
  todo: "To-Do",
  buy: "To Buy",
  research: "Research",
  note: "Notes",
};

export default function InboxPage() {
  const toast = useToast();
  const { refreshInbox, inboxCount } = useApp();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [moving, setMoving] = useState<InboxItem | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listInbox());
    } catch (e) {
      toast.error("Couldn't load inbox", e);
    }
  }, [toast]);

  // Also reload when the count changes, e.g. after the capture bar adds something.
  useSyncedLoad(load, [load, inboxCount]);

  async function move(item: InboxItem, to: InboxDestination) {
    setMoving(null);
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    try {
      await moveInboxItem(item, to);
      toast.show({ message: `Moved to ${LABELS[to.kind]}` });
    } catch (e) {
      toast.error("Couldn't move item", e);
    }
    refreshInbox();
    void load();
  }

  async function remove(item: InboxItem) {
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    try {
      await deleteInboxItem(item.id);
    } catch (e) {
      toast.error("Couldn't delete item", e);
    }
    refreshInbox();
    void load();
  }

  return (
    <>
      <PageHeader title="Inbox" colorClass="text-inbox" />
      <p className="-mt-1 mb-4 text-sm text-ink-soft">Things you captured. Move each one where it belongs.</p>

      {items === null ? (
        <LoadingCards />
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox size={32} />} title="Inbox is empty" hint="Use the bar below to capture anything." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="card p-4">
              <p className="whitespace-pre-line text-[15px] leading-snug">{item.text}</p>
              <p className="mt-1 text-xs text-ink-faint">{formatTimestamp(item.created_at)}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setMoving(item)} className="btn flex-1 bg-inbox text-white">
                  Move to… <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  className="icon-btn bg-black/[0.04] text-danger-text"
                  aria-label="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={moving !== null} onClose={() => setMoving(null)} title="Move to…">
        {moving && <MoveOptions item={moving} onMove={(to) => move(moving, to)} />}
      </Sheet>
    </>
  );
}

function MoveOptions({ item, onMove }: { item: InboxItem; onMove: (to: InboxDestination) => void }) {
  const { today } = useApp();
  const toast = useToast();
  const [step, setStep] = useState<"choose" | "todo" | "buy">("choose");
  const [lists, setLists] = useState<BuyList[] | null>(null);
  const [newList, setNewList] = useState("");

  async function openBuy() {
    setStep("buy");
    try {
      setLists(await listBuyLists());
    } catch (e) {
      toast.error("Couldn't load lists", e);
    }
  }

  async function addToNewList(e: React.FormEvent) {
    e.preventDefault();
    const name = newList.trim();
    if (!name) return;
    try {
      const list = await createBuyList(name);
      onMove({ kind: "buy", listId: list.id });
    } catch (err) {
      toast.error("Couldn't create list", err);
    }
  }

  const option = "flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 text-left font-semibold transition active:scale-[0.99]";

  return (
    <div>
      <p className="mb-4 line-clamp-2 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">{item.text}</p>

      {step === "choose" && (
        <div className="space-y-2">
          <button type="button" onClick={() => setStep("todo")} className={`${option} bg-todo-soft text-todo-text`}>
            <ListTodo size={20} /> To-Do
          </button>
          <button type="button" onClick={openBuy} className={`${option} bg-buy-soft text-buy`}>
            <ShoppingBasket size={20} /> To Buy
          </button>
          <button type="button" onClick={() => onMove({ kind: "research" })} className={`${option} bg-research-soft text-research`}>
            <Telescope size={20} /> Research
          </button>
          <button type="button" onClick={() => onMove({ kind: "note" })} className={`${option} bg-notes-soft text-notes`}>
            <NotebookPen size={20} /> Notes
          </button>
        </div>
      )}

      {step === "todo" && (
        <>
          <p className="label">Which day?</p>
          <DayPicker today={today} onPick={(doOn) => onMove({ kind: "todo", doOn })} />
        </>
      )}

      {step === "buy" && (
        <div className="space-y-2">
          <p className="label">Which list?</p>
          {lists === null && <div className="h-14 animate-pulse rounded-2xl bg-cream" />}
          {lists?.map((l) => (
            <button key={l.id} type="button" onClick={() => onMove({ kind: "buy", listId: l.id })} className={`${option} bg-buy-soft text-buy`}>
              <ShoppingBasket size={20} /> {l.name}
            </button>
          ))}
          <form onSubmit={addToNewList} className="flex gap-2 pt-1">
            <input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="Or a new list…" className="field" />
            <button type="submit" className="icon-btn bg-buy text-white" aria-label="Create list and move" disabled={!newList.trim()}>
              <Plus size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
