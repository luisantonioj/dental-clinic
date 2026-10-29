import { Archive, ChevronLeft, Mail, Phone, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { InitialsAvatar } from "@/components/app/initials-avatar";
import { Badge } from "@/components/ui/badge";
import { ageOn, todayManila } from "@/lib/format";
import { fullName } from "@/server/data/patients";
import { loadPatient } from "../load-patient";
import { type PatientTab, PatientTabs } from "./patient-tabs";

export default async function PatientLayout({ children, params }: LayoutProps<"/patients/[id]">) {
  const { id } = await params;
  const { patient } = await loadPatient(id);
  const name = fullName(patient);
  const age = patient.birthdate ? ageOn(patient.birthdate, todayManila()) : null;
  const alerts = [patient.allergies && `Allergies: ${patient.allergies}`, patient.medicalConditions]
    .filter(Boolean)
    .join(" · ");

  const tabs: PatientTab[] = [{ segment: "", label: "Overview" }];

  return (
    <>
      <Link
        href="/patients"
        className="no-print mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-heading"
      >
        <ChevronLeft className="size-4" aria-hidden="true" /> Patients
      </Link>
      <section className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 shadow-card">
        <InitialsAvatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
            {name}
            <span className="tabular rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {patient.code}
            </span>
            {patient.archivedAt && (
              <Badge variant="secondary">
                <Archive aria-hidden="true" /> Archived
              </Badge>
            )}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {(age !== null || patient.sex) && (
              <span>
                {age !== null && `${age} yrs`}
                {age !== null && patient.sex && " · "}
                {patient.sex && (patient.sex === "female" ? "Female" : "Male")}
              </span>
            )}
            {patient.phone && (
              <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1.5 hover:text-heading">
                <Phone className="size-3.5" aria-hidden="true" />
                <span className="tabular">{patient.phone}</span>
              </a>
            )}
            {patient.email && (
              <a href={`mailto:${patient.email}`} className="hidden items-center gap-1.5 hover:text-heading sm:inline-flex">
                <Mail className="size-3.5" aria-hidden="true" />
                {patient.email}
              </a>
            )}
          </div>
        </div>
      </section>
      {alerts && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          <span>
            <b className="font-semibold">Medical alert:</b> {alerts}
          </span>
        </div>
      )}
      <PatientTabs patientId={patient.id} tabs={tabs} />
      {children}
    </>
  );
}
