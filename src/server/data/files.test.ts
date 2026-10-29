import { describe, expect, it } from "vitest";
import { uploadRequestSchema } from "@/lib/validation/files";
import { NotFoundError } from "@/server/actor";
import { makeActor } from "../../../tests/support/factories";
import { addPatient } from "../../../tests/support/fixtures";
import { confirmAttachment, createPendingAttachment, getAttachment, listAttachments, removeAttachment } from "./files";

const request = (patientId: string, overrides: Record<string, unknown> = {}) =>
  uploadRequestSchema.parse({
    patientId,
    kind: "xray",
    filename: "periapical 36.jpg",
    mime: "image/jpeg",
    size: 1234,
    ...overrides,
  });

describe("patient files", () => {
  it("validates type and size", () => {
    const ok = uploadRequestSchema.safeParse({ patientId: "p", kind: "document", filename: "scan.dcm", mime: "", size: 10 });
    expect(ok.success && ok.data.mime).toBe("application/dicom");
    expect(
      uploadRequestSchema.safeParse({ patientId: "p", kind: "photo", filename: "x.exe", mime: "application/x-msdownload", size: 10 })
        .success,
    ).toBe(false);
    expect(
      uploadRequestSchema.safeParse({ patientId: "p", kind: "photo", filename: "big.jpg", mime: "image/jpeg", size: 25 * 1024 * 1024 })
        .success,
    ).toBe(false);
  });

  it("uses an unguessable key under the dentist and patient", async () => {
    const a = await makeActor();
    const p = await addPatient(a);
    const pending = await createPendingAttachment(a, request(p.id));
    expect(pending.storageKey).toMatch(new RegExp(`^${a.id}/${p.id}/[0-9a-f-]{36}\\.jpg$`));
    expect(pending.storageKey).not.toContain("periapical");
  });

  it("only lists files after the upload is confirmed with the right size", async () => {
    const a = await makeActor();
    const p = await addPatient(a);
    const pending = await createPendingAttachment(a, request(p.id));
    expect(await listAttachments(a, p.id)).toHaveLength(0);
    await expect(confirmAttachment(a, pending.id, null)).rejects.toThrow();
    await expect(confirmAttachment(a, pending.id, 999)).rejects.toThrow();
    await confirmAttachment(a, pending.id, 1234);
    expect(await listAttachments(a, p.id)).toHaveLength(1);
  });

  it("keeps files private to the dentist", async () => {
    const a = await makeActor();
    const b = await makeActor();
    const p = await addPatient(a);
    await expect(createPendingAttachment(b, request(p.id))).rejects.toBeInstanceOf(NotFoundError);
    const pending = await createPendingAttachment(a, request(p.id));
    await expect(confirmAttachment(b, pending.id, 1234)).rejects.toBeInstanceOf(NotFoundError);
    await confirmAttachment(a, pending.id, 1234);
    await expect(getAttachment(b, pending.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(removeAttachment(b, pending.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await listAttachments(b, p.id)).toHaveLength(0);

    await removeAttachment(a, pending.id);
    await expect(getAttachment(a, pending.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
