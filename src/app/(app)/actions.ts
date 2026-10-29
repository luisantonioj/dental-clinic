"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { requireUser } from "@/server/auth";
import { WORKPLACE_COOKIE } from "@/server/current-workplace";
import { assertOwnWorkplace } from "@/server/data/workplaces";

export async function selectWorkplaceAction(id: string): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await assertOwnWorkplace(actor, id);
  } catch {
    return fail("Workplace not found");
  }
  (await cookies()).set(WORKPLACE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  revalidatePath("/", "layout");
  return ok();
}
