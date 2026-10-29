import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { treatments, workplaces } from "@/db/schema";
import type { TreatmentInput } from "@/lib/validation/clinical";
import { type Actor, NotFoundError, ownedBy } from "@/server/actor";
import { audit } from "./audit";
import { assertOwnPatient } from "./patients";
import { assertOwnWorkplace } from "./workplaces";

export type Treatment = typeof treatments.$inferSelect;
export type TreatmentRow = Treatment & { workplaceName: string; workplaceColor: (typeof workplaces.$inferSelect)["color"] };

export async function listTreatments(actor: Actor, patientId: string): Promise<TreatmentRow[]> {
  return db
    .select({
      ...treatmentColumns,
      workplaceName: workplaces.name,
      workplaceColor: workplaces.color,
    })
    .from(treatments)
    .innerJoin(workplaces, eq(workplaces.id, treatments.workplaceId))
    .where(and(eq(treatments.patientId, patientId), ownedBy(actor, treatments.dentistId)))
    .orderBy(desc(treatments.date), desc(treatments.createdAt));
}

const treatmentColumns = {
  id: treatments.id,
  dentistId: treatments.dentistId,
  patientId: treatments.patientId,
  workplaceId: treatments.workplaceId,
  date: treatments.date,
  teeth: treatments.teeth,
  procedure: treatments.procedure,
  notes: treatments.notes,
  fee: treatments.fee,
  labFee: treatments.labFee,
  createdAt: treatments.createdAt,
  updatedAt: treatments.updatedAt,
};

export async function createTreatment(actor: Actor, input: TreatmentInput): Promise<Treatment> {
  await assertOwnPatient(actor, input.patientId);
  await assertOwnWorkplace(actor, input.workplaceId);
  const [row] = await db
    .insert(treatments)
    .values({
      id: crypto.randomUUID(),
      dentistId: actor.id,
      patientId: input.patientId,
      workplaceId: input.workplaceId,
      date: input.date,
      teeth: input.teeth,
      procedure: input.procedure,
      notes: input.notes,
      fee: input.fee,
      labFee: input.labFee,
    })
    .returning();
  await audit(actor, "create", "treatment", row.id, { patientId: row.patientId, fee: row.fee });
  return row;
}

export async function updateTreatment(actor: Actor, id: string, input: TreatmentInput): Promise<Treatment> {
  await assertOwnWorkplace(actor, input.workplaceId);
  const [row] = await db
    .update(treatments)
    .set({
      workplaceId: input.workplaceId,
      date: input.date,
      teeth: input.teeth,
      procedure: input.procedure,
      notes: input.notes ?? null,
      fee: input.fee,
      labFee: input.labFee,
    })
    .where(
      and(eq(treatments.id, id), eq(treatments.patientId, input.patientId), eq(treatments.dentistId, actor.id)),
    )
    .returning();
  if (!row) throw new NotFoundError("Treatment");
  await audit(actor, "update", "treatment", id, { fee: row.fee });
  return row;
}
