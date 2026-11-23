"use client";

import { useCallback, useState } from "react";
import { Plus, Telescope, Trash2 } from "lucide-react";
import { useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, LoadingCards, PageHeader, Segmented, Sheet } from "@/components/ui";
import { createResearch, deleteResearch, deleteResearchItems, listResearch, updateResearch } from "@/lib/data/research";
import type { ResearchItem, ResearchStatus } from "@/lib/types";

const STATUS: Record<ResearchStatus, { label: string; className: string }> = {
  to_look_into: { label: "To look into", className: "bg-research-soft text-research" },
  in_progress: { label: "In progress", className: "bg-amber-100 text-amber-800" },
  done: { label: "Done", className: "bg-emerald-100 text-emerald-800" },
};

type Filter = "open" | "done";

export default function ResearchPage() {
  const toast = useToast();
  const [items, setItems] = useState<ResearchItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [editing, setEditing] = useState<ResearchItem | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listResearch());
    } catch (e) {
      toast.error("Couldn't load research", e);
    }
  }, [toast]);

  useSyncedLoad(load, [load]);

  const visible = (items ?? []).filter((i) => (filter === "done" ? i.status === "done" : i.status !== "done"));

  async function save(values: Pick<ResearchItem, "title" | "notes" | "status">) {
    const target = editing;
    setEditing(null);
    try {
      if (target === "new") await createResearch(values);
      else if (target) await updateResearch(target.id, values);
      void load();
    } catch (e) {
      toast.error("Couldn't save", e);
    }
  }

  async function remove(item: ResearchItem) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setEditing(null);
    try {
      await deleteResearch(item.id);
      void load();
    } catch (e) {
      toast.error("Couldn't delete", e);
    }
  }

  async function removeNow(item: ResearchItem) {
    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
    try {
      await deleteResearch(item.id);
    } catch (e) {
      toast.error("Couldn't delete", e);
      void load();
    }
  }

  async function clearDone() {
    const ids = (items ?? []).filter((i) => i.status === "done").map((i) => i.id);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} done item${ids.length === 1 ? "" : "s"}?`)) return;
    setItems((prev) => (prev ?? []).filter((i) => !ids.includes(i.id)));
    try {
      await deleteResearchItems(ids);
    } catch (e) {
      toast.error("Couldn't delete", e);
      void load();
    }
  }

  return (
    <>
      <PageHeader title="Research" colorClass="text-research">
        <button type="button" onClick={() => setEditing("new")} className="btn bg-research text-white">
          <Plus size={18} /> Add
        </button>
      </PageHeader>

      <Segmented<Filter>
        label="Filter"
        options={[
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
        ]}
        value={filter}
        onChange={setFilter}
        activeClass="bg-research text-white shadow-card"
        className="mb-4"
      />

      {items === null ? (
        <LoadingCards />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Telescope size={32} />}
          title={filter === "open" ? "Nothing to look into" : "Nothing done yet"}
          hint={filter === "open" ? "Add things you want to research." : undefined}
        />
      ) : (
        <>
          {filter === "done" && (
            <button
              type="button"
              onClick={clearDone}
              className="mb-3 flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-danger-text hover:bg-black/5"
            >
              <Trash2 size={16} /> Delete all done ({visible.length})
            </button>
          )}
          <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id} className="relative">
              <button
                type="button"
                onClick={() => setEditing(item)}
                className={`card block w-full p-4 text-left ${item.status === "done" ? "pb-12" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className={`text-[17px] font-bold leading-snug ${item.status === "done" ? "text-ink-faint line-through" : ""}`}>
                    {item.title}
                  </h2>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[item.status].className}`}>
                    {STATUS[item.status].label}
                  </span>
                </div>
                {item.notes && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-ink-soft">{item.notes}</p>}
              </button>
              {item.status === "done" && (
                <button
                  type="button"
                  onClick={() => removeNow(item)}
                  className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-lg text-ink-faint hover:text-danger-text"
                  aria-label={`Delete "${item.title}"`}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </li>
          ))}
          </ul>
        </>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New research" : "Edit research"}>
        {editing && (
          <ResearchForm
            item={editing === "new" ? undefined : editing}
            onSave={save}
            onDelete={editing === "new" ? undefined : () => remove(editing)}
          />
        )}
      </Sheet>
    </>
  );
}

function ResearchForm({
  item,
  onSave,
  onDelete,
}: {
  item?: ResearchItem;
  onSave: (values: Pick<ResearchItem, "title" | "notes" | "status">) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [status, setStatus] = useState<ResearchStatus>(item?.status ?? "to_look_into");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onSave({ title: title.trim(), notes, status });
      }}
      className="space-y-3"
    >
      <input autoFocus={!item} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What to look into" className="field" aria-label="Title" />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes, links, findings…" rows={5} className="field resize-y" aria-label="Notes" />
      <Segmented<ResearchStatus>
        label="Status"
        options={[
          { value: "to_look_into", label: "To look into" },
          { value: "in_progress", label: "In progress" },
          { value: "done", label: "Done" },
        ]}
        value={status}
        onChange={setStatus}
        activeClass="bg-research text-white shadow-card"
      />
      <button type="submit" className="btn w-full bg-research text-white" disabled={!title.trim()}>
        Save
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="btn w-full text-danger-text">
          <Trash2 size={18} /> Delete
        </button>
      )}
    </form>
  );
}
