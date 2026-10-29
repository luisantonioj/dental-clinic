import { Check, Pencil, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/app/section-card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { fullName } from "@/server/data/patients";
import { loadPatient } from "../load-patient";
import { ArchiveButton } from "./archive-button";

export async function generateMetadata({ params }: PageProps<"/patients/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { patient } = await loadPatient(id);
  return { title: fullName(patient) };
}

function DetailList({ rows }: { rows: [string, React.ReactNode, string?][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[160px_1fr]">
      {rows.map(([label, value, className]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className={className ?? "text-heading"}>{value || <span className="text-muted-foreground">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function PatientOverviewPage({ params }: PageProps<"/patients/[id]">) {
  const { id } = await params;
  const { patient: p } = await loadPatient(id);
  const emergency = [p.emergencyName, p.emergencyRelation && `(${p.emergencyRelation})`, p.emergencyPhone]
    .filter(Boolean)
    .join(" ");

  const editButton = (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/patients/${p.id}/edit`}>
        <Pencil aria-hidden="true" /> Edit
      </Link>
    </Button>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="grid content-start gap-6">
        <SectionCard title="Personal information" action={editButton}>
          <DetailList
            rows={[
              ["Full name", fullName(p)],
              ["Birthdate", p.birthdate && formatDate(p.birthdate)],
              ["Sex", p.sex && (p.sex === "female" ? "Female" : "Male")],
              ["Mobile", p.phone],
              ["Email", p.email],
              ["Address", p.address],
              ["Occupation", p.occupation],
              ["Emergency contact", emergency],
            ]}
          />
        </SectionCard>
        <SectionCard title="Privacy & reminders">
          <ul className="grid gap-3 text-sm">
            <li className="flex items-start gap-3">
              {p.consentAt ? (
                <Check className="mt-0.5 size-4 text-success" aria-hidden="true" />
              ) : (
                <X className="mt-0.5 size-4 text-warning" aria-hidden="true" />
              )}
              <span>
                <b className="font-medium text-heading">Data privacy consent</b>
                <span className="block text-muted-foreground">
                  {p.consentAt ? `Agreed ${formatDate(p.consentAt)} (RA 10173)` : "Not recorded yet. Ask the patient and tick it in Edit."}
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              {p.remindersOptIn && p.email ? (
                <Check className="mt-0.5 size-4 text-success" aria-hidden="true" />
              ) : (
                <X className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span>
                <b className="font-medium text-heading">Email reminders</b>
                <span className="block text-muted-foreground">
                  {p.remindersOptIn
                    ? p.email
                      ? `On, sent to ${p.email}`
                      : "Opted in, but there's no email address on file"
                    : "Off"}
                </span>
              </span>
            </li>
          </ul>
        </SectionCard>
      </div>
      <div className="grid content-start gap-6">
        <SectionCard title="Medical history" action={editButton}>
          <DetailList
            rows={[
              ["Allergies", p.allergies ?? "None known", p.allergies ? "font-medium text-destructive" : undefined],
              ["Conditions", p.medicalConditions],
              ["Medications", p.medications],
            ]}
          />
        </SectionCard>
        <SectionCard title="Notes">
          <p className="text-sm whitespace-pre-wrap text-heading">
            {p.notes ?? <span className="text-muted-foreground">No notes yet.</span>}
          </p>
        </SectionCard>
        <div className="flex justify-end">
          <ArchiveButton id={p.id} archived={Boolean(p.archivedAt)} />
        </div>
      </div>
    </div>
  );
}
