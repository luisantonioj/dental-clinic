import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/db/schema";
import { isoDate, optionalIsoDate, optionalText, pesoAmount } from "./common";

export const payoutSchema = z.object({
  workplaceId: z.string().min(1, "Choose a workplace"),
  date: isoDate,
  periodStart: optionalIsoDate,
  periodEnd: optionalIsoDate,
  amount: pesoAmount("Amount"),
  notes: optionalText(300),
});
export type PayoutInput = z.infer<typeof payoutSchema>;

export const expenseSchema = z.object({
  workplaceId: z.string().min(1, "Choose a workplace"),
  date: isoDate,
  category: z.enum(EXPENSE_CATEGORIES, { message: "Choose a category" }),
  amount: pesoAmount("Amount"),
  notes: optionalText(300),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const EXPENSE_LABELS: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  supplies: "Supplies",
  lab: "Dental lab",
  rent: "Rent",
  utilities: "Utilities",
  equipment: "Equipment",
  salaries: "Staff",
  other: "Other",
};

export const monthParam = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .optional();
