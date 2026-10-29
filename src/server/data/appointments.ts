import "server-only";
import { and, asc, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { type AppointmentStatus, appointments, patients, user, type WorkplaceColor, workplaces } from "@/db/schema";
import { manilaToUtc } from "@/lib/format";
import type { AppointmentInput } from "@/lib/validation/appointments";
import { type Actor, NotFoundError, ownedBy } from "@/server/actor";
import { audit } from "./audit";
import { assertOwnPatient } from "./patients";
import { assertOwnWorkplace } from "./workplaces";

export type Appointment = typeof appointments.$inferSelect;
export type AppointmentRow = Appointment & {
  patientName: string;
  patientCode: string;
  patientPhone: string | null;
  patientEmail: string | null;
  remindersOptIn: boolean;
  workplaceName: string;
  workplaceColor: WorkplaceColor;
};

const rowColumns = {
  id: appointments.id,
  dentistId: appointments.dentistId,
  patientId: appointments.patientId,
  workplaceId: appointments.workplaceId,
  startsAt: appointments.startsAt,
  endsAt: appointments.endsAt,
  reason: appointments.reason,
  notes: appointments.notes,
  status: appointments.status,
  reminderSentAt: appointments.reminderSentAt,
  createdAt: appointments.createdAt,
  updatedAt: appointments.updatedAt,
  patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
  patientCode: patients.code,
  patientPhone: patients.phone,
  patientEmail: patients.email,
  remindersOptIn: patients.remindersOptIn,
  workplaceName: workplaces.name,
  workplaceColor: workplaces.color,
};

function baseQuery() {
  return db
    .select(rowColumns)
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(workplaces, eq(workplaces.id, appointments.workplaceId));
}

/** Appointments overlapping [from, to), optionally for one workplace. */
export async function listAppointments(
  actor: Actor,
  range: { from: Date; to: Date; workplaceId?: string },
): Promise<AppointmentRow[]> {
  return baseQuery()
    .where(
      and(
        ownedBy(actor, appointments.dentistId),
        lt(appointments.startsAt, range.to),
        gte(appointments.endsAt, range.from),
        range.workplaceId ? eq(appointments.workplaceId, range.workplaceId) : undefined,
      ),
    )
    .orderBy(asc(appointments.startsAt));
}

export async function listPatientAppointments(actor: Actor, patientId: string): Promise<AppointmentRow[]> {
  return baseQuery()
    .where(and(eq(appointments.patientId, patientId), ownedBy(actor, appointments.dentistId)))
    .orderBy(desc(appointments.startsAt));
}

export async function getAppointment(actor: Actor, id: string): Promise<AppointmentRow> {
  const [row] = await baseQuery().where(and(eq(appointments.id, id), ownedBy(actor, appointments.dentistId)));
  if (!row) throw new NotFoundError("Appointment");
  return row;
}

function times(input: AppointmentInput) {
  const startsAt = manilaToUtc(input.date, input.time);
  return { startsAt, endsAt: new Date(startsAt.getTime() + input.durationMinutes * 60_000) };
}

export async function createAppointment(actor: Actor, input: AppointmentInput): Promise<Appointment> {
  await assertOwnPatient(actor, input.patientId);
  await assertOwnWorkplace(actor, input.workplaceId);
  const [row] = await db
    .insert(appointments)
    .values({
      id: crypto.randomUUID(),
      dentistId: actor.id,
      patientId: input.patientId,
      workplaceId: input.workplaceId,
      ...times(input),
      reason: input.reason,
      notes: input.notes,
    })
    .returning();
  await audit(actor, "create", "appointment", row.id, { patientId: row.patientId });
  return row;
}

export async function updateAppointment(actor: Actor, id: string, input: AppointmentInput): Promise<Appointment> {
  await assertOwnPatient(actor, input.patientId);
  await assertOwnWorkplace(actor, input.workplaceId);
  const existing = await getAppointment(actor, id);
  const next = times(input);
  const moved = next.startsAt.getTime() !== existing.startsAt.getTime();
  const [row] = await db
    .update(appointments)
    .set({
      patientId: input.patientId,
      workplaceId: input.workplaceId,
      ...next,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      // A rescheduled appointment gets a fresh reminder.
      ...(moved ? { reminderSentAt: null } : {}),
    })
    .where(and(eq(appointments.id, id), eq(appointments.dentistId, actor.id)))
    .returning();
  if (!row) throw new NotFoundError("Appointment");
  await audit(actor, "update", "appointment", id);
  return row;
}

export async function setAppointmentStatus(actor: Actor, id: string, status: AppointmentStatus): Promise<Appointment> {
  const [row] = await db
    .update(appointments)
    .set({ status })
    .where(and(eq(appointments.id, id), eq(appointments.dentistId, actor.id)))
    .returning();
  if (!row) throw new NotFoundError("Appointment");
  await audit(actor, "update", "appointment", id, { status });
  return row;
}

// ── Reminders ────────────────────────────────────────────────────────────────

export type ReminderJob = {
  appointmentId: string;
  startsAt: Date;
  patientFirstName: string;
  patientEmail: string;
  dentistName: string;
  dentistPhone: string | null;
  workplaceName: string;
  workplaceAddress: string | null;
  workplacePhone: string | null;
};

const reminderColumns = {
  appointmentId: appointments.id,
  startsAt: appointments.startsAt,
  patientFirstName: patients.firstName,
  patientEmail: sql<string>`${patients.email}`,
  dentistName: user.name,
  dentistPhone: user.phone,
  workplaceName: workplaces.name,
  workplaceAddress: workplaces.address,
  workplacePhone: workplaces.phone,
};

function reminderQuery() {
  return db
    .select(reminderColumns)
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(workplaces, eq(workplaces.id, appointments.workplaceId))
    .innerJoin(user, eq(user.id, appointments.dentistId));
}

/**
 * System job (no actor): scheduled appointments starting within each dentist's
 * reminder window (plus `slackHours`, for crons that run less often than hourly),
 * whose patient opted in and has an email, and that haven't been reminded yet.
 */
export async function dueReminders(now: Date, slackHours = 0): Promise<ReminderJob[]> {
  return reminderQuery()
    .where(
      and(
        eq(appointments.status, "scheduled"),
        isNull(appointments.reminderSentAt),
        gte(appointments.startsAt, now),
        sql`${appointments.startsAt} <= ${now.toISOString()}::timestamptz + make_interval(hours => ${user.reminderHours} + ${slackHours})`,
        eq(patients.remindersOptIn, true),
        sql`${patients.email} is not null`,
        isNull(patients.archivedAt),
      ),
    )
    .orderBy(asc(appointments.startsAt));
}

/** One appointment's reminder details for a manual "send now" (checks ownership). */
export async function reminderFor(actor: Actor, appointmentId: string): Promise<ReminderJob> {
  const [row] = await reminderQuery().where(
    and(eq(appointments.id, appointmentId), eq(appointments.dentistId, actor.id), sql`${patients.email} is not null`),
  );
  if (!row) throw new NotFoundError("Appointment with a patient email");
  return row;
}

/** Marks a reminder as sent; returns false if another run already did. */
export async function markReminderSent(appointmentId: string, at: Date): Promise<boolean> {
  const updated = await db
    .update(appointments)
    .set({ reminderSentAt: at })
    .where(and(eq(appointments.id, appointmentId), isNull(appointments.reminderSentAt)))
    .returning({ id: appointments.id });
  return updated.length > 0;
}

/** Undoes a claim when the email couldn't be sent, so the next run retries. */
export async function clearReminderSent(appointmentId: string): Promise<void> {
  await db.update(appointments).set({ reminderSentAt: null }).where(eq(appointments.id, appointmentId));
}
