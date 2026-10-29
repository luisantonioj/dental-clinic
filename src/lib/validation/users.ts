import { z } from "zod";
import { emailField, optionalPhone, optionalText, passwordField, requiredText } from "./common";

export const createDentistSchema = z.object({
  name: requiredText("Name", 120),
  email: emailField,
  password: passwordField,
  prcLicense: optionalText(40),
  phone: optionalPhone,
});
export type CreateDentistInput = z.infer<typeof createDentistSchema>;

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: passwordField,
});

export const profileSchema = z.object({
  name: requiredText("Name", 120),
  prcLicense: optionalText(40),
  phone: optionalPhone,
  reminderHours: z.coerce.number().int().min(1, "At least 1 hour").max(168, "At most 7 days (168 hours)"),
});
export type ProfileInput = z.infer<typeof profileSchema>;
