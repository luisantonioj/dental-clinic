import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { ALLOWED_TYPES } from "@/lib/files";
import type { UploadRequest } from "@/lib/validation/files";
import { type Actor, NotFoundError, ownedBy } from "@/server/actor";
import { audit } from "./audit";
import { assertOwnPatient } from "./patients";

export type Attachment = typeof attachments.$inferSelect;

/** Records an upload that is about to happen and returns its private storage key. */
export async function createPendingAttachment(actor: Actor, input: UploadRequest): Promise<Attachment> {
  await assertOwnPatient(actor, input.patientId);
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(attachments)
    .values({
      id,
      dentistId: actor.id,
      patientId: input.patientId,
      kind: input.kind,
      storageKey: `${actor.id}/${input.patientId}/${crypto.randomUUID()}.${ALLOWED_TYPES[input.mime]}`,
      filename: input.filename,
      mime: input.mime,
      size: input.size,
      takenAt: input.takenAt,
      notes: input.notes,
      uploaded: false,
    })
    .returning();
  return row;
}

/** A not-yet-confirmed upload owned by the actor (the only rows the upload route may write to). */
export async function getPendingAttachment(actor: Actor, id: string): Promise<Attachment> {
  const [row] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.dentistId, actor.id), eq(attachments.uploaded, false)));
  if (!row) throw new NotFoundError("Upload");
  return row;
}

/** Marks an upload as finished once the stored object's size matches what was announced. */
export async function confirmAttachment(actor: Actor, id: string, storedSize: number | null): Promise<Attachment> {
  const pending = await getPendingAttachment(actor, id);
  if (storedSize === null) throw new Error("The file didn't finish uploading");
  if (storedSize !== pending.size) throw new Error("The uploaded file doesn't match what was expected");
  const [row] = await db.update(attachments).set({ uploaded: true }).where(eq(attachments.id, id)).returning();
  await audit(actor, "create", "attachment", id, { patientId: row.patientId, kind: row.kind });
  return row;
}

export async function listAttachments(actor: Actor, patientId: string): Promise<Attachment[]> {
  return db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.patientId, patientId),
        ownedBy(actor, attachments.dentistId),
        eq(attachments.uploaded, true),
        isNull(attachments.removedAt),
      ),
    )
    .orderBy(desc(attachments.createdAt));
}

/** An uploaded file the actor may view (ownership is checked before any URL is made). */
export async function getAttachment(actor: Actor, id: string): Promise<Attachment> {
  const [row] = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.id, id),
        ownedBy(actor, attachments.dentistId),
        eq(attachments.uploaded, true),
        isNull(attachments.removedAt),
      ),
    );
  if (!row) throw new NotFoundError("File");
  return row;
}

/** Hides a file from the patient record; the stored object is kept. */
export async function removeAttachment(actor: Actor, id: string): Promise<Attachment> {
  const [row] = await db
    .update(attachments)
    .set({ removedAt: new Date() })
    .where(and(eq(attachments.id, id), eq(attachments.dentistId, actor.id), isNull(attachments.removedAt)))
    .returning();
  if (!row) throw new NotFoundError("File");
  await audit(actor, "delete", "attachment", id);
  return row;
}
