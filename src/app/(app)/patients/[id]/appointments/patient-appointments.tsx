"use client";

import { CalendarDays, CalendarPlus } from "lucide-react";
import { useState } from "react";
import {
  AppointmentDetailsDialog,
  AppointmentFormDialog,
  type CalendarAppointment,
  StatusBadge,
  type WorkplaceOption,
} from "@/app/(app)/appointments/appointment-dialogs";
import { EmptyState } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { WorkplaceTag } from "@/components/app/workplace-tag";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, formatWeekday } from "@/lib/format";

export function PatientAppointments({
  patient,
  appointments,
  workplaces,
  defaultWorkplaceId,
  today,
  now,
}: {
  patient: { id: string; name: string };
  appointments: CalendarAppointment[];
  workplaces: WorkplaceOption[];
  defaultWorkplaceId: string | null;
  today: string;
  now: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarAppointment | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = appointments.find((a) => a.id === selectedId) ?? null;
  const upcoming = appointments.filter((a) => a.startsAt >= now && a.status === "scheduled").reverse();
  const past = appointments.filter((a) => !(a.startsAt >= now && a.status === "scheduled"));

  const row = (a: CalendarAppointment) => {
    const start = new Date(a.startsAt);
    return (
      <li key={a.id}>
        <button
          type="button"
          onClick={() => setSelectedId(a.id)}
          className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3 text-left hover:bg-hover"
        >
          <span className="grid w-12 place-items-center rounded-lg bg-surface-2 py-1 text-center">
            <small className="text-[10px] font-semibold text-muted-foreground uppercase">{formatWeekday(start)}</small>
            <b className="tabular text-base text-heading">{formatDate(start).split(" ")[0]}</b>
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-heading">{a.reason ?? "Appointment"}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular">
                {formatDate(start)} · {formatTime(start)}
              </span>
              <WorkplaceTag name={a.workplaceName} color={a.workplaceColor} />
            </span>
          </span>
          <StatusBadge status={a.status} />
        </button>
      </li>
    );
  };

  return (
    <>
      <SectionCard
        title="Appointments"
        action={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            disabled={workplaces.length === 0}
          >
            <CalendarPlus aria-hidden="true" /> Book
          </Button>
        }
        bodyClassName="p-0"
      >
        {appointments.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No appointments yet." />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <h3 className="bg-surface-2 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Upcoming</h3>
                <ul className="divide-y">{upcoming.map(row)}</ul>
              </>
            )}
            {past.length > 0 && (
              <>
                <h3 className="bg-surface-2 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">History</h3>
                <ul className="divide-y">{past.map(row)}</ul>
              </>
            )}
          </>
        )}
      </SectionCard>
      <AppointmentFormDialog
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        workplaces={workplaces}
        defaultWorkplaceId={defaultWorkplaceId}
        draft={{ date: today, time: "09:00", patient }}
        appointment={editing}
        lockPatient
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
