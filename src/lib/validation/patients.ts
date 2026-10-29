import { z } from "zod";
import { SEXES } from "@/db/schema";
import { checkbox, optionalEmail, optionalIsoDate, optionalPhone, optionalText, requiredText } from "./common";

export const patientSchema = z.object({
  firstName: requiredText("First name", 80),
  middleName: optionalText(80),
  lastName: requiredText("Last name", 80),
  birthdate: optionalIsoDate,
  sex: z
    .union([z.enum(SEXES), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  phone: optionalPhone,
  email: optionalEmail,
  address: optionalText(300),
  occupation: optionalText(120),
  emergencyName: optionalText(120),
  emergencyPhone: optionalPhone,
  emergencyRelation: optionalText(60),
  allergies: optionalText(1000),
  medicalConditions: optionalText(1000),
  medications: optionalText(1000),
  notes: optionalText(4000),
  consent: checkbox,
  remindersOptIn: checkbox,
});

export type PatientInput = z.infer<typeof patientSchema>;
