"use client";

import { Download, FileText, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AttachmentKind } from "@/db/schema";
import { formatBytes, isPreviewableImage, KIND_LABELS } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { removeAttachmentAction } from "./actions";

export type FileItem = {
  id: string;
  kind: AttachmentKind;
  filename: string;
  mime: string;
  size: number;
  takenAt: string | null;
  notes: string | null;
};

export function FileGrid({ files }: { files: FileItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const open = files.find((f) => f.id === openId) ?? null;

  function remove(file: FileItem) {
    if (!window.confirm(`Remove “${file.filename}” from this patient's record?`)) return;
    startTransition(async () => {
      const result = await removeAttachmentAction(file.id);
      if (result.ok) {
        toast.success("File removed.");
        setOpenId(null);
      } else toast.error(result.error);
    });
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {files.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setOpenId(f.id)}
              className="group w-full overflow-hidden rounded-xl border bg-card text-left hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-surface-2">
                {isPreviewableImage(f.mime) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked URL
                  <img
                    src={`/api/files/${f.id}`}
                    alt={f.notes ?? f.filename}
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-muted-foreground">
                    <FileText className="size-8" aria-hidden="true" />
                    <span className="text-xs font-semibold uppercase">{f.filename.split(".").pop()}</span>
                  </span>
                )}
              </div>
              <div className="px-3 py-2">
                <div className="truncate text-sm font-medium text-heading">{f.notes ?? f.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {KIND_LABELS[f.kind]}
                  {f.takenAt && ` · ${formatDate(f.takenAt)}`}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[92vh] gap-3 sm:max-w-4xl">
          {open && (
            <>
              <div className="pr-8">
                <DialogTitle className="truncate">{open.notes ?? open.filename}</DialogTitle>
                <DialogDescription>
                  {KIND_LABELS[open.kind]}
                  {open.takenAt && ` · ${formatDate(open.takenAt)}`} · {open.filename} · {formatBytes(open.size)}
                </DialogDescription>
              </div>
              <div className="grid max-h-[68vh] min-h-48 place-items-center overflow-auto rounded-lg bg-black/90">
                {isPreviewableImage(open.mime) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked URL
                  <img src={`/api/files/${open.id}`} alt={open.notes ?? open.filename} className="max-h-[68vh] w-auto object-contain" />
                ) : open.mime === "application/pdf" ? (
                  <iframe src={`/api/files/${open.id}`} title={open.filename} className="h-[68vh] w-full bg-white" />
                ) : (
                  <p className="p-8 text-center text-sm text-white/80">
                    This file type can&apos;t be previewed here. Download it to open it in your viewer.
                  </p>
                )}
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => remove(open)} disabled={pending} className="text-destructive">
                  <Trash2 aria-hidden="true" /> Remove
                </Button>
                <Button variant="outline" asChild>
                  <a href={`/api/files/${open.id}?download=1`}>
                    <Download aria-hidden="true" /> Download
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
