import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { WorkplaceDot } from "@/components/app/workplace-tag";
import { Button } from "@/components/ui/button";
import { addDays, formatDate, manilaToUtc, startOfWeek, todayManila } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getCurrentWorkplace } from "@/server/current-workplace";
import { listAppointments } from "@/server/data/appointments";
import { toCalendar } from "./to-calendar";
import { WeekCalendar } from "./week-calendar";

export const metadata: Metadata = { title: "Appointments" };

export default async function AppointmentsPage({ searchParams }: PageProps<"/appointments">) {
  const actor = await requireUser();
  const sp = await searchParams;
  const today = todayManila();
  const anchor = typeof sp.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : today;
  const monday = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const workplaceFilter = typeof sp.wp === "string" ? sp.wp : undefined;

  const [{ current, workplaces }, rows] = await Promise.all([
    getCurrentWorkplace(actor),
    listAppointments(actor, {
      from: manilaToUtc(monday),
      to: manilaToUtc(addDays(monday, 7)),
      workplaceId: workplaceFilter,
    }),
  ]);

  const href = (params: { week?: string; wp?: string | null }) => {
    const u = new URLSearchParams();
    const week = params.week ?? monday;
    if (week !== startOfWeek(today)) u.set("week", week);
    const wp = params.wp === undefined ? workplaceFilter : params.wp;
    if (wp) u.set("wp", wp);
    const s = u.toString();
    return s ? `/appointments?${s}` : "/appointments";
  };
  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-hover",
      active && "border-primary bg-primary-soft text-primary hover:bg-primary-soft",
    );

  return (
    <>
      <PageHeader
        title="Appointments"
        description={`${formatDate(days[0])} – ${formatDate(days[6])} · ${rows.length} appointment${rows.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" asChild>
              <Link href={href({ week: addDays(monday, -7) })} aria-label="Previous week">
                <ChevronLeft aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={href({ week: startOfWeek(today) })}>Today</Link>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href={href({ week: addDays(monday, 7) })} aria-label="Next week">
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        }
      />
      {workplaces.length > 1 && (
        <nav aria-label="Filter by workplace" className="mb-4 flex flex-wrap gap-2">
          <Link href={href({ wp: null })} className={chip(!workplaceFilter)}>
            All workplaces
          </Link>
          {workplaces.map((w) => (
            <Link key={w.id} href={href({ wp: w.id })} className={chip(workplaceFilter === w.id)}>
              <WorkplaceDot color={w.color} className="size-2" />
              {w.name}
            </Link>
          ))}
        </nav>
      )}
      {workplaces.length === 0 && (
        <p className="mb-4 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          Add a workplace in <Link href="/settings#workplaces" className="font-medium underline">Settings</Link> before booking appointments.
        </p>
      )}
      <WeekCalendar
        days={days}
        today={today}
        appointments={rows.map(toCalendar)}
        workplaces={workplaces.map((w) => ({ id: w.id, name: w.name }))}
        defaultWorkplaceId={current?.id ?? null}
      />
    </>
  );
}
