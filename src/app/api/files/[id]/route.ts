import { NextResponse } from "next/server";
import { getActor } from "@/server/auth";
import { getAttachment } from "@/server/data/files";
import { getStorage, readLocalFile } from "@/server/storage";

/**
 * Opens a patient file. Ownership is checked on every request; R2 files are
 * served through a fresh 5-minute presigned URL, so links can't be shared.
 * Add ?download=1 to download instead of viewing inline.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/files/[id]">) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const file = await getAttachment(actor, id).catch(() => null);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const inline = new URL(request.url).searchParams.get("download") !== "1";
  const storage = getStorage();

  if (storage.mode === "r2") {
    const url = await storage.downloadUrl(file.storageKey, { filename: file.filename, mime: file.mime, inline });
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  }

  const body = await readLocalFile(file.storageKey).catch(() => null);
  if (!body) return NextResponse.json({ error: "File missing from local storage" }, { status: 404 });
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
