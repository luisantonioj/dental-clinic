"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail, formToObject, fromZodError, ok } from "@/lib/action-result";
import { todayManila } from "@/lib/format";
import { itemSchema, movementSchema } from "@/lib/validation/inventory";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { addMovement, createItem, listMovements, updateItem } from "@/server/data/inventory";

function revalidate() {
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function saveItemAction(form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  const data = formToObject(form);
  const parsed = itemSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);
  const id = typeof data.id === "string" && data.id ? data.id : null;
  const opening = z.coerce.number().int().min(0).catch(0).parse(data.openingStock ?? 0);
  try {
    if (id) await updateItem(actor, id, parsed.data);
    else await createItem(actor, parsed.data, opening, todayManila());
  } catch (e) {
    if (e instanceof NotFoundError) return fail(e.message);
    throw e;
  }
  revalidate();
  return ok();
}

export async function addMovementAction(form: FormData): Promise<ActionResult<{ stock: number }>> {
  const actor = await requireUser();
  const parsed = movementSchema.safeParse(formToObject(form));
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const { stock } = await addMovement(actor, parsed.data);
    revalidate();
    return ok({ stock });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't save");
  }
}

export type MovementView = { id: string; date: string; qty: number; type: string; reason: string | null };

export async function movementsAction(itemId: string): Promise<MovementView[]> {
  const actor = await requireUser();
  const rows = await listMovements(actor, String(itemId));
  return rows.map((m) => ({ id: m.id, date: m.date, qty: m.qty, type: m.type, reason: m.reason }));
}
