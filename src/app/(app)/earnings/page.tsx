import { ChevronLeft, ChevronRight, Download, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { WorkplaceDot } from "@/components/app/workplace-tag";
import { Button } from "@/components/ui/button";
import { formatDate, formatMonth, formatPeso, monthRange, todayManila } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EXPENSE_LABELS, monthParam } from "@/lib/validation/earnings";
import { requireUser } from "@/server/auth";
import { getCurrentWorkplace } from "@/server/current-workplace";
import { earningsByWorkplace, listExpenses, listPayouts, type WorkplaceEarnings } from "@/server/data/earnings";
import { ExpenseDialog, PayoutDialog, VoidEntryButton } from "./entry-dialogs";

export const metadata: Metadata = { title: "Earnings" };

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const minus = (centavos: number) => (centavos ? `−${formatPeso(centavos)}` : formatPeso(0));

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "good" | "due" | "muted" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular text-right text-heading",
          strong && "text-base font-semibold",
          tone === "good" && "text-success",
          tone === "due" && "text-warning",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function WorkplaceCard({ w }: { w: WorkplaceEarnings }) {
  const partner = w.type === "partner";
  return (
    <section className="rounded-xl border bg-card p-5 shadow-card">
      <header className="mb-3 flex items-center gap-2">
        <WorkplaceDot color={w.color} />
        <h2 className="truncate text-base font-semibold">{w.name}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{partner ? `Partner · ${w.commissionPct}%` : "Own clinic"}</span>
      </header>
      <dl className="divide-y">
        <Row label="Treatment fees" value={formatPeso(w.gross)} />
        <Row label="Collected from patients" value={formatPeso(w.collected)} />
        {partner ? (
          <>
            {w.deductLabFees && <Row label="Lab fees (deducted first)" value={minus(w.labFees)} tone="muted" />}
            <Row label={`Your ${w.commissionPct}% share`} value={formatPeso(w.share)} strong />
            <Row label="Collected by you directly" value={minus(w.collectedByMe)} tone="muted" />
            <Row label="Payouts received" value={minus(w.payouts)} tone="muted" />
            <Row
              label={w.owedByClinic >= 0 ? "Clinic still owes you" : "You owe the clinic"}
              value={formatPeso(Math.abs(w.owedByClinic))}
              strong
              tone={w.owedByClinic > 0 ? "due" : undefined}
            />
            {w.expenses > 0 && <Row label="Your expenses here" value={minus(w.expenses)} tone="muted" />}
          </>
        ) : (
          <>
            <Row label="Lab fees" value={minus(w.labFees)} tone="muted" />
            <Row label="Expenses" value={minus(w.expenses)} tone="muted" />
          </>
        )}
        <Row label="Your net" value={formatPeso(w.net)} strong tone="good" />
      </dl>
    </section>
  );
}

export default async function EarningsPage({ searchParams }: PageProps<"/earnings">) {
  const actor = await requireUser();
  const sp = await searchParams;
  const today = todayManila();
  const parsed = monthParam.safeParse(typeof sp.month === "string" ? sp.month : undefined);
  const month = (parsed.success && parsed.data) || today.slice(0, 7);
  const range = monthRange(month);

  const [rows, payoutRows, expenseRows, { current, workplaces }] = await Promise.all([
    earningsByWorkplace(actor, range),
    listPayouts(actor, range),
    listExpenses(actor, range),
    getCurrentWorkplace(actor),
  ]);
  const totalNet = rows.reduce((s, w) => s + w.net, 0);
  const totalOwed = rows.reduce((s, w) => s + Math.max(0, w.owedByClinic), 0);
  const partners = workplaces.filter((w) => w.type === "partner").map((w) => ({ id: w.id, name: w.name }));
  const all = workplaces.map((w) => ({ id: w.id, name: w.name }));
  const entryDate = month === today.slice(0, 7) ? today : range.end;

  return (
    <>
      <PageHeader
        title="Earnings"
        description={formatMonth(month)}
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" asChild>
                <Link href={`/earnings?month=${shiftMonth(month, -1)}`} aria-label="Previous month">
                  <ChevronLeft aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/earnings">This month</Link>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href={`/earnings?month=${shiftMonth(month, 1)}`} aria-label="Next month">
                  <ChevronRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <Button variant="outline" asChild>
              <a href={`/api/export/earnings?month=${month}`}>
                <Download aria-hidden="true" /> CSV
              </a>
            </Button>
          </>
        }
      />

      {rows.length === 0 ? (
        <SectionCard title="No workplaces yet">
          <EmptyState
            icon={Wallet}
            title="Add your workplaces in Settings to see earnings per clinic."
            action={
              <Link href="/settings#workplaces" className="text-sm font-medium text-primary hover:underline">
                Go to Settings
              </Link>
            }
          />
        </SectionCard>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-card px-5 py-4 shadow-card">
              <div className="text-sm text-muted-foreground">Your net this month</div>
              <div className="tabular mt-1 text-2xl font-semibold text-heading">{formatPeso(totalNet)}</div>
            </div>
            <div className="rounded-xl border bg-card px-5 py-4 shadow-card">
              <div className="text-sm text-muted-foreground">Still owed by partner clinics</div>
              <div className={cn("tabular mt-1 text-2xl font-semibold text-heading", totalOwed > 0 && "text-warning")}>
                {formatPeso(totalOwed)}
              </div>
            </div>
          </div>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {rows.map((w) => (
              <WorkplaceCard key={w.workplaceId} w={w} />
            ))}
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Payouts from partner clinics"
          action={
            <PayoutDialog
              workplaces={partners}
              defaultWorkplaceId={current?.id ?? null}
              today={entryDate}
              periodStart={range.start}
              periodEnd={range.end}
            />
          }
          bodyClassName="p-0"
        >
          {payoutRows.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">No payouts recorded this month.</p>
          ) : (
            <ul className="divide-y">
              {payoutRows.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="tabular w-24 text-muted-foreground">{formatDate(p.date)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {p.workplaceName}
                    {p.periodStart && p.periodEnd && (
                      <span className="text-muted-foreground"> · {formatDate(p.periodStart)}–{formatDate(p.periodEnd)}</span>
                    )}
                  </span>
                  <span className="tabular font-medium text-heading">{formatPeso(p.amount)}</span>
                  <VoidEntryButton kind="payout" id={p.id} label={`payout of ${formatPeso(p.amount)}`} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard
          title="Expenses"
          action={<ExpenseDialog workplaces={all} defaultWorkplaceId={current?.id ?? null} today={entryDate} />}
          bodyClassName="p-0"
        >
          {expenseRows.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">No expenses recorded this month.</p>
          ) : (
            <ul className="divide-y">
              {expenseRows.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="tabular w-24 text-muted-foreground">{formatDate(x.date)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {EXPENSE_LABELS[x.category]} · {x.workplaceName}
                    {x.notes && <span className="text-muted-foreground"> · {x.notes}</span>}
                  </span>
                  <span className="tabular font-medium text-heading">{formatPeso(x.amount)}</span>
                  <VoidEntryButton kind="expense" id={x.id} label={`expense of ${formatPeso(x.amount)}`} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
