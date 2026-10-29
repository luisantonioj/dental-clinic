import { describe, expect, it } from "vitest";
import { paymentSchema } from "@/lib/validation/billing";
import { treatmentSchema } from "@/lib/validation/clinical";
import { expenseSchema, payoutSchema } from "@/lib/validation/earnings";
import { NotFoundError } from "@/server/actor";
import { makeActor } from "../../../tests/support/factories";
import { addPartnerClinic, addPatient, addWorkplace } from "../../../tests/support/fixtures";
import { createPayment } from "./billing";
import { createExpense, createPayout, earningsByWorkplace, listExpenses, voidEarningsEntry } from "./earnings";
import { createTreatment } from "./treatments";

const OCT = { start: "2026-10-01", end: "2026-10-31" };

describe("earnings by workplace", () => {
  it("splits partner-clinic collections and keeps her own clinic separate", async () => {
    const a = await makeActor();
    const p = await addPatient(a);
    const partner = await addPartnerClinic(a); // 40%, lab fees deducted
    const home = await addWorkplace(a);

    // Partner: ₱10,000 crown with ₱2,000 lab fee; clinic collected ₱10,000; paid her ₱1,000 so far.
    await createTreatment(a, treatmentSchema.parse({ patientId: p.id, workplaceId: partner.id, date: "2026-10-05", procedure: "Crown", fee: "10000", labFee: "2000" }));
    await createPayment(a, paymentSchema.parse({ patientId: p.id, workplaceId: partner.id, date: "2026-10-05", amount: "10000", method: "cash", collectedBy: "clinic" }));
    await createPayout(a, payoutSchema.parse({ workplaceId: partner.id, date: "2026-10-15", amount: "1000" }));

    // Home: ₱1,500 cleaning collected, ₱300 supplies.
    await createTreatment(a, treatmentSchema.parse({ patientId: p.id, workplaceId: home.id, date: "2026-10-07", procedure: "Cleaning", fee: "1500" }));
    await createPayment(a, paymentSchema.parse({ patientId: p.id, workplaceId: home.id, date: "2026-10-07", amount: "1500", method: "gcash" }));
    await createExpense(a, expenseSchema.parse({ workplaceId: home.id, date: "2026-10-08", category: "supplies", amount: "300" }));

    // Outside the month: ignored.
    await createPayment(a, paymentSchema.parse({ patientId: p.id, workplaceId: home.id, date: "2026-11-01", amount: "999", method: "cash" }));

    const [pe, he] = await earningsByWorkplace(a, OCT);
    expect(pe).toMatchObject({ name: "Partner Clinic", gross: 1_000_000, collected: 1_000_000, labFees: 200_000, share: 320_000, payouts: 100_000, owedByClinic: 220_000 });
    expect(he).toMatchObject({ name: "Home Clinic", collected: 150_000, share: 150_000, expenses: 30_000, net: 120_000 });
  });

  it("only allows payouts at partner clinics and keeps entries private", async () => {
    const a = await makeActor();
    const b = await makeActor();
    const home = await addWorkplace(a);
    await expect(createPayout(a, payoutSchema.parse({ workplaceId: home.id, date: "2026-10-01", amount: "1" }))).rejects.toThrow();
    await expect(
      createExpense(b, expenseSchema.parse({ workplaceId: home.id, date: "2026-10-01", category: "rent", amount: "1" })),
    ).rejects.toBeInstanceOf(NotFoundError);

    const exp = await createExpense(a, expenseSchema.parse({ workplaceId: home.id, date: "2026-10-01", category: "rent", amount: "5000" }));
    expect(await earningsByWorkplace(b, OCT)).toEqual([]);
    await expect(voidEarningsEntry(b, "expense", exp.id)).rejects.toBeInstanceOf(NotFoundError);
    await voidEarningsEntry(a, "expense", exp.id);
    expect(await listExpenses(a, OCT)).toHaveLength(0);
    expect((await earningsByWorkplace(a, OCT))[0].expenses).toBe(0);
  });
});
