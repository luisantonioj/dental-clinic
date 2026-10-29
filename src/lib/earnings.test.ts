import { describe, expect, it } from "vitest";
import { computeEarnings, type EarningsInput } from "./earnings";

const base: EarningsInput = {
  type: "partner",
  commissionPct: 40,
  deductLabFees: true,
  gross: 0,
  collected: 0,
  collectedByMe: 0,
  labFees: 0,
  expenses: 0,
  payouts: 0,
};

describe("computeEarnings", () => {
  it("takes lab fees off the top before the partner split", () => {
    // ₱10,000 collected, ₱2,000 lab → 40% of ₱8,000 = ₱3,200
    const e = computeEarnings({ ...base, gross: 1_000_000, collected: 1_000_000, labFees: 200_000 });
    expect(e.base).toBe(800_000);
    expect(e.share).toBe(320_000);
    expect(e.owedByClinic).toBe(320_000);
  });

  it("splits the full collection when lab fees aren't deducted", () => {
    const e = computeEarnings({ ...base, deductLabFees: false, collected: 1_000_000, labFees: 200_000 });
    expect(e.share).toBe(400_000);
  });

  it("reconciles what the clinic still owes after payouts and money she collected", () => {
    const e = computeEarnings({ ...base, collected: 1_000_000, collectedByMe: 100_000, payouts: 150_000 });
    // share 400,000 − held 100,000 − paid 150,000
    expect(e.owedByClinic).toBe(150_000);
    const overpaid = computeEarnings({ ...base, collected: 100_000, collectedByMe: 100_000 });
    expect(overpaid.owedByClinic).toBe(-60_000); // she holds more than her share
  });

  it("keeps 100% at her own clinic, minus lab fees and expenses", () => {
    const e = computeEarnings({ ...base, type: "own", commissionPct: 100, collected: 500_000, labFees: 50_000, expenses: 120_000 });
    expect(e.share).toBe(500_000);
    expect(e.net).toBe(330_000);
    expect(e.owedByClinic).toBe(0);
  });

  it("never applies the commission to a negative base", () => {
    expect(computeEarnings({ ...base, collected: 100_000, labFees: 300_000 }).share).toBe(0);
  });
});
