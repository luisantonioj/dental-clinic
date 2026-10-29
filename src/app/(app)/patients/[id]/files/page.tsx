import { ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { todayManila } from "@/lib/format";
import { listAttachments } from "@/server/data/files";
import { loadPatient } from "../../load-patient";
import { FileGrid } from "./file-grid";
import { UploadDialog } from "./upload-dialog";

export const metadata: Metadata = { title: "X-rays & files" };

export default async function FilesPage({ params }: PageProps<"/patients/[id]/files">) {
  const { id } = await params;
  const { actor, patient } = await loadPatient(id);
  const files = await listAttachments(actor, id);

  return (
    <SectionCard
      title="X-rays & files"
      description="Private to your account. Links expire after 5 minutes."
      action={<UploadDialog patientId={patient.id} today={todayManila()} />}
    >
      {files.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No X-rays, photos or documents yet." />
      ) : (
        <FileGrid
          files={files.map((f) => ({
            id: f.id,
            kind: f.kind,
            filename: f.filename,
            mime: f.mime,
            size: f.size,
            takenAt: f.takenAt,
            notes: f.notes,
          }))}
        />
      )}
    </SectionCard>
  );
}
