import type { Metadata } from "next";
import { toCalendar } from "@/app/(app)/appointments/to-calendar";
import { todayManila } from "@/lib/format";
import { getCurrentWorkplace } from "@/server/current-workplace";
import { listPatientAppointments } from "@/server/data/appointments";
import { fullName } from "@/server/data/patients";
import { loadPatient } from "../../load-patient";
import { PatientAppointments } from "./patient-appointments";

export const metadata: Metadata = { title: "Appointments" };

export default async function PatientAppointmentsPage({ params }: PageProps<"/patients/[id]/appointments">) {
  const { id } = await params;
  const { actor, patient } = await loadPatient(id);
  const [rows, { current, workplaces }] = await Promise.all([
    listPatientAppointments(actor, id),
    getCurrentWorkplace(actor),
  ]);
  return (
    <PatientAppointments
      patient={{ id: patient.id, name: fullName(patient) }}
      appointments={rows.map(toCalendar)}
      workplaces={workplaces.map((w) => ({ id: w.id, name: w.name }))}
      defaultWorkplaceId={current?.id ?? null}
      today={todayManila()}
      now={new Date().toISOString()}
    />
  );
}
