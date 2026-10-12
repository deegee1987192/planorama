"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, GripVertical, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, LoadingCards, PageHeader, Sheet } from "@/components/ui";
import { createNote, deleteNote, listNotes, reorderNotes, updateNote } from "@/lib/data/notes";
import type { Note } from "@/lib/types";

export default function NotesPage() {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [editing, setEditing] = useState<Note | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      setNotes(await listNotes());
    } catch (e) {
      toast.error("Couldn't load notes", e);
    }
  }, [toast]);

  useSyncedLoad(load, [load]);

  async function save(values: { title: string; body: string }) {
    const target = editing;
    setEditing(null);
    try {
      if (target === "new") await createNote(values);
      else if (target) await updateNote(target.id, values);
      void load();
    } catch (e) {
      toast.error("Couldn't save note", e);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!notes || !over || active.id === over.id) return;
    const from = notes.findIndex((n) => n.id === active.id);
    const to = notes.findIndex((n) => n.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(notes, from, to);
    setNotes(next);
    try {
      await reorderNotes(next.map((n) => n.id));
    } catch (e) {
      toast.error("Couldn't save the new order", e);
      void load();
    }
  }

  async function remove(note: Note) {
    if (!window.confirm("Delete this note?")) return;
    setEditing(null);
    try {
      await deleteNote(note.id);
      void load();
    } catch (e) {
      toast.error("Couldn't delete note", e);
    }
  }

  return (
    <>
      <PageHeader title="Notes" colorClass="text-notes">
        <button type="button" onClick={() => setEditing("new")} className="btn bg-notes text-white">
          <Plus size={18} /> Note
        </button>
      </PageHeader>

      {notes === null ? (
        <LoadingCards />
      ) : notes.length === 0 ? (
        <EmptyState icon={<NotebookPen size={32} />} title="No notes yet" hint="Jot down anything worth keeping." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
          <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} onEdit={() => setEditing(note)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New note" : "Edit note"}>
        {editing && (
          <NoteForm
            note={editing === "new" ? undefined : editing}
            onSave={save}
            onDelete={editing === "new" ? undefined : () => remove(editing)}
          />
        )}
      </Sheet>
    </>
  );
}

/** Tap the card to expand/collapse long notes; the pencil opens the editor; drag the grip to reorder. */
function NoteCard({ note, onEdit }: { note: Note; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el && !expanded) setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [note.body, expanded]);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`card relative ${isDragging ? "z-10 shadow-xl" : ""}`}
    >
      <button
        type="button"
        onClick={() => truncated && setExpanded((x) => !x)}
        aria-expanded={truncated ? expanded : undefined}
        className="block min-h-[104px] w-full p-4 pr-14 text-left"
      >
        {note.title && <h2 className="text-[17px] font-bold leading-snug text-notes">{note.title}</h2>}
        {note.body && (
          <p
            ref={bodyRef}
            className={`mt-1 whitespace-pre-line text-sm text-ink-soft ${expanded ? "" : "line-clamp-6"}`}
          >
            {note.body}
          </p>
        )}
        {truncated && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-notes">
            {expanded ? "Show less" : "Show more"}
            <ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit note${note.title ? ` "${note.title}"` : ""}`}
        className="icon-btn absolute right-2 top-2 text-ink-faint hover:bg-black/5"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder note${note.title ? ` "${note.title}"` : ""}`}
        className="icon-btn absolute right-2 top-[52px] cursor-grab touch-none text-ink-faint/70 active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
    </li>
  );
}

function NoteForm({
  note,
  onSave,
  onDelete,
}: {
  note?: Note;
  onSave: (values: { title: string; body: string }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const canSave = Boolean(title.trim() || body.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onSave({ title: title.trim(), body });
      }}
      className="space-y-3"
    >
      <input autoFocus={!note} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="field font-semibold" aria-label="Title" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write something…" rows={8} className="field resize-y" aria-label="Body" />
      <button type="submit" className="btn w-full bg-notes text-white" disabled={!canSave}>
        Save
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="btn w-full text-danger-text">
          <Trash2 size={18} /> Delete note
        </button>
      )}
    </form>
  );
}
