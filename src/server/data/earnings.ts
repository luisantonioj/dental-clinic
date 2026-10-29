import "server-only";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, payments, payouts, treatments, type WorkplaceColor, workplaces } from "@/db/schema";
import { computeEarnings, type Earnings } from "@/lib/earnings";
import type { ExpenseInput, PayoutInput } from "@/lib/validation/earnings";
import { type Actor, NotFoundError } from "@/server/actor";
import { audit } from "./audit";
import { assertOwnWorkplace } from "./workplaces";

export type WorkplaceEarnings = Earnings & {
  workplaceId: string;
  name: string;
  color: WorkplaceColor;
};

const sum = (column: Parameters<typeof sql>[1]) => sql<string>`coalesce(sum(${column}), 0)`;

/**
 * Earnings per workplace for a date range (inclusive). Fees and lab fees are
 * counted by treatment date; collections by payment date.
 */
export async function earningsByWorkplace(
  actor: Actor,
  range: { start: string; end: string },
): Promise<WorkplaceEarnings[]> {
  const list = await db.select().from(workplaces).where(eq(workplaces.dentistId, actor.id)).orderBy(workplaces.createdAt);
  const inRange = <T extends typeof treatments.date | typeof payments.date | typeof payouts.date | typeof expenses.date>(c: T) =>
    and(gte(c, range.start), lte(c, range.end));

  const [fees, collected, paid, spent] = await Promise.all([
    db
      .select({ workplaceId: treatments.workplaceId, gross: sum(treatments.fee), labFees: sum(treatments.labFee) })
      .from(treatments)
      .where(and(eq(treatments.dentistId, actor.id), inRange(treatments.date)))
      .groupBy(treatments.workplaceId),
    db
      .select({
        workplaceId: payments.workplaceId,
        collected: sum(payments.amount),
        collectedByMe: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.collectedBy} = 'me'), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.dentistId, actor.id), isNull(payments.voidedAt), inRange(payments.date)))
      .groupBy(payments.workplaceId),
    db
      .select({ workplaceId: payouts.workplaceId, total: sum(payouts.amount) })
      .from(payouts)
      .where(and(eq(payouts.dentistId, actor.id), isNull(payouts.voidedAt), inRange(payouts.date)))
      .groupBy(payouts.workplaceId),
    db
      .select({ workplaceId: expenses.workplaceId, total: sum(expenses.amount) })
      .from(expenses)
      .where(and(eq(expenses.dentistId, actor.id), isNull(expenses.voidedAt), inRange(expenses.date)))
      .groupBy(expenses.workplaceId),
  ]);

  const by = <T extends { workplaceId: string }>(rows: T[]) => new Map(rows.map((r) => [r.workplaceId, r]));
  const feeMap = by(fees);
  const colMap = by(collected);
  const payMap = by(paid);
  const expMap = by(spent);

  return list
    .map((w) => ({
      workplaceId: w.id,
      name: w.name,
      color: w.color,
      active: w.active,
      ...computeEarnings({
        type: w.type,
        commissionPct: w.commissionPct,
        deductLabFees: w.deductLabFees,
        gross: Number(feeMap.get(w.id)?.gross ?? 0),
        labFees: Number(feeMap.get(w.id)?.labFees ?? 0),
        collected: Number(colMap.get(w.id)?.collected ?? 0),
        collectedByMe: Number(colMap.get(w.id)?.collectedByMe ?? 0),
        payouts: Number(payMap.get(w.id)?.total ?? 0),
        expenses: Number(expMap.get(w.id)?.total ?? 0),
      }),
    }))
    // Hide inactive workplaces that had no activity in the period.
    .filter((w) => w.active || w.gross || w.collected || w.payouts || w.expenses)
    .map(({ active: _active, ...w }) => w);
}

export type Payout = typeof payouts.$inferSelect & { workplaceName: string };
export type Expense = typeof expenses.$inferSelect & { workplaceName: string };

export async function listPayouts(actor: Actor, range: { start: string; end: string }): Promise<Payout[]> {
  return db
    .select({ ...payoutColumns, workplaceName: workplaces.name })
    .from(payouts)
    .innerJoin(workplaces, eq(workplaces.id, payouts.workplaceId))
    .where(and(eq(payouts.dentistId, actor.id), isNull(payouts.voidedAt), gte(payouts.date, range.start), lte(payouts.date, range.end)))
    .orderBy(desc(payouts.date));
}

export async function listExpenses(actor: Actor, range: { start: string; end: string }): Promise<Expense[]> {
  return db
    .select({ ...expenseColumns, workplaceName: workplaces.name })
    .from(expenses)
    .innerJoin(workplaces, eq(workplaces.id, expenses.workplaceId))
    .where(and(eq(expenses.dentistId, actor.id), isNull(expenses.voidedAt), gte(expenses.date, range.start), lte(expenses.date, range.end)))
    .orderBy(desc(expenses.date));
}

const payoutColumns = {
  id: payouts.id,
  dentistId: payouts.dentistId,
  workplaceId: payouts.workplaceId,
  date: payouts.date,
  periodStart: payouts.periodStart,
  periodEnd: payouts.periodEnd,
  amount: payouts.amount,
  notes: payouts.notes,
  voidedAt: payouts.voidedAt,
  createdAt: payouts.createdAt,
  updatedAt: payouts.updatedAt,
};

const expenseColumns = {
  id: expenses.id,
  dentistId: expenses.dentistId,
  workplaceId: expenses.workplaceId,
  date: expenses.date,
  category: expenses.category,
  amount: expenses.amount,
  notes: expenses.notes,
  voidedAt: expenses.voidedAt,
  createdAt: expenses.createdAt,
  updatedAt: expenses.updatedAt,
};

export async function createPayout(actor: Actor, input: PayoutInput) {
  const w = await assertOwnWorkplace(actor, input.workplaceId);
  if (w.type !== "partner") throw new Error("Payouts are only for partner clinics");
  const [row] = await db
    .insert(payouts)
    .values({ id: crypto.randomUUID(), dentistId: actor.id, ...input })
    .returning();
  await audit(actor, "create", "payout", row.id, { amount: row.amount });
  return row;
}

export async function createExpense(actor: Actor, input: ExpenseInput) {
  await assertOwnWorkplace(actor, input.workplaceId);
  const [row] = await db
    .insert(expenses)
    .values({ id: crypto.randomUUID(), dentistId: actor.id, ...input })
    .returning();
  await audit(actor, "create", "expense", row.id, { amount: row.amount });
  return row;
}

/** Voids a payout or expense entered by mistake (kept for history). */
export async function voidEarningsEntry(actor: Actor, kind: "payout" | "expense", id: string): Promise<void> {
  const table = kind === "payout" ? payouts : expenses;
  const rows = await db
    .update(table)
    .set({ voidedAt: new Date() })
    .where(and(eq(table.id, id), eq(table.dentistId, actor.id), isNull(table.voidedAt)))
    .returning({ id: table.id });
  if (!rows.length) throw new NotFoundError(kind === "payout" ? "Payout" : "Expense");
  await audit(actor, "update", kind, id, { voided: true });
}
