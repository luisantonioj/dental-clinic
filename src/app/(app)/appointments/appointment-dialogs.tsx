"use client";

import { Ban, Check, Mail, Pencil, UserX } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Field, useFormAction } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { type PickedPatient, PatientPicker } from "@/components/app/patient-picker";
import { WorkplaceTag } from "@/components/app/workplace-tag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { AppointmentStatus, WorkplaceColor } from "@/db/schema";
import { formatDate, formatDateTime, formatTime, manilaDateKey, manilaTimeKey } from "@/lib/format";
import { saveAppointmentAction, sendReminderAction, setAppointmentStatusAction } from "./actions";

export type CalendarAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  patientPhone: string | null;
  patientEmail: string | null;
  remindersOptIn: boolean;
  workplaceId: string;
  workplaceName: string;
  workplaceColor: WorkplaceColor;
  startsAt: string; // ISO
  endsAt: string; // ISO
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  reminderSentAt: string | null;
};

export type WorkplaceOption = { id: string; name: string };

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

export type AppointmentDraft = { date: string; time: string; patient?: PickedPatient | null };

/** Create or edit an appointment. Controlled open state so the calendar can open it from a slot. */
export function AppointmentFormDialog({
  open,
  onOpenChange,
  workplaces,
  defaultWorkplaceId,
  draft,
  appointment,
  lockPatient = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workplaces: WorkplaceOption[];
  defaultWorkplaceId: string | null;
  draft: AppointmentDraft;
  appointment?: CalendarAppointment;
  lockPatient?: boolean;
}) {
  const form = useFormAction(saveAppointmentAction, {
    successMessage: appointment ? "Appointment updated." : "Appointment booked.",
    onSuccess: () => onOpenChange(false),
  });
  const e = form.fieldErrors;
  const start = appointment ? new Date(appointment.startsAt) : null;
  const duration = appointment
    ? Math.round((new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()) / 60_000)
    : 30;
  const patient = appointment ? { id: appointment.patientId, name: appointment.patientName } : (draft.patient ?? null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) form.reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{appointment ? "Edit appointment" : "New appointment"}</DialogTitle>
            <DialogDescription>Times are Philippine time.</DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          {appointment && <input type="hidden" name="id" value={appointment.id} />}
          <Field label="Patient" htmlFor="appt-patient" error={e.patientId}>
            {lockPatient && patient ? (
              <>
                <input type="hidden" name="patientId" value={patient.id} />
                <p className="text-sm font-medium text-heading">{patient.name}</p>
              </>
            ) : (
              <PatientPicker id="appt-patient" name="patientId" defaultValue={patient} invalid={Boolean(e.patientId)} />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_120px_120px]">
            <Field label="Date" htmlFor="appt-date" error={e.date} className="col-span-2 sm:col-span-1">
              <Input id="appt-date" name="date" type="date" defaultValue={start ? manilaDateKey(start) : draft.date} required />
            </Field>
            <Field label="Time" htmlFor="appt-time" error={e.time}>
              <Input id="appt-time" name="time" type="time" step={300} defaultValue={start ? manilaTimeKey(start) : draft.time} required />
            </Field>
            <Field label="Length" htmlFor="appt-duration" error={e.durationMinutes}>
              <NativeSelect id="appt-duration" name="durationMinutes" defaultValue={String(DURATIONS.includes(duration) ? duration : 30)}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d < 60 ? `${d} min` : `${d / 60} hr`}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Workplace" htmlFor="appt-workplace" error={e.workplaceId}>
            <NativeSelect
              id="appt-workplace"
              name="workplaceId"
              defaultValue={appointment?.workplaceId ?? defaultWorkplaceId ?? ""}
              required
            >
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Reason" htmlFor="appt-reason" error={e.reason} hint="Only you see this; it's never put in reminder emails.">
            <Input id="appt-reason" name="reason" defaultValue={appointment?.reason ?? ""} placeholder="e.g. Cleaning, follow-up" />
          </Field>
          <Field label="Notes" htmlFor="appt-notes" error={e.notes}>
            <Textarea id="appt-notes" name="notes" defaultValue={appointment?.notes ?? ""} rows={2} />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              {form.pending ? "Saving…" : appointment ? "Save" : "Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const styles: Record<AppointmentStatus, string> = {
    scheduled: "bg-info-soft text-info",
    completed: "bg-success-soft text-success",
    cancelled: "bg-surface-2 text-muted-foreground",
    no_show: "bg-warning-soft text-warning",
  };
  return <Badge className={styles[status]}>{STATUS_LABELS[status]}</Badge>;
}

/** Details of one appointment with status changes, edit and "send reminder now". */
export function AppointmentDetailsDialog({
  appointment,
  onOpenChange,
  onEdit,
}: {
  appointment: CalendarAppointment | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (a: CalendarAppointment) => void;
}) {
  const [pending, startTransition] = useTransition();
  const a = appointment;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string, close = true) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        if (close) onOpenChange(false);
      } else toast.error(result.error ?? "Something went wrong");
    });
  }

  return (
    <Dialog open={Boolean(a)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {a && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link href={`/patients/${a.patientId}`} className="hover:underline">
                  {a.patientName}
                </Link>
                <StatusBadge status={a.status} />
              </DialogTitle>
              <DialogDescription className="tabular">
                {formatDate(new Date(a.startsAt))} · {formatTime(new Date(a.startsAt))}–{formatTime(new Date(a.endsAt))}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[90px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Where</dt>
              <dd>
                <WorkplaceTag name={a.workplaceName} color={a.workplaceColor} />
              </dd>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="text-heading">{a.reason ?? "—"}</dd>
              {a.notes && (
                <>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap text-heading">{a.notes}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="tabular text-heading">{a.patientPhone ? <a href={`tel:${a.patientPhone}`}>{a.patientPhone}</a> : "—"}</dd>
              <dt className="text-muted-foreground">Reminder</dt>
              <dd className="text-heading">
                {a.reminderSentAt
                  ? `Sent ${formatDateTime(new Date(a.reminderSentAt))}`
                  : !a.patientEmail
                    ? "No email on file"
                    : a.remindersOptIn
                      ? "Will be emailed before the visit"
                      : "Patient didn't opt in"}
              </dd>
            </dl>
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {a.status !== "completed" && (
                <Button size="sm" disabled={pending} onClick={() => run(() => setAppointmentStatusAction(a.id, "completed"), "Marked as completed.")}>
                  <Check aria-hidden="true" /> Completed
                </Button>
              )}
              {a.status !== "no_show" && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setAppointmentStatusAction(a.id, "no_show"), "Marked as no-show.")}>
                  <UserX aria-hidden="true" /> No-show
                </Button>
              )}
              {a.status !== "cancelled" ? (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setAppointmentStatusAction(a.id, "cancelled"), "Appointment cancelled.")}>
                  <Ban aria-hidden="true" /> Cancel visit
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setAppointmentStatusAction(a.id, "scheduled"), "Appointment restored.")}>
                  Restore
                </Button>
              )}
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={pending || !a.patientEmail || a.status !== "scheduled"}
                onClick={() => run(() => sendReminderAction(a.id), `Reminder sent to ${a.patientEmail}.`, false)}
              >
                <Mail aria-hidden="true" /> Send reminder now
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(a)}>
                <Pencil aria-hidden="true" /> Edit
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
