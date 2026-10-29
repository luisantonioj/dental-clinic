"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, fromZodError, ok } from "@/lib/action-result";
import { treatmentSchema } from "@/lib/validation/clinical";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { createTreatment, updateTreatment } from "@/server/data/treatments";

export async function saveTreatmentAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const data = formToObject(form);
  const parsed = treatmentSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);
  const id = typeof data.id === "string" && data.id ? data.id : null;
  try {
    if (id) await updateTreatment(actor, id, parsed.data);
    else await createTreatment(actor, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidatePath(`/patients/${parsed.data.patientId}`, "layout");
  return ok();
}
