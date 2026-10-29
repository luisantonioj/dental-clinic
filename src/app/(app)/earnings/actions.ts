"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, fromZodError, ok } from "@/lib/action-result";
import { expenseSchema, payoutSchema } from "@/lib/validation/earnings";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { createExpense, createPayout, voidEarningsEntry } from "@/server/data/earnings";

export async function addPayoutAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = payoutSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    await createPayout(actor, parsed.data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't save the payout");
  }
  revalidatePath("/earnings");
  revalidatePath("/");
  return ok();
}

export async function addExpenseAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = expenseSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    await createExpense(actor, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidatePath("/earnings");
  revalidatePath("/");
  return ok();
}

export async function voidEntryAction(kind: "payout" | "expense", id: string): Promise<ActionResult> {
  const actor = await requireUser();
  if (kind !== "payout" && kind !== "expense") return fail("Unknown entry");
  try {
    await voidEarningsEntry(actor, kind, id);
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidatePath("/earnings");
  revalidatePath("/");
  return ok();
}
