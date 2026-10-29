import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/db/schema";
import { isoDate, optionalText } from "./common";

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Choose a patient"),
  workplaceId: z.string().min(1, "Choose a workplace"),
  date: isoDate,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time"),
  durationMinutes: z.coerce.number().int().min(5).max(8 * 60),
  reason: optionalText(200),
  notes: optionalText(1000),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);
