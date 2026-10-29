"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, fromZodError, ok } from "@/lib/action-result";
import { chartEntrySchema } from "@/lib/validation/clinical";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { addChartEntry, removeChartEntry } from "@/server/data/chart";

export async function addChartEntryAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = chartEntrySchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    await addChartEntry(actor, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidatePath(`/patients/${parsed.data.patientId}/chart`);
  return ok();
}

export async function removeChartEntryAction(id: string, patientId: string): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await removeChartEntry(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidatePath(`/patients/${patientId}/chart`);
  return ok();
}
