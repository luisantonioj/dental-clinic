import type { Metadata } from "next";
import { todayManila } from "@/lib/format";
import { listChartEntries } from "@/server/data/chart";
import { loadPatient } from "../../load-patient";
import { ToothChart } from "./tooth-chart";

export const metadata: Metadata = { title: "Dental chart" };

export default async function ChartPage({ params }: PageProps<"/patients/[id]/chart">) {
  const { id } = await params;
  const { actor, patient } = await loadPatient(id);
  const entries = await listChartEntries(actor, id);
  return (
    <ToothChart
      patientId={patient.id}
      today={todayManila()}
      entries={entries.map((e) => ({
        id: e.id,
        tooth: e.tooth,
        surfaces: e.surfaces,
        condition: e.condition,
        status: e.status,
        date: e.date,
        notes: e.notes,
      }))}
    />
  );
}
