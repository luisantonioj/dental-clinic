import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { createPatientAction } from "../actions";
import { PatientForm } from "../patient-form";

export const metadata: Metadata = { title: "New patient" };

export default function NewPatientPage() {
  return (
    <>
      <PageHeader title="New patient" description="Only the first and last name are required. You can fill in the rest later." />
      <PatientForm action={createPatientAction} cancelHref="/patients" />
    </>
  );
}
