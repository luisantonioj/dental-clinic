"use client";

import { CalendarPlus, Plus } from "lucide-react";
import { useState } from "react";
import { workplaceColorVar } from "@/components/app/workplace-tag";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, formatWeekday, manilaDateKey, manilaTimeKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type AppointmentDraft,
  AppointmentDetailsDialog,
  AppointmentFormDialog,
  type CalendarAppointment,
  StatusBadge,
  type WorkplaceOption,
} from "./appointment-dialogs";

const START_HOUR = 7;
const END_HOUR = 20;
const HOUR_PX = 56;

function minutesOfDay(iso: string): number {
  const [h, m] = manilaTimeKey(new Date(iso)).split(":").map(Number);
  return h * 60 + m;
}

/** Side-by-side lanes for overlapping appointments in one day. */
function layoutDay(items: CalendarAppointment[]) {
  const sorted = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const placed: { a: CalendarAppointment; lane: number; lanes: number }[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = 0;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) c.lanes = lanes;
    cluster = [];
  };
  for (const a of sorted) {
    const start = new Date(a.startsAt).getTime();
    if (cluster.length && start >= clusterEnd) flush();
    const laneEnds: number[] = [];
    for (const c of cluster) laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? 0, new Date(c.a.endsAt).getTime());
    let lane = laneEnds.findIndex((end) => end <= start);
    if (lane === -1) lane = laneEnds.length;
    const item = { a, lane, lanes: 1 };
    cluster.push(item);
    placed.push(item);
    clusterEnd = Math.max(clusterEnd, new Date(a.endsAt).getTime());
  }
  flush();
  return placed;
}

export function WeekCalendar({
  days,
  today,
  appointments,
  workplaces,
  defaultWorkplaceId,
}: {
  days: string[];
  today: string;
  appointments: CalendarAppointment[];
  workplaces: WorkplaceOption[];
  defaultWorkplaceId: string | null;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<AppointmentDraft>({ date: today, time: "09:00" });
  const [editing, setEditing] = useState<CalendarAppointment | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = appointments.find((a) => a.id === selectedId) ?? null;
  const byDay = new Map(days.map((d) => [d, appointments.filter((a) => manilaDateKey(new Date(a.startsAt)) === d)]));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const canBook = workplaces.length > 0;

  function openNew(date: string, time: string) {
    if (!canBook) return;
    setEditing(undefined);
    setDraft({ date, time });
    setFormOpen(true);
  }

  function onColumnClick(e: React.MouseEvent<HTMLDivElement>, date: string) {
    if (e.target !== e.currentTarget) return;
    const y = e.nativeEvent.offsetY;
    const minutes = START_HOUR * 60 + Math.floor((y / HOUR_PX) * 2) * 30;
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    openNew(date, `${h}:${m}`);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="lg" onClick={() => openNew(days.includes(today) ? today : days[0], "09:00")} disabled={!canBook}>
          <Plus aria-hidden="true" /> New appointment
        </Button>
      </div>

      {/* Phone: agenda list */}
      <div className="grid gap-4 md:hidden">
        {days.map((d) => {
          const items = byDay.get(d) ?? [];
          return (
            <section key={d} className="rounded-xl border bg-card shadow-card">
              <header className="flex items-center justify-between border-b px-4 py-2.5">
                <h2 className={cn("text-sm font-semibold", d === today && "text-primary")}>
                  {formatWeekday(d)}, {formatDate(d)}
                </h2>
                <Button variant="ghost" size="icon-sm" aria-label={`Book on ${formatDate(d)}`} onClick={() => openNew(d, "09:00")} disabled={!canBook}>
                  <CalendarPlus aria-hidden="true" />
                </Button>
              </header>
              {items.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No appointments</p>
              ) : (
                <ul className="divide-y">
                  {items.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover"
                        style={workplaceColorVar(a.workplaceColor)}
                      >
                        <span className="h-9 w-1 flex-none rounded-full bg-(--c)" />
                        <span className="tabular w-20 flex-none text-sm whitespace-nowrap text-muted-foreground">{formatTime(new Date(a.startsAt))}</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-medium text-heading", a.status === "cancelled" && "line-through opacity-60")}>
                            {a.patientName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {a.reason ?? a.workplaceName}
                          </span>
                        </span>
                        {a.status !== "scheduled" && <StatusBadge status={a.status} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Tablet/desktop: week grid */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-card md:block">
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="border-b" />
          {days.map((d) => (
            <div key={d} className={cn("border-b border-l px-2 py-2 text-center", d === today && "bg-primary-soft")}>
              <div className="text-xs font-medium text-muted-foreground uppercase">{formatWeekday(d)}</div>
              <div className={cn("tabular text-lg font-semibold text-heading", d === today && "text-primary")}>
                {Number(d.slice(8))}
              </div>
            </div>
          ))}

          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground" style={{ top: i * HOUR_PX }}>
                {i === 0 ? "" : `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d}
              role="presentation"
              onClick={(e) => onColumnClick(e, d)}
              className={cn("relative border-l", canBook && "cursor-copy")}
              style={{
                height: hours.length * HOUR_PX,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${HOUR_PX}px)`,
              }}
            >
              {layoutDay(byDay.get(d) ?? []).map(({ a, lane, lanes }) => {
                const start = Math.max(minutesOfDay(a.startsAt), START_HOUR * 60);
                const end = Math.min(minutesOfDay(a.endsAt) || 24 * 60, END_HOUR * 60);
                const top = ((start - START_HOUR * 60) / 60) * HOUR_PX;
                const height = Math.max(((end - start) / 60) * HOUR_PX - 2, 22);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    style={{
                      ...workplaceColorVar(a.workplaceColor),
                      top,
                      height,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                    className={cn(
                      "absolute overflow-hidden rounded-md border-l-[3px] border-(--c) bg-[color-mix(in_srgb,var(--c)_14%,var(--card))] px-1.5 py-1 text-left text-xs hover:bg-[color-mix(in_srgb,var(--c)_22%,var(--card))]",
                      (a.status === "cancelled" || a.status === "no_show") && "opacity-55",
                    )}
                  >
                    <span className={cn("block truncate font-semibold text-heading", a.status === "cancelled" && "line-through")}>
                      {a.patientName}
                    </span>
                    <span className="tabular block truncate text-muted-foreground">
                      {formatTime(new Date(a.startsAt))}
                      {a.reason && ` · ${a.reason}`}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <AppointmentFormDialog
        key={`${editing?.id ?? "new"}-${draft.date}-${draft.time}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        workplaces={workplaces}
        defaultWorkplaceId={defaultWorkplaceId}
        draft={draft}
        appointment={editing}
      />
      <AppointmentDetailsDialog
        appointment={selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        onEdit={(a) => {
          setSelectedId(null);
          setEditing(a);
          setFormOpen(true);
        }}
      />
    </>
  );
}
