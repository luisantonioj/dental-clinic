"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, formToObject, fromZodError, ok } from "@/lib/action-result";
import { profileSchema } from "@/lib/validation/users";
import { workplaceSchema } from "@/lib/validation/workplaces";
import { requireUser } from "@/server/auth";
import { updateProfile } from "@/server/data/users";
import { createWorkplace, updateWorkplace } from "@/server/data/workplaces";

export async function updateProfileAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = profileSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await updateProfile(actor, parsed.data);
  revalidatePath("/", "layout");
  return ok();
}

export async function saveWorkplaceAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const data = formToObject(form);
  const parsed = workplaceSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);
  const id = typeof data.id === "string" && data.id ? data.id : null;
  if (id) await updateWorkplace(actor, id, parsed.data);
  else await createWorkplace(actor, parsed.data);
  revalidatePath("/", "layout");
  return ok();
}
