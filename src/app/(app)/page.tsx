import { CalendarDays, ChevronRight, Package, UserPlus, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { InitialsAvatar } from "@/components/app/initials-avatar";
import { SectionCard } from "@/components/app/section-card";
import { WorkplaceDot, WorkplaceTag } from "@/components/app/workplace-tag";
import { Button } from "@/components/ui/button";
import { addDays, formatDate, formatMonth, formatPeso, formatTime, manilaToUtc, monthRange, todayManila } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { listAppointments } from "@/server/data/appointments";
import { outstandingBalances } from "@/server/data/billing";
import { earningsByWorkplace } from "@/server/data/earnings";
import { lowStockItems } from "@/server/data/inventory";
import { countPatients, fullName, recentPatients } from "@/server/data/patients";
import { getProfile } from "@/server/data/users";
import { StatusBadge } from "./appointments/appointment-dialogs";
import { DashboardSearch } from "./dashboard-search";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({ icon: Icon, label, value, href }: { icon: typeof Users; label: string; value: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-card hover:border-border-strong">
      <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="tabular block text-lg font-semibold text-heading">{value}</span>
      </span>
    </Link>
  );
}

const viewAll = (href: string, label = "View all") => (
  <Link href={href} className="inline-flex items-center text-sm font-medium text-primary hover:underline">
    {label} <ChevronRight className="size-4" aria-hidden="true" />
  </Link>
);

export default async function DashboardPage() {
  const actor = await requireUser();
  const today = todayManila();
  const month = today.slice(0, 7);
  const [profile, todays, recent, owing, low, earnings, patientCount] = await Promise.all([
    getProfile(actor),
    listAppointments(actor, { from: manilaToUtc(today), to: manilaToUtc(addDays(today, 1)) }),
    recentPatients(actor),
    outstandingBalances(actor),
    lowStockItems(actor, 6),
    earningsByWorkplace(actor, monthRange(month)),
    countPatients(actor),
  ]);
  const scheduled = todays.filter((a) => a.status !== "cancelled");
  const monthNet = earnings.reduce((s, w) => s + w.net, 0);
  const firstName = profile.name.replace(/^(dra?\.?|dr\.?)\s+/i, "").split(" ")[0];
  const title = profile.name.match(/^(dra?\.?|dr\.?)\s/i)?.[0].trim();

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(new Date())}, {title ? `${title} ` : ""}
          {firstName}
        </h1>
      </div>

      <DashboardSearch />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={CalendarDays} label="Appointments today" value={String(scheduled.length)} href="/appointments" />
        <Stat icon={Users} label="Active patients" value={String(patientCount)} href="/patients" />
        <Stat icon={Wallet} label={`Net · ${formatMonth(month)}`} value={formatPeso(monthNet)} href="/earnings" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <SectionCard title="Today's appointments" action={viewAll("/appointments", "Calendar")} bodyClassName="p-0">
            {todays.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No appointments today.</p>
            ) : (
              <ul className="divide-y">
                {todays.map((a) => (
                  <li key={a.id}>
                    <Link href={`/patients/${a.patientId}`} className="flex items-center gap-4 px-5 py-3 hover:bg-hover">
                      <span className="tabular w-20 flex-none text-sm font-medium whitespace-nowrap text-heading">{formatTime(a.startsAt)}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate font-medium text-heading", a.status === "cancelled" && "line-through opacity-60")}>
                          {a.patientName}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {a.reason && <span>{a.reason}</span>}
                          <WorkplaceTag name={a.workplaceName} color={a.workplaceColor} />
                        </span>
                      </span>
                      {a.status !== "scheduled" && <StatusBadge status={a.status} />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Recent patients"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/patients/new">
                  <UserPlus aria-hidden="true" /> New patient
                </Link>
              </Button>
            }
            bodyClassName="p-0"
          >
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No patients yet.</p>
            ) : (
              <ul className="grid divide-y sm:grid-cols-2 sm:divide-y-0">
                {recent.map((p) => (
                  <li key={p.id} className="sm:border-b">
                    <Link href={`/patients/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-hover">
                      <InitialsAvatar name={fullName(p)} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-heading">{fullName(p)}</span>
                        <span className="tabular block truncate text-xs text-muted-foreground">
                          {p.code}
                          {p.phone && ` · ${p.phone}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="grid content-start gap-6">
          <SectionCard title={`Earnings · ${formatMonth(month)}`} action={viewAll("/earnings", "Report")} bodyClassName="p-0">
            {earnings.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Add your workplaces in Settings.</p>
            ) : (
              <ul className="divide-y">
                {earnings.map((w) => (
                  <li key={w.workplaceId} className="flex items-center gap-3 px-5 py-3">
                    <WorkplaceDot color={w.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-heading">{w.name}</span>
                      {w.type === "partner" && w.owedByClinic > 0 && (
                        <span className="tabular block text-xs text-warning">Clinic owes you {formatPeso(w.owedByClinic)}</span>
                      )}
                    </span>
                    <span className="tabular font-semibold text-heading">{formatPeso(w.net)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Outstanding balances" bodyClassName="p-0">
            {owing.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nobody owes a balance.</p>
            ) : (
              <ul className="divide-y">
                {owing.map((o) => (
                  <li key={o.patientId}>
                    <Link href={`/patients/${o.patientId}/billing`} className="flex items-center gap-3 px-5 py-3 hover:bg-hover">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-heading">{o.name}</span>
                        <span className="tabular block text-xs text-muted-foreground">{o.code}</span>
                      </span>
                      <span className="tabular font-semibold text-destructive">{formatPeso(o.balance)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Low stock" action={viewAll("/inventory", "Inventory")} bodyClassName="p-0">
            {low.length === 0 ? (
              <p className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
                <Package className="size-4" aria-hidden="true" /> All supplies are above their reorder level.
              </p>
            ) : (
              <ul className="divide-y">
                {low.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-heading">{i.name}</span>
                      <WorkplaceTag name={i.workplaceName} color={i.workplaceColor} />
                    </span>
                    <span className="tabular text-sm font-semibold text-warning">
                      {i.stock} {i.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

