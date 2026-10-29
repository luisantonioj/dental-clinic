import { describe, expect, it } from "vitest";
import { paymentSchema } from "@/lib/validation/billing";
import { treatmentSchema } from "@/lib/validation/clinical";
import { NotFoundError } from "@/server/actor";
import { makeActor } from "../../../tests/support/factories";
import { addPatient, addWorkplace } from "../../../tests/support/fixtures";
import {
  balancesFor,
  createPayment,
  getReceipt,
  outstandingBalances,
  patientBalance,
  patientLedger,
  voidPayment,
} from "./billing";
import { createTreatment } from "./treatments";

async function setup() {
  const a = await makeActor();
  const p = await addPatient(a, { firstName: "Ana", lastName: "Reyes" });
  const w = await addWorkplace(a, { address: "18 Mabini St., Marikina", phone: "0917 555 0100" });
  const charge = (fee: string, date = "2026-10-01") =>
    createTreatment(a, treatmentSchema.parse({ patientId: p.id, workplaceId: w.id, date, procedure: "Filling", fee }));
  const pay = (amount: string, date = "2026-10-02", extra: Record<string, string> = {}) =>
    createPayment(a, paymentSchema.parse({ patientId: p.id, workplaceId: w.id, date, amount, method: "gcash", ...extra }));
  return { a, p, w, charge, pay };
}

describe("billing", () => {
  it("computes the balance from fees minus payments", async () => {
    const { a, p, charge, pay } = await setup();
    await charge("1,500");
    await charge("2,000");
    await pay("1,000");
    expect(await patientBalance(a, p.id)).toEqual({ charges: 350000, paid: 100000, balance: 250000 });
  });

  it("numbers receipts per dentist and keeps voided payments out of the balance", async () => {
    const { a, p, charge, pay } = await setup();
    await charge("1,000");
    const first = await pay("500");
    const second = await pay("500");
    expect([first.receiptSeq, second.receiptSeq]).toEqual([1, 2]);
    await voidPayment(a, second.id, "Entered twice");
    expect((await patientBalance(a, p.id)).balance).toBe(50000);
    await expect(voidPayment(a, second.id, "again")).rejects.toBeInstanceOf(NotFoundError);

    const ledger = await patientLedger(a, p.id);
    expect(ledger.map((l) => [l.kind, l.amount, l.voided, l.balance])).toEqual([
      ["payment", -50000, true, 50000],
      ["payment", -50000, false, 50000],
      ["charge", 100000, false, 100000],
    ]);
  });

  it("builds a receipt with the workplace header", async () => {
    const { a, pay } = await setup();
    const payment = await pay("750", "2026-10-05", { reference: "GC-123" });
    const r = await getReceipt(a, payment.id);
    expect(r).toMatchObject({ receiptNo: "AR-00001", patientName: "Ana Reyes", workplace: { name: "Home Clinic" } });
    expect(r.payment.reference).toBe("GC-123");
  });

  it("lists outstanding balances and per-patient balances", async () => {
    const { a, p, w, charge, pay } = await setup();
    await charge("3,000");
    await pay("1,000");
    const other = await addPatient(a, { firstName: "Paid", lastName: "Up" });
    await createTreatment(a, treatmentSchema.parse({ patientId: other.id, workplaceId: w.id, date: "2026-10-01", procedure: "X", fee: "100" }));
    await createPayment(a, paymentSchema.parse({ patientId: other.id, workplaceId: w.id, date: "2026-10-01", amount: "100", method: "cash" }));

    expect(await outstandingBalances(a)).toEqual([{ patientId: p.id, name: "Ana Reyes", code: p.code, balance: 200000 }]);
    const map = await balancesFor(a, [p.id, other.id]);
    expect(map.get(p.id)).toBe(200000);
    expect(map.get(other.id)).toBe(0);
  });

  it("keeps billing private between dentists", async () => {
    const { p, w, charge, pay } = await setup();
    await charge("1,000");
    const payment = await pay("100");
    const b = await makeActor();
    expect(await patientBalance(b, p.id)).toEqual({ charges: 0, paid: 0, balance: 0 });
    expect(await patientLedger(b, p.id)).toEqual([]);
    expect(await outstandingBalances(b)).toEqual([]);
    await expect(getReceipt(b, payment.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(voidPayment(b, payment.id, "x")).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      createPayment(b, paymentSchema.parse({ patientId: p.id, workplaceId: w.id, date: "2026-10-01", amount: "1", method: "cash" })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
