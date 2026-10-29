import type { AppointmentRow } from "@/server/data/appointments";
import type { CalendarAppointment } from "./appointment-dialogs";

/** Serializable shape for client components. */
export function toCalendar(a: AppointmentRow): CalendarAppointment {
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: a.patientName,
    patientCode: a.patientCode,
    patientPhone: a.patientPhone,
    patientEmail: a.patientEmail,
    remindersOptIn: a.remindersOptIn,
    workplaceId: a.workplaceId,
    workplaceName: a.workplaceName,
    workplaceColor: a.workplaceColor,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    reason: a.reason,
    notes: a.notes,
    status: a.status,
    reminderSentAt: a.reminderSentAt?.toISOString() ?? null,
  };
}
