// Shared rules for patient files (client and server).

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "application/dicom": "dcm",
};

/** Browsers often send DICOM files with an empty or generic type. */
export function resolveMime(filename: string, mime: string): string {
  if (ALLOWED_TYPES[mime]) return mime;
  if (/\.dcm$/i.test(filename)) return "application/dicom";
  if (/\.heic$/i.test(filename)) return "image/heic";
  return mime;
}

export function isPreviewableImage(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const KIND_LABELS = { xray: "X-ray", photo: "Photo", document: "Document" } as const;
