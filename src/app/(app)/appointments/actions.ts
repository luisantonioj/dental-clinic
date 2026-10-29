"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, fromZodError, ok } from "@/lib/action-result";
import { appointmentSchema, appointmentStatusSchema } from "@/lib/validation/appointments";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { createAppointment, setAppointmentStatus, updateAppointment } from "@/server/data/appointments";
import { sendReminderNow } from "@/server/reminders";

function revalidate(patientId: string) {
  revalidatePath("/appointments");
  revalidatePath("/");
  revalidatePath(`/patients/${patientId}`, "layout");
}

export async function saveAppointmentAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const data = formToObject(form);
  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);
  const id = typeof data.id === "string" && data.id ? data.id : null;
  try {
    if (id) await updateAppointment(actor, id, parsed.data);
    else await createAppointment(actor, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidate(parsed.data.patientId);
  return ok();
}

export async function setAppointmentStatusAction(id: string, status: string): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = appointmentStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Unknown status");
  try {
    const row = await setAppointmentStatus(actor, id, parsed.data);
    revalidate(row.patientId);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  return ok();
}

export async function sendReminderAction(id: string): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    const result = await sendReminderNow(actor, id);
    if (!result.ok) return fail(`Couldn't send: ${result.error}`);
  } catch (e) {
    if (e instanceof NotFoundError) return fail("This patient has no email address on file.");
    throw e;
  }
  revalidatePath("/appointments");
  return ok();
}
