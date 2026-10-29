"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fail, formToObject, fromZodError, ok } from "@/lib/action-result";
import { patientSchema } from "@/lib/validation/patients";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { createPatient, setPatientArchived, updatePatient } from "@/server/data/patients";

export async function createPatientAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = patientSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  const patient = await createPatient(actor, parsed.data);
  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatientAction(id: string, form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = patientSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    await updatePatient(actor, id, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidatePath(`/patients/${id}`, "layout");
  redirect(`/patients/${id}`);
}

export async function setArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await setPatientArchived(actor, id, archived);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`, "layout");
  return ok();
}
