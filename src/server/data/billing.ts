import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { patients, payments, treatments, user, type WorkplaceColor, workplaces } from "@/db/schema";
import type { PaymentInput } from "@/lib/validation/billing";
import { type Actor, NotFoundError, ownedBy } from "@/server/actor";
import { audit } from "./audit";
import { assertOwnPatient } from "./patients";
import { assertOwnWorkplace } from "./workplaces";

export type Payment = typeof payments.$inferSelect;

export function receiptNumber(seq: number): string {
  return `AR-${String(seq).padStart(5, "0")}`;
}

export type Balance = { charges: number; paid: number; balance: number };

/** Patient balance = treatment fees − payments (voided payments don't count). */
export async function patientBalance(actor: Actor, patientId: string): Promise<Balance> {
  const [charges] = await db
    .select({ total: sql<string>`coalesce(sum(${treatments.fee}), 0)` })
    .from(treatments)
    .where(and(eq(treatments.patientId, patientId), ownedBy(actor, treatments.dentistId)));
  const [paid] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.patientId, patientId), ownedBy(actor, payments.dentistId), isNull(payments.voidedAt)));
  const c = Number(charges.total);
  const p = Number(paid.total);
  return { charges: c, paid: p, balance: c - p };
}

export type LedgerLine = {
  id: string;
  kind: "charge" | "payment";
  date: string;
  description: string;
  workplaceName: string;
  workplaceColor: WorkplaceColor;
  /** Positive for charges, negative for payments. */
  amount: number;
  voided: boolean;
  voidReason: string | null;
  receiptNo: string | null;
  method: Payment["method"] | null;
  reference: string | null;
  collectedBy: Payment["collectedBy"] | null;
  /** Running balance after this line (voided lines don't change it). */
  balance: number;
};

/** Charges and payments in date order with a running balance (newest first). */
export async function patientLedger(actor: Actor, patientId: string): Promise<LedgerLine[]> {
  const [charges, paid] = await Promise.all([
    db
      .select({
        id: treatments.id,
        date: treatments.date,
        createdAt: treatments.createdAt,
        procedure: treatments.procedure,
        teeth: treatments.teeth,
        fee: treatments.fee,
        workplaceName: workplaces.name,
        workplaceColor: workplaces.color,
      })
      .from(treatments)
      .innerJoin(workplaces, eq(workplaces.id, treatments.workplaceId))
      .where(and(eq(treatments.patientId, patientId), ownedBy(actor, treatments.dentistId))),
    db
      .select({
        payment: payments,
        workplaceName: workplaces.name,
        workplaceColor: workplaces.color,
      })
      .from(payments)
      .innerJoin(workplaces, eq(workplaces.id, payments.workplaceId))
      .where(and(eq(payments.patientId, patientId), ownedBy(actor, payments.dentistId))),
  ]);

  type Line = Omit<LedgerLine, "balance"> & { createdAt: Date };
  const lines: Line[] = [
    ...charges.map(
      (t): Line => ({
        id: t.id,
        kind: "charge",
        date: t.date,
        createdAt: t.createdAt,
        description: t.teeth.length ? `${t.procedure} (tooth ${t.teeth.join(", ")})` : t.procedure,
        workplaceName: t.workplaceName,
        workplaceColor: t.workplaceColor,
        amount: t.fee,
        voided: false,
        voidReason: null,
        receiptNo: null,
        method: null,
        reference: null,
        collectedBy: null,
      }),
    ),
    ...paid.map(
      ({ payment: p, workplaceName, workplaceColor }): Line => ({
        id: p.id,
        kind: "payment",
        date: p.date,
        createdAt: p.createdAt,
        description: "Payment",
        workplaceName,
        workplaceColor,
        amount: -p.amount,
        voided: Boolean(p.voidedAt),
        voidReason: p.voidReason,
        receiptNo: receiptNumber(p.receiptSeq),
        method: p.method,
        reference: p.reference,
        collectedBy: p.collectedBy,
      }),
    ),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.getTime() - b.createdAt.getTime());

  let running = 0;
  const withBalance = lines.map(({ createdAt, ...l }) => {
    if (!l.voided) running += l.amount;
    return { ...l, balance: running };
  });
  return withBalance.reverse();
}

export async function createPayment(actor: Actor, input: PaymentInput): Promise<Payment> {
  await assertOwnPatient(actor, input.patientId);
  await assertOwnWorkplace(actor, input.workplaceId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${payments.receiptSeq}), 0) + 1` })
      .from(payments)
      .where(eq(payments.dentistId, actor.id));
    try {
      const [row] = await db
        .insert(payments)
        .values({
          id: crypto.randomUUID(),
          dentistId: actor.id,
          patientId: input.patientId,
          workplaceId: input.workplaceId,
          receiptSeq: Number(next),
          date: input.date,
          amount: input.amount,
          method: input.method,
          reference: input.reference,
          collectedBy: input.collectedBy,
          notes: input.notes,
        })
        .returning();
      await audit(actor, "create", "payment", row.id, { amount: row.amount, patientId: row.patientId });
      return row;
    } catch (e) {
      if (attempt < 2 && String(e).includes("receipt_seq")) continue;
      throw e;
    }
  }
  throw new Error("Couldn't allocate a receipt number");
}

/** Voids a payment (a correction). The row and its receipt number are kept. */
export async function voidPayment(actor: Actor, id: string, reason: string): Promise<Payment> {
  const [row] = await db
    .update(payments)
    .set({ voidedAt: new Date(), voidReason: reason })
    .where(and(eq(payments.id, id), eq(payments.dentistId, actor.id), isNull(payments.voidedAt)))
    .returning();
  if (!row) throw new NotFoundError("Payment");
  await audit(actor, "update", "payment", id, { voided: true, reason });
  return row;
}

export type Receipt = {
  payment: Payment;
  receiptNo: string;
  patientName: string;
  patientCode: string;
  dentistName: string;
  dentistPrc: string | null;
  workplace: { name: string; address: string | null; phone: string | null };
};

export async function getReceipt(actor: Actor, paymentId: string): Promise<Receipt> {
  const [row] = await db
    .select({
      payment: payments,
      firstName: patients.firstName,
      middleName: patients.middleName,
      lastName: patients.lastName,
      patientCode: patients.code,
      dentistName: user.name,
      dentistPrc: user.prcLicense,
      wpName: workplaces.name,
      wpAddress: workplaces.address,
      wpPhone: workplaces.phone,
    })
    .from(payments)
    .innerJoin(patients, eq(patients.id, payments.patientId))
    .innerJoin(user, eq(user.id, payments.dentistId))
    .innerJoin(workplaces, eq(workplaces.id, payments.workplaceId))
    .where(and(eq(payments.id, paymentId), ownedBy(actor, payments.dentistId)));
  if (!row) throw new NotFoundError("Payment");
  return {
    payment: row.payment,
    receiptNo: receiptNumber(row.payment.receiptSeq),
    patientName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" "),
    patientCode: row.patientCode,
    dentistName: row.dentistName,
    dentistPrc: row.dentistPrc,
    workplace: { name: row.wpName, address: row.wpAddress, phone: row.wpPhone },
  };
}

export type OutstandingBalance = { patientId: string; name: string; code: string; balance: number };

/** Patients who owe money, largest first (for the dashboard). */
export async function outstandingBalances(actor: Actor, limit = 5): Promise<OutstandingBalance[]> {
  const charges = db
    .select({ patientId: treatments.patientId, total: sql<number>`sum(${treatments.fee})`.as("charges") })
    .from(treatments)
    .where(ownedBy(actor, treatments.dentistId))
    .groupBy(treatments.patientId)
    .as("c");
  const paid = db
    .select({ patientId: payments.patientId, total: sql<number>`sum(${payments.amount})`.as("paid") })
    .from(payments)
    .where(and(ownedBy(actor, payments.dentistId), isNull(payments.voidedAt)))
    .groupBy(payments.patientId)
    .as("p");
  const balanceExpr = sql<string>`${charges.total} - coalesce(${paid.total}, 0)`;
  const rows = await db
    .select({
      patientId: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      code: patients.code,
      balance: balanceExpr,
    })
    .from(charges)
    .innerJoin(patients, eq(patients.id, charges.patientId))
    .leftJoin(paid, eq(paid.patientId, charges.patientId))
    .where(and(sql`${balanceExpr} > 0`, isNull(patients.archivedAt)))
    .orderBy(desc(balanceExpr), asc(patients.lastName))
    .limit(limit);
  return rows.map((r) => ({
    patientId: r.patientId,
    name: `${r.firstName} ${r.lastName}`,
    code: r.code,
    balance: Number(r.balance),
  }));
}

/** Balances for a set of patients (patient list badges). */
export async function balancesFor(actor: Actor, patientIds: string[]): Promise<Map<string, number>> {
  if (patientIds.length === 0) return new Map();
  const [charges, paid] = await Promise.all([
    db
      .select({ patientId: treatments.patientId, total: sql<string>`sum(${treatments.fee})` })
      .from(treatments)
      .where(and(inArray(treatments.patientId, patientIds), ownedBy(actor, treatments.dentistId)))
      .groupBy(treatments.patientId),
    db
      .select({ patientId: payments.patientId, total: sql<string>`sum(${payments.amount})` })
      .from(payments)
      .where(and(inArray(payments.patientId, patientIds), ownedBy(actor, payments.dentistId), isNull(payments.voidedAt)))
      .groupBy(payments.patientId),
  ]);
  const map = new Map<string, number>();
  for (const c of charges) map.set(c.patientId, Number(c.total));
  for (const p of paid) map.set(p.patientId, (map.get(p.patientId) ?? 0) - Number(p.total));
  return map;
}
