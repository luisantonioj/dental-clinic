import { NextResponse } from "next/server";
import { uploadRequestSchema } from "@/lib/validation/files";
import { NotFoundError } from "@/server/actor";
import { getActor } from "@/server/auth";
import { createPendingAttachment } from "@/server/data/files";
import { getStorage } from "@/server/storage";

/**
 * Step 1 of an upload: checks the patient belongs to the signed-in dentist,
 * validates the file, and returns a short-lived URL to PUT the bytes to.
 */
export async function POST(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = uploadRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid upload" }, { status: 400 });
  }

  try {
    const storage = getStorage();
    const pending = await createPendingAttachment(actor, parsed.data);
    const uploadUrl = await storage.uploadUrl(pending.storageKey, pending.mime, pending.id);
    return NextResponse.json(
      { attachmentId: pending.id, uploadUrl, mime: pending.mime },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    console.error("upload init failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "File storage isn't available right now" }, { status: 503 });
  }
}
