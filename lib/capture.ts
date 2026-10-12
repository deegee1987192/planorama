import { createInboxItem, deleteInboxItem } from "@/lib/data/inbox";
import { createTask, deleteTask } from "@/lib/data/tasks";
import { createBuyItem, createBuyList, deleteBuyItem, listBuyLists } from "@/lib/data/buy";
import { createResearch, deleteResearch } from "@/lib/data/research";
import { createNote, deleteNote } from "@/lib/data/notes";
import { relativeDayLabel } from "@/lib/dates";
import { DEFAULT_BUY_LIST, parseCapture } from "@/lib/capture-rules";

export interface CaptureResult {
  message: string;
  undo: () => Promise<void>;
}

/**
 * Handles text from the capture bar. Keyword rules (see capture-rules.ts) file
 * directed items straight away; everything else lands in the Inbox.
 * Step 2 can add an AI pass for Inbox items without touching the keyword path.
 */
export async function captureText(text: string): Promise<CaptureResult> {
  const lists = /^\s*buy\b/i.test(text) ? await listBuyLists() : [];
  const intent = parseCapture(
    text,
    lists.map((l) => l.name),
  );

  switch (intent.kind) {
    case "todo": {
      const task = await createTask({ title: intent.title, do_on: intent.doOn });
      return {
        message: `Added to To-Do · ${relativeDayLabel(intent.doOn)}`,
        undo: () => deleteTask(task.id),
      };
    }
    case "buy": {
      const name = intent.listName ?? DEFAULT_BUY_LIST;
      const list =
        lists.find((l) => l.name.toLowerCase() === name.toLowerCase()) ?? (await createBuyList(name));
      const item = await createBuyItem(list.id, intent.title);
      return {
        message: `Added to To Buy · ${list.name}`,
        undo: () => deleteBuyItem(item.id),
      };
    }
    case "research": {
      const item = await createResearch({ title: intent.title });
      return { message: "Added to Research", undo: () => deleteResearch(item.id) };
    }
    case "note": {
      const note = await createNote({ title: intent.title });
      return { message: "Added to Notes", undo: () => deleteNote(note.id) };
    }
    case "inbox": {
      const item = await createInboxItem(intent.text);
      return { message: "Added to Inbox", undo: () => deleteInboxItem(item.id) };
    }
  }
}
