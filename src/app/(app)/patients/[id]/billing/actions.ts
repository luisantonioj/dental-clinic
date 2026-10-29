"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, fromZodError, ok } from "@/lib/action-result";
import { paymentSchema, voidPaymentSchema } from "@/lib/validation/billing";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { createPayment, voidPayment } from "@/server/data/billing";

function revalidate(patientId: string) {
  revalidatePath(`/patients/${patientId}`, "layout");
  revalidatePath("/patients");
  revalidatePath("/earnings");
  revalidatePath("/");
}

export async function addPaymentAction(form: FormData): Promise<ActionResult<{ paymentId: string }>> {
  const actor = await requireUser();
  const parsed = paymentSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const payment = await createPayment(actor, parsed.data);
    revalidate(parsed.data.patientId);
    return ok({ paymentId: payment.id });
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
}

export async function voidPaymentAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = voidPaymentSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const row = await voidPayment(actor, parsed.data.paymentId, parsed.data.reason);
    revalidate(row.patientId);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  return ok();
}
