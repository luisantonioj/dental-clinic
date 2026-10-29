import { NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES } from "@/lib/files";
import { getActor } from "@/server/auth";
import { getPendingAttachment } from "@/server/data/files";
import { getStorage, writeLocalFile } from "@/server/storage";

/** Local development only: receives the file body when R2 isn't configured. */
export async function PUT(request: Request, { params }: RouteContext<"/api/files/[id]/content">) {
  if (getStorage().mode !== "local") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const pending = await getPendingAttachment(actor, id).catch(() => null);
  if (!pending) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "File too large" }, { status: 413 });
  await writeLocalFile(pending.storageKey, body);
  return new NextResponse(null, { status: 200 });
}
