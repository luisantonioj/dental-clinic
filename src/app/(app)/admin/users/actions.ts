"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, fail, formToObject, fromZodError, ok } from "@/lib/action-result";
import { createDentistSchema, resetPasswordSchema } from "@/lib/validation/users";
import { requireAdmin } from "@/server/auth";
import { createDentist, DuplicateEmailError, setAccountDisabled, setAccountPassword } from "@/server/data/users";

export async function createDentistAction(form: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();
  const parsed = createDentistSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    await createDentist(actor, parsed.data);
  } catch (e) {
    if (e instanceof DuplicateEmailError) return fail(e.message, { email: e.message });
    throw e;
  }
  revalidatePath("/admin/users");
  return ok();
}

export async function setDisabledAction(userId: string, disabled: boolean): Promise<ActionResult> {
  const actor = await requireAdmin();
  try {
    await setAccountDisabled(actor, userId, disabled);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't update the account");
  }
  revalidatePath("/admin/users");
  return ok();
}

export async function resetPasswordAction(form: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();
  const parsed = resetPasswordSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await setAccountPassword(actor, parsed.data.userId, parsed.data.password);
  return ok();
}
