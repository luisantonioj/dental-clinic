import { z } from "zod";
import { COLLECTORS, PAYMENT_METHODS } from "@/db/schema";
import { isoDate, optionalText, pesoAmount, requiredText } from "./common";

export const paymentSchema = z.object({
  patientId: z.string().min(1),
  workplaceId: z.string().min(1, "Choose a workplace"),
  date: isoDate,
  amount: pesoAmount("Amount"),
  method: z.enum(PAYMENT_METHODS, { message: "Choose how they paid" }),
  reference: optionalText(80),
  collectedBy: z.enum(COLLECTORS).default("me"),
  notes: optionalText(500),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const voidPaymentSchema = z.object({
  paymentId: z.string().min(1),
  reason: requiredText("Reason", 200),
});

export const METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  bank: "Bank transfer",
};
