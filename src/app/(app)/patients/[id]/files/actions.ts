"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { requireUser } from "@/server/auth";
import { confirmAttachment, getPendingAttachment, removeAttachment } from "@/server/data/files";
import { getStorage } from "@/server/storage";

/** Step 2 of an upload: checks the stored object and shows it on the patient record. */
export async function confirmUploadAction(attachmentId: string): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    const pending = await getPendingAttachment(actor, attachmentId);
    const size = await getStorage().size(pending.storageKey);
    const row = await confirmAttachment(actor, attachmentId, size);
    revalidatePath(`/patients/${row.patientId}`, "layout");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Upload failed");
  }
}

export async function removeAttachmentAction(id: string): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    const row = await removeAttachment(actor, id);
    revalidatePath(`/patients/${row.patientId}`, "layout");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't remove the file");
  }
}
