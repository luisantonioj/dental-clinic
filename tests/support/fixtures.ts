import { patientSchema } from "@/lib/validation/patients";
import { workplaceSchema } from "@/lib/validation/workplaces";
import type { Actor } from "@/server/actor";
import { createPatient } from "@/server/data/patients";
import { createWorkplace } from "@/server/data/workplaces";

/** Creates a patient from form-like values (only names are required). */
export function addPatient(actor: Actor, values: Record<string, string> = {}) {
  return createPatient(
    actor,
    patientSchema.parse({ firstName: "Juan", lastName: "Dela Cruz", consent: "on", ...values }),
  );
}

export function addWorkplace(actor: Actor, values: Record<string, string> = {}) {
  return createWorkplace(actor, workplaceSchema.parse({ name: "Home Clinic", type: "own", ...values }));
}

export function addPartnerClinic(actor: Actor, values: Record<string, string> = {}) {
  return addWorkplace(actor, {
    name: "Partner Clinic",
    type: "partner",
    commissionPct: "40",
    deductLabFees: "on",
    ...values,
  });
}
