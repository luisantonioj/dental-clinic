import { z } from "zod";
import { WORKPLACE_COLORS, WORKPLACE_TYPES } from "@/db/schema";
import { checkbox, optionalPhone, optionalText, requiredText } from "./common";

export const workplaceSchema = z
  .object({
    name: requiredText("Name", 120),
    address: optionalText(300),
    phone: optionalPhone,
    type: z.enum(WORKPLACE_TYPES, { message: "Choose own clinic or partner clinic" }),
    commissionPct: z.coerce
      .number({ message: "Enter a percentage" })
      .int("Use a whole number")
      .min(0, "0 to 100")
      .max(100, "0 to 100")
      .optional(),
    deductLabFees: checkbox,
    color: z.enum(WORKPLACE_COLORS).default("indigo"),
    active: checkbox.optional(),
  })
  .transform((w) => ({
    ...w,
    // Her own clinic keeps everything; lab fees are just costs there.
    commissionPct: w.type === "own" ? 100 : (w.commissionPct ?? 0),
    deductLabFees: w.type === "own" ? false : w.deductLabFees,
  }));

export type WorkplaceInput = z.infer<typeof workplaceSchema>;
