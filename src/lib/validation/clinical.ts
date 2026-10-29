import { z } from "zod";
import { CHART_CONDITIONS, CHART_STATUSES, SURFACES } from "@/db/schema";
import { isValidTooth, parseTeeth } from "@/lib/teeth";
import { isoDate, optionalPesoAmount, optionalText, pesoAmount, requiredText } from "./common";

const teethField = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return [];
    const teeth = parseTeeth(v);
    if (!teeth) {
      ctx.addIssue({ code: "custom", message: "Use FDI tooth numbers, e.g. 16, 26 (11–48 adult, 51–85 child)" });
      return z.NEVER;
    }
    return teeth;
  });

export const treatmentSchema = z
  .object({
    patientId: z.string().min(1),
    workplaceId: z.string().min(1, "Choose a workplace"),
    date: isoDate,
    teeth: teethField,
    procedure: requiredText("Procedure", 160),
    fee: pesoAmount("Fee", { allowZero: true }),
    labFee: optionalPesoAmount("Lab fee"),
    notes: optionalText(2000),
  })
  .refine((t) => t.labFee <= t.fee || t.fee === 0, { message: "Lab fee can't be more than the fee", path: ["labFee"] });
export type TreatmentInput = z.infer<typeof treatmentSchema>;

const asArray = (v: unknown) => (v === undefined || v === "" ? [] : Array.isArray(v) ? v : [v]);

export const chartEntrySchema = z.object({
  patientId: z.string().min(1),
  tooth: z.coerce.number().int().refine(isValidTooth, "Not a valid FDI tooth number"),
  surfaces: z.preprocess(asArray, z.array(z.enum(SURFACES))),
  condition: z.enum(CHART_CONDITIONS, { message: "Choose a condition" }),
  status: z.enum(CHART_STATUSES).default("existing"),
  date: isoDate,
  notes: optionalText(500),
});
export type ChartEntryInput = z.infer<typeof chartEntrySchema>;
