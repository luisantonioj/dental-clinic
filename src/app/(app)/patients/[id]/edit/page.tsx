import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { fullName } from "@/server/data/patients";
import { updatePatientAction } from "../../actions";
import { loadPatient } from "../../load-patient";
import { PatientForm } from "../../patient-form";

export const metadata: Metadata = { title: "Edit patient" };

export default async function EditPatientPage({ params }: PageProps<"/patients/[id]/edit">) {
  const { id } = await params;
  const { patient } = await loadPatient(id);
  return (
    <>
      <PageHeader title={`Edit ${fullName(patient)}`} description={patient.code} />
      <PatientForm patient={patient} action={updatePatientAction.bind(null, patient.id)} cancelHref={`/patients/${id}`} />
    </>
  );
}
