import { z } from "zod";
import { checkbox, isoDate, optionalText, requiredText } from "./common";

export const itemSchema = z.object({
  workplaceId: z.string().min(1, "Choose a workplace"),
  name: requiredText("Name", 120),
  category: optionalText(60),
  unit: requiredText("Unit", 20),
  reorderLevel: z.coerce.number().int().min(0, "0 or more").max(100_000),
  unitCost: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ?? "").replace(/[₱,\s]/g, ""))
    .pipe(z.string().regex(/^(\d+(\.\d{1,2})?)?$/, "Must be a peso amount"))
    .transform((v) => (v === "" ? undefined : Math.round(Number(v) * 100))),
  active: checkbox.optional(),
});
export type ItemInput = z.infer<typeof itemSchema>;

/** restock/use take a positive quantity; "count" records the quantity actually on the shelf. */
export const movementSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["restock", "use", "count"]),
  qty: z.coerce.number().int("Whole numbers only").min(0, "0 or more").max(1_000_000),
  date: isoDate,
  reason: optionalText(200),
});
export type MovementInput = z.infer<typeof movementSchema>;

export const UNITS = ["pc", "box", "pack", "bottle", "tube", "roll", "pair", "set", "ml", "g"];
export const ITEM_CATEGORIES = ["Consumables", "Restorative", "Anesthetics", "Infection control", "Impression", "Endodontic", "Orthodontic", "Medicines", "Instruments", "Office"];
