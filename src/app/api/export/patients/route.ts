import { NextResponse } from "next/server";
import { csvResponse, toCsv } from "@/lib/csv";
import { formatDateTime, todayManila } from "@/lib/format";
import { getActor } from "@/server/auth";
import { exportPatients } from "@/server/data/patients";

/** All of the signed-in dentist's patients as CSV (a backup they can open in Excel). */
export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rows = await exportPatients(actor);
  const csv = toCsv(
    [
      "Code",
      "First name",
      "Middle name",
      "Last name",
      "Birthdate",
      "Sex",
      "Mobile",
      "Email",
      "Address",
      "Occupation",
      "Emergency contact",
      "Emergency relationship",
      "Emergency phone",
      "Allergies",
      "Medical conditions",
      "Medications",
      "Notes",
      "Privacy consent",
      "Email reminders",
      "Archived",
      "Added",
    ],
    rows.map((p) => [
      p.code,
      p.firstName,
      p.middleName,
      p.lastName,
      p.birthdate,
      p.sex,
      p.phone,
      p.email,
      p.address,
      p.occupation,
      p.emergencyName,
      p.emergencyRelation,
      p.emergencyPhone,
      p.allergies,
      p.medicalConditions,
      p.medications,
      p.notes,
      p.consentAt ? formatDateTime(p.consentAt) : "",
      p.remindersOptIn ? "Yes" : "No",
      p.archivedAt ? formatDateTime(p.archivedAt) : "",
      formatDateTime(p.createdAt),
    ]),
  );
  return csvResponse(`dentalkeep-patients-${todayManila()}.csv`, csv);
}
