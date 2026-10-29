import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workplaces } from "@/db/schema";
import type { WorkplaceInput } from "@/lib/validation/workplaces";
import { type Actor, NotFoundError, ownedBy } from "@/server/actor";
import { audit } from "./audit";

export type Workplace = typeof workplaces.$inferSelect;

export async function listWorkplaces(actor: Actor, opts: { includeInactive?: boolean } = {}): Promise<Workplace[]> {
  // Even admins list only their own workplaces here: this feeds pickers and the switcher.
  return db
    .select()
    .from(workplaces)
    .where(and(eq(workplaces.dentistId, actor.id), opts.includeInactive ? undefined : eq(workplaces.active, true)))
    .orderBy(desc(workplaces.active), asc(workplaces.createdAt));
}

export async function getWorkplace(actor: Actor, id: string): Promise<Workplace> {
  const [row] = await db
    .select()
    .from(workplaces)
    .where(and(eq(workplaces.id, id), ownedBy(actor, workplaces.dentistId)));
  if (!row) throw new NotFoundError("Workplace");
  return row;
}

/** Throws unless the workplace exists and belongs to the actor (used before linking rows to it). */
export async function assertOwnWorkplace(actor: Actor, id: string): Promise<Workplace> {
  const [row] = await db
    .select()
    .from(workplaces)
    .where(and(eq(workplaces.id, id), eq(workplaces.dentistId, actor.id)));
  if (!row) throw new NotFoundError("Workplace");
  return row;
}

export async function createWorkplace(actor: Actor, input: WorkplaceInput): Promise<Workplace> {
  const [row] = await db
    .insert(workplaces)
    .values({
      id: crypto.randomUUID(),
      dentistId: actor.id,
      name: input.name,
      address: input.address,
      phone: input.phone,
      type: input.type,
      commissionPct: input.commissionPct,
      deductLabFees: input.deductLabFees,
      color: input.color,
      active: input.active ?? true,
    })
    .returning();
  await audit(actor, "create", "workplace", row.id, { name: row.name });
  return row;
}

export async function updateWorkplace(actor: Actor, id: string, input: WorkplaceInput): Promise<Workplace> {
  const [row] = await db
    .update(workplaces)
    .set({
      name: input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
      type: input.type,
      commissionPct: input.commissionPct,
      deductLabFees: input.deductLabFees,
      color: input.color,
      active: input.active ?? true,
    })
    .where(and(eq(workplaces.id, id), eq(workplaces.dentistId, actor.id)))
    .returning();
  if (!row) throw new NotFoundError("Workplace");
  await audit(actor, "update", "workplace", id);
  return row;
}
