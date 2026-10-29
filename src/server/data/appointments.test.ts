import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { appointments, user } from "@/db/schema";
import { appointmentSchema } from "@/lib/validation/appointments";
import { NotFoundError } from "@/server/actor";
import { makeActor } from "../../../tests/support/factories";
import { addPatient, addWorkplace } from "../../../tests/support/fixtures";
import {
  createAppointment,
  dueReminders,
  getAppointment,
  listAppointments,
  setAppointmentStatus,
  updateAppointment,
} from "./appointments";

type Sent = { to: string; subject: string; html: string; text: string };
type SendResult = { ok: true } | { ok: false; error: string };
const sendEmail = vi.hoisted(() => vi.fn(async (message: Sent): Promise<SendResult> => (message ? { ok: true } : { ok: false, error: "no message" })));
vi.mock("@/server/email/send", () => ({ sendEmail }));

const { runReminders } = await import("@/server/reminders");

async function setup(patientValues: Record<string, string> = {}) {
  const a = await makeActor();
  const p = await addPatient(a, { email: "patient@example.com", remindersOptIn: "on", ...patientValues });
  const w = await addWorkplace(a);
  const book = (date: string, time: string, extra: Record<string, string> = {}) =>
    createAppointment(
      a,
      appointmentSchema.parse({ patientId: p.id, workplaceId: w.id, date, time, durationMinutes: "30", ...extra }),
    );
  return { a, p, w, book };
}

describe("appointments", () => {
  it("stores Manila wall time as UTC and lists by range", async () => {
    const { a, book } = await setup();
    const appt = await book("2026-11-02", "09:30", { reason: "Cleaning" });
    expect(appt.startsAt.toISOString()).toBe("2026-11-02T01:30:00.000Z");
    expect(appt.endsAt.toISOString()).toBe("2026-11-02T02:00:00.000Z");
    const week = await listAppointments(a, { from: new Date("2026-11-01T16:00:00Z"), to: new Date("2026-11-08T16:00:00Z") });
    expect(week.map((r) => r.patientName)).toEqual(["Juan Dela Cruz"]);
    expect(week[0].workplaceName).toBe("Home Clinic");
  });

  it("keeps appointments private and checks linked patient/workplace", async () => {
    const { p, w, book } = await setup();
    const b = await makeActor();
    const appt = await book("2026-11-02", "10:00");
    await expect(getAppointment(b, appt.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setAppointmentStatus(b, appt.id, "cancelled")).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      createAppointment(b, appointmentSchema.parse({ patientId: p.id, workplaceId: w.id, date: "2026-11-02", time: "10:00", durationMinutes: "30" })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("resets the reminder when an appointment is moved", async () => {
    const { a, p, w, book } = await setup();
    const appt = await book("2026-11-02", "10:00");
    await db.update(appointments).set({ reminderSentAt: new Date() }).where(eq(appointments.id, appt.id));
    const base = { patientId: p.id, workplaceId: w.id, durationMinutes: 30 };
    const same = await updateAppointment(a, appt.id, { ...base, date: "2026-11-02", time: "10:00", reason: "Changed" });
    expect(same.reminderSentAt).not.toBeNull();
    const moved = await updateAppointment(a, appt.id, { ...base, date: "2026-11-03", time: "10:00" });
    expect(moved.reminderSentAt).toBeNull();
  });
});

describe("reminders", () => {
  const now = new Date("2026-11-01T00:00:00Z"); // 8:00 AM Manila

  it("selects only opted-in, scheduled, unsent appointments inside the window", async () => {
    const { a, book } = await setup();
    const inWindow = await book("2026-11-01", "14:00"); // 6h ahead
    await book("2026-11-03", "14:00"); // 54h ahead: outside 24h
    const cancelled = await book("2026-11-01", "15:00");
    await setAppointmentStatus(a, cancelled.id, "cancelled");
    await book("2026-10-31", "10:00"); // in the past

    const noEmail = await setup({ email: "" });
    await noEmail.book("2026-11-01", "14:00");
    const optedOut = await setup({ remindersOptIn: "" });
    await optedOut.book("2026-11-01", "14:00");

    const due = (await dueReminders(now)).filter((j) => [inWindow.id].includes(j.appointmentId) || j.dentistName === a.name);
    expect(due.map((j) => j.appointmentId)).toEqual([inWindow.id]);
  });

  it("respects each dentist's reminder hours and the slack for daily crons", async () => {
    const { a, book } = await setup();
    await db.update(user).set({ reminderHours: 48 }).where(eq(user.id, a.id));
    const in40h = await book("2026-11-02", "16:00"); // 40h ahead
    const ids = async (slack: number) =>
      (await dueReminders(now, slack)).filter((j) => j.dentistName === a.name).map((j) => j.appointmentId);
    expect(await ids(0)).toEqual([in40h.id]);
    await db.update(user).set({ reminderHours: 24 }).where(eq(user.id, a.id));
    expect(await ids(0)).toEqual([]);
    expect(await ids(24)).toEqual([in40h.id]);
  });

  it("sends each reminder once, with no clinical details", async () => {
    sendEmail.mockClear();
    const { book } = await setup();
    const appt = await book("2026-11-01", "14:00", { reason: "Root canal tooth 36" });
    const first = await runReminders(now);
    expect(first.sent).toBeGreaterThanOrEqual(1);
    const mine = sendEmail.mock.calls.map((c) => c[0]).find((m) => m.subject.includes("1 November 2026"));
    expect(mine?.text).toContain("2:00 PM");
    expect(mine?.html).not.toContain("Root canal");
    const [row] = await db.select().from(appointments).where(eq(appointments.id, appt.id));
    expect(row.reminderSentAt).not.toBeNull();

    sendEmail.mockClear();
    await runReminders(now);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("releases the claim when sending fails so the next run retries", async () => {
    const { book } = await setup();
    const appt = await book("2026-11-01", "18:00");
    sendEmail.mockImplementation(async () => ({ ok: false, error: "boom" }));
    await runReminders(now);
    const [row] = await db.select().from(appointments).where(eq(appointments.id, appt.id));
    expect(row.reminderSentAt).toBeNull();
    sendEmail.mockImplementation(async () => ({ ok: true }));
  });
});
