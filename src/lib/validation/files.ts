import { z } from "zod";
import { ATTACHMENT_KINDS } from "@/db/schema";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, resolveMime } from "@/lib/files";
import { optionalIsoDate, optionalText } from "./common";

export const uploadRequestSchema = z
  .object({
    patientId: z.string().min(1),
    kind: z.enum(ATTACHMENT_KINDS),
    filename: z.string().trim().min(1).max(200),
    mime: z.string().max(100),
    size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Files can be up to 20 MB"),
    takenAt: optionalIsoDate,
    notes: optionalText(500),
  })
  .transform((v) => ({ ...v, mime: resolveMime(v.filename, v.mime) }))
  .refine((v) => Boolean(ALLOWED_TYPES[v.mime]), {
    message: "Use JPG, PNG, WebP, HEIC, PDF or DICOM files",
    path: ["mime"],
  });

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
