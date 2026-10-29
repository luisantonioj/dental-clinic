import { z } from "zod";

/** Trimmed text; empty becomes undefined. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max);

export const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.email("Enter a valid email").optional())
  .optional();

/** Philippine mobile/landline: digits, spaces, +, -, parentheses. */
export const optionalPhone = z
  .string()
  .trim()
  .max(40)
  .regex(/^[0-9+()\-\s]*$/, "Use digits, spaces, + - ( ) only")
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const passwordField = z.string().min(8, "At least 8 characters").max(128);

/** HTML checkbox: "on" when ticked, missing when not. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

/** yyyy-mm-dd from <input type="date">. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
export const optionalIsoDate = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(isoDate.optional())
  .optional();

/** Peso amount typed by the user ("1,500.50") → integer centavos. */
export const pesoAmount = (label = "Amount", { allowZero = false } = {}) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[₱,\s]/g, ""))
    .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, `${label} must be a peso amount`))
    .transform((v) => Math.round(Number(v) * 100))
    .refine((c) => (allowZero ? c >= 0 : c > 0), `${label} must be more than zero`);

export const optionalPesoAmount = (label = "Amount") =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").replace(/[₱,\s]/g, "") || "0")
    .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, `${label} must be a peso amount`))
    .transform((v) => Math.round(Number(v) * 100));

export const uuid = z.string().uuid();
