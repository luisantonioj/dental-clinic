import { NextResponse } from "next/server";
import { csvResponse, pesos, toCsv } from "@/lib/csv";
import { monthRange, todayManila } from "@/lib/format";
import { monthParam } from "@/lib/validation/earnings";
import { getActor } from "@/server/auth";
import { earningsByWorkplace } from "@/server/data/earnings";

/** Monthly earnings per workplace as CSV: /api/export/earnings?month=2026-10 */
export async function GET(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = monthParam.safeParse(new URL(request.url).searchParams.get("month") ?? undefined);
  if (!parsed.success) return NextResponse.json({ error: "Use ?month=YYYY-MM" }, { status: 400 });
  const month = parsed.data ?? todayManila().slice(0, 7);

  const rows = await earningsByWorkplace(actor, monthRange(month));
  const csv = toCsv(
    [
      "Month",
      "Workplace",
      "Type",
      "Share %",
      "Treatment fees",
      "Collected",
      "Lab fees",
      "Your share",
      "Collected by you",
      "Payouts received",
      "Clinic still owes you",
      "Expenses",
      "Net",
    ],
    rows.map((w) => [
      month,
      w.name,
      w.type === "own" ? "Own clinic" : "Partner clinic",
      w.commissionPct,
      pesos(w.gross),
      pesos(w.collected),
      pesos(w.labFees),
      pesos(w.share),
      pesos(w.collectedByMe),
      pesos(w.payouts),
      pesos(w.owedByClinic),
      pesos(w.expenses),
      pesos(w.net),
    ]),
  );
  return csvResponse(`dentalkeep-earnings-${month}.csv`, csv);
}
