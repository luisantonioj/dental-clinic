// Pure earnings math (all amounts in centavos). See docs/architecture.md.

export type EarningsInput = {
  type: "own" | "partner";
  commissionPct: number;
  deductLabFees: boolean;
  /** Treatment fees in the period. */
  gross: number;
  /** Non-voided payments in the period. */
  collected: number;
  /** Of `collected`, what the dentist received herself (partner clinics). */
  collectedByMe: number;
  labFees: number;
  expenses: number;
  /** Money the partner clinic paid her in the period. */
  payouts: number;
};

export type Earnings = EarningsInput & {
  /** Amount the commission applies to. */
  base: number;
  /** Her share of collections (100% at her own clinic). */
  share: number;
  /** What she keeps after her costs. */
  net: number;
  /** Partner clinics: share − what she already holds − payouts. Negative means she owes the clinic. */
  owedByClinic: number;
};

export function computeEarnings(i: EarningsInput): Earnings {
  if (i.type === "own") {
    const share = i.collected;
    return {
      ...i,
      base: i.collected,
      share,
      // At her own clinic lab fees are her own costs.
      net: share - i.labFees - i.expenses,
      owedByClinic: 0,
    };
  }
  const base = Math.max(0, i.collected - (i.deductLabFees ? i.labFees : 0));
  const share = Math.round((base * i.commissionPct) / 100);
  return {
    ...i,
    base,
    share,
    net: share - i.expenses,
    owedByClinic: share - i.collectedByMe - i.payouts,
  };
}
