"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { AttachmentKind } from "@/db/schema";
import { formatBytes, MAX_UPLOAD_BYTES } from "@/lib/files";
import { confirmUploadAction } from "./actions";

/** Shrinks phone photos to ~2000px JPEG (about 0.5 MB). X-rays and documents are kept as-is. */
async function compressPhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 600 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

function putWithProgress(url: string, file: File, mime: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(file);
  });
}

export function UploadDialog({ patientId, today }: { patientId: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AttachmentKind>("xray");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const picked = fileRef.current?.files?.[0];
    if (!picked) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    setProgress(0);
    try {
      const file = kind === "photo" ? await compressPhoto(picked) : picked;
      if (file.size > MAX_UPLOAD_BYTES) throw new Error(`Files can be up to ${formatBytes(MAX_UPLOAD_BYTES)}.`);
      const init = await fetch("/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          kind,
          filename: file.name,
          mime: file.type,
          size: file.size,
          takenAt: String(form.get("takenAt") ?? ""),
          notes: String(form.get("notes") ?? ""),
        }),
      });
      const data = (await init.json()) as { attachmentId?: string; uploadUrl?: string; mime?: string; error?: string };
      if (!init.ok || !data.uploadUrl || !data.attachmentId) throw new Error(data.error ?? "Couldn't start the upload.");
      await putWithProgress(data.uploadUrl, file, data.mime ?? file.type, setProgress);
      const confirmed = await confirmUploadAction(data.attachmentId);
      if (!confirmed.ok) throw new Error(confirmed.error);
      toast.success("File uploaded.");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (progress !== null) return; // don't close mid-upload
        setOpen(o);
        setError(null);
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <Upload aria-hidden="true" /> Upload
      </Button>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Upload file</DialogTitle>
            <DialogDescription>Stored privately. Only you can open it.</DialogDescription>
          </DialogHeader>
          <FormError message={error} />
          <Field label="Type" htmlFor="upload-kind">
            <NativeSelect id="upload-kind" value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)}>
              <option value="xray">X-ray</option>
              <option value="photo">Photo</option>
              <option value="document">Document (consent form, referral…)</option>
            </NativeSelect>
          </Field>
          <Field label="File" htmlFor="upload-file" hint="JPG, PNG, WebP, HEIC, PDF or DICOM, up to 20 MB.">
            <Input
              ref={fileRef}
              id="upload-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.dcm,application/dicom"
              capture={kind === "photo" ? "environment" : undefined}
              required
              className="h-auto py-1.5"
            />
          </Field>
          <div className="grid grid-cols-[150px_1fr] gap-3">
            <Field label="Date taken" htmlFor="upload-date">
              <Input id="upload-date" name="takenAt" type="date" defaultValue={today} />
            </Field>
            <Field label="Note" htmlFor="upload-notes">
              <Input id="upload-notes" name="notes" placeholder="e.g. Periapical, tooth 36" />
            </Field>
          </div>
          {progress !== null && (
            <div className="grid gap-1.5" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">Uploading… {progress}%</span>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={progress !== null}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={progress !== null}>
              {progress !== null ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
