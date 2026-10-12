"use client";

import { useCallback, useState } from "react";
import { NotebookPen, Plus, Trash2 } from "lucide-react";
import { useSyncedLoad } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, LoadingCards, PageHeader, Sheet } from "@/components/ui";
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/data/notes";
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
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <button type="button" onClick={() => setEditing(note)} className="card block w-full p-4 text-left">
                {note.title && <h2 className="text-[17px] font-bold leading-snug text-notes">{note.title}</h2>}
                {note.body && <p className="mt-1 line-clamp-6 whitespace-pre-line text-sm text-ink-soft">{note.body}</p>}
              </button>
            </li>
          ))}
        </ul>
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
