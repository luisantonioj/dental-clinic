import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { chartEntries } from "@/db/schema";
import { WHOLE_TOOTH } from "@/lib/teeth";
import type { ChartEntryInput } from "@/lib/validation/clinical";
import { type Actor, NotFoundError, ownedBy } from "@/server/actor";
import { audit } from "./audit";
import { assertOwnPatient } from "./patients";

export type ChartEntry = typeof chartEntries.$inferSelect;

/** Current (not removed) chart entries for a patient, oldest first so later ones win. */
export async function listChartEntries(actor: Actor, patientId: string): Promise<ChartEntry[]> {
  return db
    .select()
    .from(chartEntries)
    .where(
      and(eq(chartEntries.patientId, patientId), ownedBy(actor, chartEntries.dentistId), isNull(chartEntries.removedAt)),
    )
    .orderBy(asc(chartEntries.date), asc(chartEntries.createdAt));
}

export async function addChartEntry(actor: Actor, input: ChartEntryInput): Promise<ChartEntry> {
  await assertOwnPatient(actor, input.patientId);
  const [row] = await db
    .insert(chartEntries)
    .values({
      id: crypto.randomUUID(),
      dentistId: actor.id,
      patientId: input.patientId,
      tooth: input.tooth,
      // Whole-tooth conditions (crown, missing…) don't use surfaces.
      surfaces: WHOLE_TOOTH.has(input.condition) ? [] : input.surfaces,
      condition: input.condition,
      status: input.status,
      date: input.date,
      notes: input.notes,
    })
    .returning();
  await audit(actor, "create", "chart_entry", row.id, { tooth: row.tooth, condition: row.condition });
  return row;
}

/** Hides an entry from the chart but keeps it in the database for history. */
export async function removeChartEntry(actor: Actor, id: string): Promise<void> {
  const [row] = await db
    .update(chartEntries)
    .set({ removedAt: new Date() })
    .where(and(eq(chartEntries.id, id), eq(chartEntries.dentistId, actor.id), isNull(chartEntries.removedAt)))
    .returning({ id: chartEntries.id });
  if (!row) throw new NotFoundError("Chart entry");
  await audit(actor, "delete", "chart_entry", id);
}
