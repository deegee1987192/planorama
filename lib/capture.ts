import { createInboxItem, deleteInboxItem } from "@/lib/data/inbox";

export interface CaptureResult {
  message: string;
  undo: () => Promise<void>;
}

/**
 * Handles text from the capture bar. For now everything lands in the Inbox.
 * Step 2 replaces the body with an AI call that sorts it straight into the
 * right list (falling back to the Inbox).
 */
export async function captureText(text: string): Promise<CaptureResult> {
  const item = await createInboxItem(text);
  return {
    message: "Added to Inbox",
    undo: () => deleteInboxItem(item.id),
  };
}
