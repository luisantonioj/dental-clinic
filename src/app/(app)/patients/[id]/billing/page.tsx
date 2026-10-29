import { Printer, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { WorkplaceTag } from "@/components/app/workplace-tag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPeso, todayManila } from "@/lib/format";
import { cn } from "@/lib/utils";
import { METHOD_LABELS } from "@/lib/validation/billing";
import { getCurrentWorkplace } from "@/server/current-workplace";
import { patientBalance, patientLedger } from "@/server/data/billing";
import { loadPatient } from "../../load-patient";
import { AddPaymentDialog, VoidPaymentButton } from "./payment-dialogs";

export const metadata: Metadata = { title: "Billing" };

function Stat({ label, value, tone }: { label: string; value: number; tone?: "due" | "ok" }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-card">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          "tabular mt-1 text-xl font-semibold text-heading",
          tone === "due" && "text-destructive",
          tone === "ok" && "text-success",
        )}
      >
        {formatPeso(value)}
      </div>
    </div>
  );
}

export default async function BillingPage({ params }: PageProps<"/patients/[id]/billing">) {
  const { id } = await params;
  const { actor, patient } = await loadPatient(id);
  const [balance, ledger, { current, workplaces }] = await Promise.all([
    patientBalance(actor, id),
    patientLedger(actor, id),
    getCurrentWorkplace(actor),
  ]);

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total charges" value={balance.charges} />
        <Stat label="Total paid" value={balance.paid} />
        <Stat label={balance.balance < 0 ? "Advance payment" : "Balance"} value={Math.abs(balance.balance)} tone={balance.balance > 0 ? "due" : "ok"} />
      </div>
      <SectionCard
        title="Ledger"
        description="Treatment fees and payments, newest first."
        action={
          <AddPaymentDialog
            patientId={patient.id}
            balance={balance.balance}
            workplaces={workplaces.map((w) => ({ id: w.id, name: w.name, type: w.type }))}
            defaultWorkplaceId={current?.id ?? null}
            today={todayManila()}
          />
        }
        bodyClassName="p-0"
      >
        {ledger.length === 0 ? (
          <EmptyState icon={Receipt} title="No charges or payments yet. Treatment fees appear here automatically." />
        ) : (
          <ul className="divide-y">
            {ledger.map((l) => (
              <li
                key={l.id}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[100px_1fr_120px_120px_72px]",
                  l.voided && "opacity-60",
                )}
              >
                <span className="tabular text-sm text-muted-foreground">{formatDate(l.date)}</span>
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <div className={cn("flex flex-wrap items-center gap-2 font-medium text-heading", l.voided && "line-through")}>
                    {l.kind === "payment" ? (
                      <>
                        Payment · {l.method && METHOD_LABELS[l.method]}
                        <span className="tabular text-xs font-normal text-muted-foreground">{l.receiptNo}</span>
                      </>
                    ) : (
                      l.description
                    )}
                    {l.voided && <Badge variant="secondary">Void</Badge>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <WorkplaceTag name={l.workplaceName} color={l.workplaceColor} />
                    {l.reference && <span>Ref {l.reference}</span>}
                    {l.collectedBy === "clinic" && <span>Collected by clinic</span>}
                    {l.voidReason && <span>Voided: {l.voidReason}</span>}
                  </div>
                </div>
                <span
                  className={cn(
                    "tabular row-start-1 text-right font-medium sm:row-auto",
                    l.kind === "payment" ? "text-success" : "text-heading",
                  )}
                >
                  {l.kind === "payment" ? `−${formatPeso(-l.amount)}` : formatPeso(l.amount)}
                </span>
                <span className="tabular hidden text-right text-sm text-muted-foreground sm:block">{formatPeso(l.balance)}</span>
                <span className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                  {l.kind === "payment" && !l.voided && (
                    <>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/receipts/${l.id}`} aria-label={`Print receipt ${l.receiptNo}`}>
                          <Printer aria-hidden="true" />
                        </Link>
                      </Button>
                      <VoidPaymentButton paymentId={l.id} receiptNo={l.receiptNo ?? ""} />
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
